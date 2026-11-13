import { setControlsOff } from "../ArtifactSetProfile";
import { Condition } from "../Condition";
import { ConditionDropdownTeamMember } from "../Condition/Dropdown/TeamMember";
import { FloatingSet, FloatingWeapon, VirtualCharacter } from "../Team/Legacy";
import { LEGACY_SET_ROWS, LEGACY_WEAPON_ROWS } from "./Floating";
import { LEGACY_PARTY_DATA } from "./PartyData";

// Renamed controls; all other names lose only their old party prefix.
const CONDITION_NAMES = {
    albedo_opening_of_hanerozoic_buffed: 'albedo_opening_of_hanerozoic_buff',
    chongyun_layered_frost: 'chongyun_frost_field',
    diona_cats_tail_1: 'diona_cats_tail_mastery',
    yoimiya_summer_scorch: 'yoimiya_summer_nights_dawn',
    yoimiya_summer_scorch_stack: 'yoimiya_summer_nights_dawn_stacks',
    shenhe_deific_embrace: 'shenhe_spirit_field',
    gorou_standing_firm: 'gorou_generals_war_banner',
    // The first part of Nahida's C2 (the reactions' CRIT) has no control:
    // it is her second constellation itself.
    nahida_the_root_of_all_fullness_2: 'nahida_the_root_of_all_fullness',
    // Her Nightsoul's Blessing kept the Geo sample active; all the samples
    // are xilonen_samplers.
    xilonen_blessing_state: 'common.nightsoul_blessing_state',
    citlali_heart_devourers_travail_2: 'citlali_heart_devourers_travail',
    traveler_pyro_starfires_flowing_light_2: 'traveler_pyro_starfires_flowing_light',
    aino_c6_burst: 'aino_the_burden_of_creative_genius',
    jahoda_sweet_berry_bounty: 'jahoda_a1_em_bonus',
    jahoda_the_littlest_luck: 'jahoda_c6_crit_bonus',
    // Iansan's C2 gives its ATK while her Precise Movement is on.
    iansan_laziness_is_the_enemy: 'iansan_enhanced_resistance_training',
    // The row's stacks were the party's; Odette's own are another count.
    odette_marvelous_splendor: 'odette_marvelous_splendor_others',
};

/**
 * States a released control took for granted, which are controls of the
 * character now: a control that is on brings them, by its old name. They
 * are the character's own states; what the team or the field must be for
 * an effect (a Polestar Field, Ascendant Gleam) is never set here.
 */
const IMPLIED = {
    nahida_compassion_illuminated: {nahida_illusory_heart: true},
    ifa_field_medics_vision: {'common.nightsoul_blessing_state': true},
    cyno_together_we_rise: {cyno_radiance_stellarconduct: true},
    cyno_homecoming_of_spirits_stellarconduct: {cyno_radiance_stellarconduct: true},
    columbina_c2_dominant_lunar: {columbina_lunar_brilliance: true},
    // Her C6 reached the party while it held Marvelous Splendor.
    odette_c6_splendor: {odette_all_party_marvelous_splendor: true},
};

/**
 * Released controls laid out differently now, by their old names:
 * (value, the row's controls) => the controls they become.
 */
const CONVERTED = {
    // Pyro has a switch of its own; the list holds the other elements.
    durin_c2_dmg_bonus: (value) => {
        const elements = String(value).split(';').filter((element) => element);
        const result = {};
        if (elements.includes('pyro')) result.durin_c2_pyro_bonus = true;
        const others = elements.filter((element) => element != 'pyro');
        if (others.length) result.durin_c2_dmg_bonus = others.join(';');
        return result;
    },
    // The healing mode applied only while the Elemental Mastery one was off.
    diona_cats_tail_2: (value, inputs) => inputs['party.diona_cats_tail_1'] ? {} : {diona_cats_tail: value},
    // Her fourth ascension passive, which the Abundance Amulet always has.
    traveler_resounding_roar: () => ({}),
};

/** A released typed stat (`partyStat`) as the stat kind an entry states (Team/Overrides). */
const PARTY_STATS = {
    atk_total: 'atk',
    hp_total: 'hp',
    def_total: 'def',
    mastery_total: 'mastery',
    mastery: 'mastery',
    atk_base: 'atk_base',
    crit_rate_total: 'crit_rate',
    recharge_total: 'recharge',
};

/** The custom buff a typed Ascendant Gleam bonus becomes, see loadAscendantGleam. */
const ASCENDANT_GLEAM_BUFF = 'buffs.ascendant_gleam_buff';

/**
 * Load a released build's Buffs tab into a new team's legacy source
 * (Team/Legacy), as it was: its party rows become virtual characters with
 * their typed stats, talent levels and controls, its weapon and set rows
 * floating entries. Nothing is invented: no builds, no values a row did not
 * hold. A slot import never calls this: it takes only characterBuild().
 *
 * The report keeps what has no place, with its original name and value.
 *
 * @param {Team} team the new team, with the old build in its first slot
 * @param {Object} legacy decoded format-1 context: {party, buffs, settings, dropped}
 * @returns {{characters: Array.<number>, items: number, dropped: Array.<Object>}}
 */
export function loadLegacyTeam(team, legacy) {
    const main = team.getMember(0);
    const dropped = legacy.dropped.map((item) => Object.assign({}, item));
    const characters = [];

    for (const row of legacy.party) {
        // A character is in a team once: the build's own character and a
        // repeated row have no place.
        if (row.charId == main.char.getId() || characters.includes(row.charId)) {
            dropped.push({charId: row.charId, settings: Object.assign({}, row.settings), reason: 'duplicate_member'});
            continue;
        }
        const entry = new VirtualCharacter(DB.Chars.getById(row.charId));
        loadCharacter(entry, row.settings, main, dropped);
        team.addLegacy(entry);
        characters.push(row.charId);
    }

    const buffs = Object.assign({}, legacy.buffs);
    let items = loadSets(team, buffs) + loadWeapons(team, buffs, main);

    team.modifySettings(legacy.settings);
    loadAscendantGleam(team, buffs, main);

    for (const [name, value] of Object.entries(buffs)) {
        dropped.push({name, value, reason: 'no_equivalent'});
    }
    return {characters, items, dropped};
}

/**
 * @param {VirtualCharacter} entry
 * @param {Object} inputs the party row's decoded controls, by their old names
 * @param {CalcSet} main the build's own character
 * @param {Array.<Object>} dropped the report, added to
 */
function loadCharacter(entry, inputs, main, dropped) {
    const char = entry.char.get();
    const conditions = Condition.unwrap(char.getAllConditions());
    const byName = new Map(conditions.filter((cond) => cond.getName() && cond.getId() && !cond.isRetired?.())
        .map((cond) => [cond.getName(), cond]));
    const definitions = new Map((LEGACY_PARTY_DATA[char.getId()] || [])
        .map(([, type, name, options]) => [name, Object.assign({type}, options)]));
    const levels = constellationLevels(char);
    const settings = {};
    const skills = {};
    let constellation = 0;

    for (const [name, value] of Object.entries(inputs)) {
        const definition = definitions.get(name) || {};
        if (definition.partySetting?.startsWith('char_skill_')) {
            const skill = definition.partySetting.slice('char_skill_'.length);
            skills[skill] = Math.max(1, Math.min(10, Number(value) || 1));
            continue;
        }
        // A typed stat is a stated stat. Nahida's typed party maximum is the
        // party's highest Elemental Mastery, so at least her own.
        const stat = name == 'party_max_mastery' ? 'mastery' : PARTY_STATS[definition.partyStat];
        if (stat) {
            entry.setStated(stat, Number(value) || 0);
            continue;
        }
        if (definition.partyStat) {
            dropped.push({charId: char.getId(), name, value, reason: 'typed_stat'});
            continue;
        }

        // A switched-on constellation effect means the character has that
        // constellation; a constellation switch means nothing else.
        if (value && definition.info?.constellation) {
            constellation = Math.max(constellation, definition.info.constellation);
        }
        if (/_constellation_\d$/.test(name)) continue;
        if (/_constellation$/.test(name) && definition.type == 'number') {
            constellation = Math.max(constellation, Math.min(6, Number(value) || 0));
            continue;
        }

        let target = name.replace(/^party[._]/, '');
        if (value) Object.assign(settings, IMPLIED[target]);
        if (CONVERTED[target]) {
            Object.assign(settings, CONVERTED[target](value, inputs));
            continue;
        }
        const radiance = /^(qiqi_herald_of_frost|diona_cats_tail)_radiance_(stellarconduct|stellarswirl)$/.exec(target);
        if (radiance) {
            const owner = target.startsWith('qiqi_') ? 'qiqi' : 'diona';
            settings[owner + '_radiance_' + radiance[2]] = value;
            settings[radiance[1] + '_radiance'] = value;
            continue;
        }
        target = CONDITION_NAMES[target] || target;
        const condition = byName.get(target);
        if (!condition || condition.getType() === 'static') {
            // An effect of a constellation that has no control of its own
            // any more is that constellation, set above.
            if (!definition.info?.constellation) {
                dropped.push({charId: char.getId(), name, value, reason: 'no_equivalent'});
            }
        } else if (target == 'sucrose_catalyst_conversion' && value === true) {
            // The old checkbox meant a Swirl matching the viewed member.
            const element = main.char.getElement();
            if (condition.params.values.some((item) => item.value == element)) {
                settings[target] = element;
            } else {
                dropped.push({charId: char.getId(), name, value, reason: 'no_equivalent'});
            }
        } else {
            settings[target] = value;
        }
    }

    // A control of a constellation that is on means the character has that
    // constellation, whatever the row's own switches said.
    for (const [name, value] of Object.entries(settings)) {
        if (value) constellation = Math.max(constellation, levels.get(name) || 0);
    }
    constellation = countsConstellation(entry, byName, settings, constellation);

    // A selected-recipient buff in an old party row described the main
    // character. Select that member for its corresponding new control.
    if (Object.keys(settings).length) {
        for (const condition of conditions) {
            if (condition instanceof ConditionDropdownTeamMember) {
                settings[condition.getName()] = main.char.getId();
            }
        }
    }
    entry.setConstellation(constellation);
    entry.setSkills(skills);
    entry.setSettings(settings);
}

/**
 * @param {DbObjectChar} char
 * @returns {Map.<string, number>} the constellation of each control that
 *     belongs to one, by its name
 */
function constellationLevels(char) {
    const levels = new Map();
    if (!char.constellation) return levels;
    // From the highest: a control keeps the lowest constellation it is in.
    for (let level = 6; level >= 1; --level) {
        for (const condition of Condition.unwrap(char.constellation.getConditions(level))) {
            if (condition.getName()) levels.set(condition.getName(), level);
        }
    }
    return levels;
}

/**
 * A typed count only a constellation allows means the character has it:
 * Furina's Fanfare above 300 is her C1. The row did not tie the two, and
 * the count would be cut to what the constellation allows.
 *
 * @param {VirtualCharacter} entry
 * @param {Map.<string, Condition>} byName the character's controls
 * @param {Object} settings the controls to set
 * @param {number} constellation what the row's controls mean
 * @returns {number} the lowest constellation, from that one, at which every
 *     count fits
 */
function countsConstellation(entry, byName, settings, constellation) {
    const fits = (condition, value, level) => {
        const context = Object.assign(entry.char.getSettings(), settings, {char_constellation: level});
        const limit = condition.getType() == 'stacks' ? condition.getMaxStacks(context) : condition.getMaxValue(context);
        return !(Number(limit) > 0) || value <= Number(limit);
    };
    for (const [name, value] of Object.entries(settings)) {
        const condition = byName.get(name);
        if (typeof value != 'number' || !condition || !['stacks', 'number'].includes(condition.getType())) continue;
        for (let level = constellation; level <= 6; ++level) {
            if (fits(condition, value, level)) {
                constellation = level;
                break;
            }
        }
    }
    return constellation;
}

/**
 * @param {Team} team
 * @param {Object} buffs the old tab's rows by name; the ones used are removed
 * @returns {number} entries added
 */
function loadSets(team, buffs) {
    const entries = new Map();
    for (const row of LEGACY_SET_ROWS) {
        if (!Object.prototype.hasOwnProperty.call(buffs, row.name)) continue;

        const value = buffs[row.name];
        delete buffs[row.name];
        if (!value || !row.control) continue;

        let entry = entries.get(row.set);
        if (!entry) {
            entry = {settings: setControlsOff(row.set), element: ''};
            entries.set(row.set, entry);
        }
        if (row.element) {
            // The buffed elements were the wearer's: one element is stated,
            // several are left to the wearer being taken to match.
            entry.settings[row.control] = true;
            const elements = String(value).split(';');
            if (elements.length == 1 && !entry.element) entry.element = elements[0];
        } else {
            entry.settings[row.control] = value;
        }
    }

    for (const [set, data] of entries) {
        const entry = team.addLegacy(new FloatingSet(set));
        entry.setSettings(data.settings);
        entry.setElement(data.element);
    }
    return entries.size;
}

/**
 * @param {Team} team
 * @param {Object} buffs the old tab's rows by name; the ones used are removed
 * @param {CalcSet} main the build's own character
 * @returns {number} entries added
 */
function loadWeapons(team, buffs, main) {
    let count = 0;
    const take = (name) => {
        const value = buffs[name];
        delete buffs[name];
        return value;
    };

    for (const row of LEGACY_WEAPON_ROWS) {
        const mode = row.mode ? take(row.mode.name) : undefined;
        for (let copy = 1; copy <= (row.copies || 1); ++copy) {
            const suffix = copy > 1 ? '_' + copy : '';
            const refine = Number(take(row.level + suffix)) || 0;
            const stated = Object.entries(row.stated || {}).map(([kind, name]) => [kind, take(name + suffix)]);
            if (!refine) continue;

            const weapon = DB.Weapons.get(row.type).get(row.weapon);
            const entry = team.addLegacy(new FloatingWeapon(weapon, Math.min(refine, weapon.getMaxRefinement())));
            const settings = Object.assign({}, row.on, row.mode ? row.mode.values[mode] : null);
            if (row.receiver) settings[row.receiver] = main.char.getId();
            entry.setSettings(settings);
            for (const [kind, value] of stated) {
                if (value !== undefined) entry.setStated(kind, Number(value) || 0);
            }
            ++count;
        }
    }
    return count;
}

/**
 * The released typed Ascendant Gleam bonus (Lunar Reaction DMG from a
 * non-Moonsign character) applied while the party was at Ascendant Gleam. It
 * named no character, so it becomes the build's custom Lunar Reaction DMG
 * bonus: the same number, on the member it was typed for.
 *
 * @param {Team} team with its virtual characters loaded
 * @param {Object} buffs the old tab's rows by name; the one used is removed
 * @param {CalcSet} main
 */
function loadAscendantGleam(team, buffs, main) {
    const value = Number(buffs[ASCENDANT_GLEAM_BUFF]) || 0;
    if (!value || team.evaluate().state.countOrigin('nodkrai') < 2) return;

    delete buffs[ASCENDANT_GLEAM_BUFF];
    const current = Number(main.buffs.getSettings()['custom_buffs.dmg_reaction_lunar']) || 0;
    main.modifyBuffsSettings({'custom_buffs.dmg_reaction_lunar': current + value});
}
