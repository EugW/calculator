import { CalcSet } from "../src/js/classes/CalcSet";
import { durinWhiteFlame } from "../src/js/db/Char/Durin";
import { laumaAscendantGleam } from "../src/js/db/Char/Lauma";
import { valeriyPolestarField } from "../src/js/db/Char/Valeriy";
import { Stats } from "../src/js/classes/Stats";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import {
    buildAllOnSettings,
    compareScenario,
    computeScenarioResults,
    ensureTestGlobals,
    getCharKeys,
    getFixedEnemy,
    getFixedWeaponForChar,
    getWeaponKey,
    loadRecorded,
    makeBaseBuild,
    saveRecorded,
} from "./support/baseline";
import { matchCarrierTotals } from "./support/teamConversion";
import { premodReadSpies, totalReaders } from "./support/buffChains";

ensureTestGlobals();

const FILE = "solo.json";
const RECORD = process.env.RECORD_BASELINE === "1";

function buildDefinitions() {
    const result = [];
    for (const charKey of getCharKeys()) {
        for (const constellation of [0, 6]) {
            const id = charKey + "_c" + constellation;
            result.push({id, charKey, constellation});
        }
    }
    return result;
}

function makeScenario(def) {
    const build = makeBaseBuild(def.charKey, def.constellation);
    const baseSettings = build.getSettings();
    const charConditions = build.getConditions({objects: ["char"]});
    const charSettings = buildAllOnSettings(charConditions, baseSettings);
    // The old all-on Diona C6 scenario selected healing and therefore had no
    // EM bonus. Reproduce that recorded assumption with the new independent
    // control; all four combinations are covered in teamCharacterDelivery.
    if (def.charKey === 'Diona' && def.constellation === 6) {
        charSettings.diona_cats_tail_mastery = false;
    }
    // The recorded solo model included only the burst-triggered A4 buff.
    // C2 now has its own lasting-effect control, tested in the delivery suite.
    if (def.charKey === 'Albedo') {
        charSettings.albedo_opening_of_hanerozoic_buff = false;
    }
    // The old solo chili-pepper scenario meant Xiangling picked it up herself.
    if (def.charKey === 'Xiangling') {
        charSettings.xiangling_beware_receiver = String(build.char.getId());
    }
    // Likewise the Traveler picked up their own Abundance Amulet.
    if (def.charKey === 'TravelerElectro') {
        charSettings.traveler_abundance_amulet_receiver = String(build.char.getId());
    }
    // Durin's C1 party toggle and C2 element dropdown did not exist in the
    // recorded solo model (C2 was Pyro only); both are tested in
    // teamCharsBatch4cDelivery.
    // Illuga's C4 DEF toggle is new: the old model had C4 only for teammates.
    if (def.charKey === 'Illuga') {
        charSettings.illuga_c4_def = false;
    }
    if (def.charKey === 'Durin') {
        charSettings.durin_c1_cycle_party = false;
        charSettings.durin_c2_dmg_bonus = false;
    }
    build.setCharSettings(charSettings);
    // Nahida's A1 reads the team's highest Elemental Mastery; the recording
    // typed it in as 1000 (party_max_mastery). A teammate that holds it and
    // delivers nothing stands in for that input: Noelle (Geo, so Nahida's
    // Pyro/Electro/Hydro count is unchanged).
    if (def.charKey === 'Nahida') {
        const standIn = makeBaseBuild('Noelle', 0);
        Team.fromMember(build).setMember(1, standIn);
        matchCarrierTotals(standIn, {mastery_total: 1000});
    }
    const weaponSettingsBase = build.getSettings();
    const weaponConditions = build.getConditions({objects: ["weapon"]});
    const weaponSettings = buildAllOnSettings(weaponConditions, weaponSettingsBase);
    build.setWeaponSettings(weaponSettings);
    const weapon = getFixedWeaponForChar(def.charKey);
    const enemy = getFixedEnemy();
    const inputs = {
        char: def.charKey,
        constellation: def.constellation,
        charLevels: {level: 90, ascension: 6, constellation: def.constellation},
        talents: {attack: 10, elemental: 10, burst: 10},
        weapon: getWeaponKey(weapon),
        weaponType: DB.Chars.get(def.charKey).weapon,
        weaponLevels: {level: 90, ascension: 6, refine: 1},
        enemy: enemy.name,
        enemyLevel: 90,
        party: [],
        charSettings,
        weaponSettings,
    };
    return {build, inputs};
}

const definitions = buildDefinitions();

/**
 * Nicole's own Grace of Kenosis and her Pathfinder's Blessing row read a stat
 * that does not exist ('atk_total'), so the old engine recorded both as 0.
 * They now read her total ATK (teamNicoleDelivery.test.js checks the values).
 * The rest of her scenarios must still match the recording: the Grace
 * post-effect is left out, and the two rows are compared with values
 * computed from the recorded stats.
 */
function recordedBugFix(def, recordedScenario) {
    // Iansan's burst ATK bonus existed only as a display row and never
    // reached her own stats; the text boosts "the ATK of your current active
    // party member", Iansan included. Checked in teamCharsBatch4bReview.
    if (def.charKey === 'Iansan') {
        const post = DB.Chars.get('Iansan').getPostEffects().filter((effect) => effect.params.stacksSetting === 'iansan_points');
        expect(post.length).toBe(1);
        return {excludePostEffects: post, rows: {}};
    }
    // Illuga's Lightkeeper's Oath goes to "other nearby party members"; the
    // old model also gave it to Illuga. The recording is reproduced by
    // adding those recorded stats back as a bonus (A1: 5% CRIT Rate, 10%
    // CRIT DMG and 50 EM; C6: 10%, 30% and 80). Checked in
    // teamCharsBatch5aReview.
    if (def.charKey === 'Illuga') {
        const bonus = def.constellation >= 6
            ? {crit_rate_geo: 10, crit_dmg_geo: 30, mastery: 80}
            : {crit_rate_geo: 5, crit_dmg_geo: 10, mastery: 50};
        return {bonus: new Stats(bonus), rows: {}};
    }
    if (def.charKey !== 'Nicole') {
        return null;
    }

    const nicole = DB.Chars.get('Nicole');
    const grace = nicole.getPostEffects().filter((effect) => effect.params.levelSetting === 'char_skill_elemental');
    expect(grace.length).toBe(1);

    const stats = recordedScenario.stats;
    const atkTotal = stats.atk_base * (1 + stats.atk_percent) + stats.atk;
    const level = 10 + (def.constellation >= 3 ? 3 : 0);
    const ratio = nicole.talents.get('skill.nicole_grace_of_kenosis_atk_bonus_ratio').getValue(level) / 100;
    const cap = nicole.talents.get('skill.nicole_grace_of_kenosis_max_atk_bonus').getValue(level);
    const rows = {'other.nicole_grace_atk_bonus': Math.min(ratio * atkTotal, cap)};
    if (def.constellation >= 4) {
        rows['other.nicole_pathfinder_blessing'] = 0.7 * atkTotal;
    }
    return {excludePostEffects: grace, rows};
}

/**
 * Gates the old model did not have: forced open to reproduce the recording.
 * The gates themselves are checked in the characters' delivery tests.
 */
/**
 * Stats of a scenario with a stand-in teammate that are not compared: the
 * retired typed-in input the teammate replaces, and the teammate's Burst
 * Energy cost that the old party path still adds (party_burst_energy_cost).
 */
const STAND_IN_IGNORED = {
    Nahida: ['party_max_mastery', 'party_burst_energy_cost'],
};

/**
 * Effects whose total read the recording predates (md/buff_chains.md): the
 * solo scenario reads them premod, as recorded; the characters' buffChains
 * tests check the total read.
 */
const RECORDED_PREMOD_READS = {
    // Mizuki's Swirl bonuses read her total EM (Avatar_Mizuki_MasteryToSwirhurt),
    // Vast's own share included.
    Mizuki: () => totalReaders('Mizuki', ['dmg_reaction_swirl', 'dmg_stellarswirl']),
};

const OPEN_CONDITIONS = {
    // Lauma's C2 and C6 party bonuses need Ascendant Gleam.
    Lauma: () => [laumaAscendantGleam],
    // Durin's A1 RES shred needs the White Flame (Purity) form; the recorded
    // scenario is in Darkness mode, and the old model applied it anyway.
    Durin: () => [durinWhiteFlame],
    // Valeriy's Radiance: Stellar-Conduct state needs a Polestar Field; the
    // recorded scenario has the state on without one.
    Valeriy: () => [valeriyPolestarField],
};

/**
 * Recorded numbers the game data corrects (md/buff_chains.md): each from the
 * recorded stats and the game formula, never from this engine.
 */
const CORRECTIONS = {
    // Furina's C2 HP is non-extra in the game (UNIQUE_Furina_Constellation_6_Buff,
    // her gameplay C2, writes Actor_MaxHPRatio), so her A4 counts it: 0.0007%
    // per point of the recorded total HP, hp_base × (1 + hp_percent), capped
    // at 28%. The Salon hits scale by (1 + dmg_all + new) / (1 + dmg_all + old).
    Furina_c6: (expected) => {
        const stats = expected.stats;
        const a4 = Math.min(0.28, 0.000007 * stats.hp_base * (1 + stats.hp_percent));
        const factor = (1 + stats.dmg_all + a4) / (1 + stats.dmg_all + stats.dmg_skill_furina);
        return corrected(expected, {dmg_skill_furina: a4}, [
            'skill.furina_gentilhomme_usher_dmg',
            'skill.furina_mademoiselle_crabaletta_dmg',
            'skill.furina_surintendante_chevalmarin_dmg',
        ], factor);
    },
};

/**
 * Durin's A4 is "3% of the original DMG for every 100 ATK", at most 75%; the
 * old model gave 3% per point of ATK, so every recording sat at the cap. The
 * special multiplier scales the Dark Decay talent part only, not C1's flat
 * 150% ATK: a hit is (talent × (1 + A4) + flat) × the rest, with the talent
 * ratio at the recorded burst level (10, 13 with the C3/C5 bonus).
 */
function durinA4Correction(constellation) {
    return (expected) => {
        const stats = expected.stats;
        const atk = stats.atk_base * (1 + (stats.atk_percent || 0)) + (stats.atk || 0);
        const a4 = Math.min(0.75, 0.0003 * atk);
        const talent = DB.Chars.get('Durin').talents.get('burst.durin_dark_decay_dmg').getValue(constellation >= 6 ? 13 : 10) / 100;
        const flat = constellation >= 1 ? 1.5 : 0;
        const factor = ((1 + a4) * talent + flat) / ((1 + stats.dmg_burst_periodic_special) * talent + flat);
        return corrected(expected, {dmg_burst_periodic_special: a4}, ['burst.durin_dark_decay_dmg'], factor);
    };
}
CORRECTIONS.Durin_c0 = durinA4Correction(0);
CORRECTIONS.Durin_c6 = durinA4Correction(6);

/**
 * Xinyan's C6 ATK is 50% of her DEF ("an ATK Bonus equal to 50% of her DEF";
 * talent Xinyan_Constellation_6 paramList [-0.3, 0.5]); the old table used the
 * 30% stamina number. From the recorded premod DEF, def_base × (1 + def_percent);
 * her ATK-scaled hits scale with total ATK, her DEF-scaled shields do not.
 */
CORRECTIONS.Xinyan_c6 = (expected) => {
    const stats = expected.stats;
    const def = stats.def_base * (1 + stats.def_percent);
    const atkOld = stats.atk_base * (1 + stats.atk_percent) + stats.atk;
    const atk = stats.atk + 0.2 * def;
    const factor = (atkOld + 0.2 * def) / atkOld;
    return corrected(expected, {atk}, [
        'attack.charged_final', 'attack.charged_spin',
        'attack.normal_hit_1', 'attack.normal_hit_2', 'attack.normal_hit_3', 'attack.normal_hit_4',
        'attack.plunge', 'attack.plunge_high', 'attack.plunge_low',
        'burst.burst_dmg', 'burst.dot_dmg', 'skill.dot_dmg', 'skill.swing_dmg', 'stats.atk',
    ], factor);
};

/**
 * Chasca's C2: "When Chasca takes the field, she will obtain 1 stack of
 * 'Spirit of the Radiant Shadow' from the Ascension Talent 'Bullet Trick'",
 * and one stack is 15% DMG of Shining Shadowhunt Shells. The old model counted
 * only the party's elements, so the solo recording has no stack. The converted
 * shells scale by (1 + DMG bonus + 15%) / (1 + DMG bonus), with the recorded
 * DMG bonus (dmg_all, from Alley Hunter).
 */
CORRECTIONS.Chasca_c6 = (expected) => {
    const stack = 0.15;
    const factor = (1 + expected.stats.dmg_all + stack) / (1 + expected.stats.dmg_all);
    return corrected(expected, {dmg_charged_elem_chasca: stack}, ['cryo', 'electro', 'hydro', 'pyro'].map(
        (element) => 'skill.chasca_shining_shadowhunt_shell_' + element + '_dmg',
    ), factor);
};

/**
 * Kaveh's C3: "Increases the Level of Painted Dome by 3", and the burst's
 * Dendro Core bonus is the one of its level: 58.41% at level 13. The old
 * model read level 10 (49.48%), because the bonus comes before the
 * constellation in his conditions and one pass in order cannot see it
 * (md/team.md, "A source nobody delivers to"). Rupture scales by
 * (1 + EM bonus + bonus) / (1 + EM bonus + recorded bonus), with the reaction's
 * EM bonus 16 × EM / (EM + 2000) from the recorded Elemental Mastery.
 */
CORRECTIONS.Kaveh_c6 = (expected) => {
    const stats = expected.stats;
    const table = DB.Chars.get('Kaveh').talents.get('burst.kaveh_bloom_dmg_bonus');
    const bonus = stats.dmg_reaction_rupture + (table.getValue(13) - table.getValue(10)) / 100;
    const mastery = stats.mastery_base + stats.mastery;
    const base = 1 + 16 * mastery / (mastery + 2000);
    return corrected(expected, {dmg_reaction_rupture: bonus}, ['reaction.rupture'],
        (base + bonus) / (base + stats.dmg_reaction_rupture));
};

/**
 * Sigewinne's C6: "Every 1,000 Max HP she has will increase CRIT Rate by 0.4%
 * and CRIT DMG by 2.2% ... maximum ... 20% CRIT Rate and 110% CRIT DMG"; the
 * old tables were 100 times too large, so every recording sat at the caps.
 * The bonus is "the CRIT Rate and CRIT DMG of Super Saturated Syringing" (her
 * burst; the game applies it as a hit bonus), while the old model added it to
 * her general CRIT. From the recorded HP and base CRIT: the burst hit keeps
 * the bonus at its real size, every other hit loses it; crit values scale by
 * (1 + CRIT DMG) and averages by (1 + CRIT Rate × CRIT DMG); non-crit values
 * do not change.
 */
CORRECTIONS.Sigewinne_c6 = (expected) => {
    const stats = expected.stats;
    const hp = stats.hp_base * (1 + stats.hp_percent) + (stats.hp || 0);
    const rate = Math.min(0.2, 0.004 * hp / 1000);
    const dmg = Math.min(1.1, 0.022 * hp / 1000);
    const oldRate = stats.crit_rate_base + stats.crit_rate;
    const oldDmg = stats.crit_dmg_base + stats.crit_dmg;
    // The recorded general CRIT was the old bonus at its caps and nothing else.
    expect(stats.crit_rate).toBeCloseTo(0.2, 10);
    expect(stats.crit_dmg).toBeCloseTo(1.1, 10);
    const result = corrected(expected, {crit_rate_burst: rate, crit_dmg_burst: dmg}, [], 1);
    // Stats at zero are not listed.
    delete result.stats.crit_rate;
    delete result.stats.crit_dmg;
    for (const [name, feature] of Object.entries(result.features)) {
        if (name === 'stats.crit_rate' || name === 'stats.crit_dmg') {
            const value = (name === 'stats.crit_rate' ? stats.crit_rate_base : stats.crit_dmg_base) * 100;
            result.features[name] = {normal: value, crit: value, average: value};
        } else if (feature.crit > feature.normal) {
            const burst = name === 'burst.burst_dmg';
            const newRate = stats.crit_rate_base + (burst ? rate : 0);
            const newDmg = stats.crit_dmg_base + (burst ? dmg : 0);
            result.features[name] = {
                normal: feature.normal,
                crit: feature.crit * (1 + newDmg) / (1 + oldDmg),
                average: feature.average * (1 + Math.min(1, newRate) * newDmg) / (1 + Math.min(1, oldRate) * oldDmg),
            };
        }
    }
    return result;
};

/**
 * Mona's C4 CRIT Rate is against the opponent affected by an Omen (the game
 * lowers its CRIT resistance), not her own stat: the recorded 15% moves from
 * crit_rate to crit_rate_enemy and leaves the CRIT Rate row. Hits read both.
 */
CORRECTIONS.Mona_c6 = (expected) => {
    expect(expected.stats.crit_rate).toBeCloseTo(0.15, 10);
    const result = corrected(expected, {crit_rate_enemy: 0.15}, [], 1);
    // Stats at zero are not listed.
    delete result.stats.crit_rate;
    const shown = expected.features['stats.crit_rate'].normal - 15;
    result.features['stats.crit_rate'] = {normal: shown, crit: shown, average: shown};
    return result;
};

function corrected(expected, stats, features, factor) {
    const result = Object.assign({}, expected, {
        stats: Object.assign({}, expected.stats, stats),
        features: Object.assign({}, expected.features),
    });
    for (const name of features) {
        expect(result.features[name]).toBeDefined();
        result.features[name] = Object.fromEntries(Object.entries(result.features[name]).map(([field, value]) => [field, value * factor]));
    }
    return result;
}

function checkFixedRows(fix, actual, expected) {
    for (const [name, value] of Object.entries(fix.rows)) {
        expect(expected.features[name]).toEqual({normal: 0, crit: 0, average: 0});
        for (const field of ['normal', 'crit', 'average']) {
            expect(actual.features[name][field]).toBeCloseTo(value, 6);
        }
        delete actual.features[name];
    }
    return Object.assign({}, expected, {
        features: Object.fromEntries(Object.entries(expected.features).filter(([name]) => !(name in fix.rows))),
    });
}

if (RECORD) {
    const data = {scenarios: {}};
    for (const def of definitions) {
        let entry;
        try {
            const {build, inputs} = makeScenario(def);
            const results = computeScenarioResults(build);
            entry = Object.assign({inputs}, results);
        } catch (error) {
            const {inputs} = (() => {
                try {
                    return makeScenario(def);
                } catch {
                    return {inputs: {char: def.charKey, constellation: def.constellation}};
                }
            })();
            entry = {inputs, error: String((error && error.message) || error)};
        }
        data.scenarios[def.id] = entry;
    }
    saveRecorded(FILE, data);
}

const recorded = RECORD ? loadRecorded(FILE) : loadRecorded(FILE);

if (!recorded) {
    test("baseline file missing", () => {
        throw new Error("Missing test/baseline/" + FILE + " (kept out of git). It must be recorded by the engine " +
            "before the team refactor: add a git worktree at commit 54e1d63, copy test/support/baseline.js and " +
            "test/teamBaseline*.test.js into it, run them there with RECORD_BASELINE=1 and copy test/baseline/ back.");
    });
} else {
    test.each(definitions.map((def) => [def.id]))("solo %s", (id) => {
        const def = definitions.find((item) => item.id === id);
        let expected = recorded.scenarios[id];
        expect(expected).toBeDefined();
        if (CORRECTIONS[id]) {
            expected = CORRECTIONS[id](expected);
        }
        const fix = recordedBugFix(def, expected);
        const open = OPEN_CONDITIONS[def.charKey] ? OPEN_CONDITIONS[def.charKey]() : [];
        const spies = open.map((cond) => jest.spyOn(cond, 'isActive').mockReturnValue(true));
        spies.push(...premodReadSpies(RECORDED_PREMOD_READS[def.charKey] ? RECORDED_PREMOD_READS[def.charKey]() : []));
        let actual;
        try {
            const {build, inputs} = makeScenario(def);
            const results = computeScenarioResults(build, fix || {});
            // A stand-in teammate's stats (prefixed with its slot) are not
            // part of the recorded solo character.
            for (const key of Object.keys(results.stats)) {
                if (/^m\d+__/.test(key) || (STAND_IN_IGNORED[def.charKey] || []).includes(key)) delete results.stats[key];
            }
            actual = Object.assign({inputs}, results);
        } catch (error) {
            actual = {error: String((error && error.message) || error)};
        } finally {
            spies.forEach((spy) => spy.mockRestore());
        }
        if (fix && !actual.error) {
            expected = checkFixedRows(fix, actual, expected);
        }
        if (STAND_IN_IGNORED[def.charKey] && expected.stats) {
            const stats = Object.assign({}, expected.stats);
            STAND_IN_IGNORED[def.charKey].forEach((key) => delete stats[key]);
            expected = Object.assign({}, expected, {stats});
        }
        const mismatches = compareScenario(id, actual, expected);
        expect(mismatches).toEqual([]);
    });
}
