import { Team } from "../src/js/classes/Team";
import { ConditionDropdownTeamMember } from "../src/js/classes/Condition/Dropdown/TeamMember";
import { FeatureDamageStellarConduct } from "../src/js/classes/Feature2/Damage/StellarConduct";
import { FeatureDamageStellarSwirl } from "../src/js/classes/Feature2/Damage/StellarSwirl";
import { FeatureMultiplier } from "../src/js/classes/Feature2/Multiplier";
import { StatTable } from "../src/js/classes/StatTable";
import { DB } from "../src/js/db/DB";
import { featureValues, finalStats, makeBuild, enemyChange } from "./support/team";

global.DB = DB;

test("Sucrose shares live Mastery with others, excluding herself and mismatched elements", () => {
    const sucrose = makeBuild('Sucrose');
    sucrose.modifyBuffsSettings({'custom_buffs.mastery': 800});
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(sucrose);
    team.setMember(1, hutao);
    const hutaoBase = finalStats(hutao).get('mastery');
    const sucroseBase = finalStats(sucrose).get('mastery');
    sucrose.setCharSettings({sucrose_catalyst_conversion: 'pyro', sucrose_mollis_favonius: true});
    const sourceMastery = finalStats(sucrose).get('mastery_base') + finalStats(sucrose).get('mastery');
    expect(sourceMastery).toBeGreaterThan(700);
    // Pyro receiver: 50 flat + 20% of Sucrose's live total Mastery.
    expect(finalStats(hutao).get('mastery') - hutaoBase).toBeCloseTo(50 + sourceMastery * 0.2, 10);
    // Sucrose herself receives neither part.
    expect(finalStats(sucrose).get('mastery')).toBeCloseTo(sucroseBase, 10);

    const sucrose2 = makeBuild('Sucrose');
    sucrose2.modifyBuffsSettings({'custom_buffs.mastery': 800});
    sucrose2.setCharSettings({sucrose_catalyst_conversion: 'pyro', sucrose_mollis_favonius: true});
    const dendroTeam = Team.fromMember(sucrose2);
    const dendro = makeBuild('Alhaitham');
    dendroTeam.setMember(1, dendro);
    const dendroBase = Team.solo(makeBuild('Alhaitham'));
    // Dendro is outside Catalyst Conversion's elements: Mollis Favonius only.
    expect(finalStats(dendro).get('mastery') - finalStats(dendroBase).get('mastery')).toBeCloseTo(sourceMastery * 0.2, 10);

    // Raising her Mastery raises the shared bonus.
    sucrose2.modifyBuffsSettings({'custom_buffs.mastery': 1000});
    const grown = finalStats(sucrose2).get('mastery_base') + finalStats(sucrose2).get('mastery');
    expect(finalStats(dendro).get('mastery') - finalStats(dendroBase).get('mastery')).toBeCloseTo(grown * 0.2, 10);
});

test("Sucrose's Mollis Favonius requires A4 while Catalyst Conversion works at A1", () => {
    const sucrose = makeBuild('Sucrose');
    sucrose.setCharLevels({level: 60, ascension: 2, constellation: 6});
    sucrose.setCharSettings({sucrose_catalyst_conversion: 'pyro', sucrose_mollis_favonius: true});
    const receiver = makeBuild('Hutao');
    const team = Team.fromMember(sucrose);
    team.setMember(1, receiver);
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(50, 10);
    sucrose.setCharLevels({level: 90, ascension: 6, constellation: 6});
    sucrose.modifyBuffsSettings({'custom_buffs.mastery': 800});
    const sourceMastery = finalStats(sucrose).get('mastery_base') + finalStats(sucrose).get('mastery');
    expect(finalStats(receiver).get('mastery')).toBeCloseTo(50 + sourceMastery * 0.2, 10);
});

test("Sucrose's team delivery survives save/load with an off-field source", () => {
    const sucrose = makeBuild('Sucrose');
    sucrose.setCharSettings({sucrose_catalyst_conversion: 'pyro', sucrose_mollis_favonius: true});
    const receiver = makeBuild('Hutao');
    const team = Team.fromMember(receiver);
    team.setMember(1, sucrose);
    team.setOnFieldMember(receiver);
    const before = finalStats(receiver).get('mastery');
    expect(before).toBeGreaterThan(0);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('mastery')).toBeCloseTo(before, 10);
});

test("Venti's C6 CRIT DMG stays his own while the shred is shared", () => {
    const venti = makeBuild('Venti');
    venti.setCharLevels({level: 90, ascension: 6, constellation: 6});
    venti.setCharSettings({venti_storm: true, venti_storm_element: 'pyro', venti_witch_homework: true});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(venti);
    team.setMember(1, receiver);
    const stats = finalStats(receiver);
    expect(enemyChange(receiver, 'enemy_res_anemo', stats)).toBeCloseTo(-0.2, 10);
    expect(enemyChange(receiver, 'enemy_res_pyro', stats)).toBeCloseTo(-0.2, 10);
    expect(stats.get('crit_dmg')).toBe(0);
    expect(finalStats(venti).get('crit_dmg')).toBeCloseTo(1, 10);
});

test("Qiqi's Radiance Conduct wins over Swirl and heals the team", () => {
    const qiqi = makeBuild('Qiqi');
    qiqi.setCharSettings({
        qiqi_life_prolonging_methods: true,
        qiqi_radiance_stellarconduct: true,
        qiqi_herald_of_frost_radiance: true,
        qiqi_radiance_stellarswirl: true,
    });
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(qiqi);
    team.setMember(1, receiver);
    const stats = finalStats(receiver);
    expect(stats.get('dmg_stellarconduct')).toBeCloseTo(0.5, 10);
    expect(stats.get('dmg_stellarswirl')).toBe(0);
    expect(stats.get('healing_recv')).toBeCloseTo(0.2, 10);
    // The team-wide healing bonus includes Qiqi herself.
    expect(finalStats(qiqi).get('healing_recv')).toBeCloseTo(0.2, 10);
});

test("Qiqi's source toggles survive save/load while she is off-field", () => {
    const qiqi = makeBuild('Qiqi');
    qiqi.setCharSettings({qiqi_life_prolonging_methods: true});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, qiqi);
    team.setOnFieldMember(receiver);
    expect(finalStats(receiver).get('healing_recv')).toBeCloseTo(0.2, 10);
    const copy = Team.deserialize(team.serialize());
    expect(copy).not.toBeNull();
    expect(finalStats(copy.getMember(0)).get('healing_recv')).toBeCloseTo(0.2, 10);
});

test("YunJin's Normal DMG bonus scales with her live DEF and needs the flag", () => {
    const yunjin = makeBuild('YunJin');
    yunjin.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(yunjin);
    team.setMember(1, receiver);
    yunjin.setCharSettings({yunjin_flag: true, yunjin_myriad: true});
    const withFlag = finalStats(receiver);
    expect(withFlag.get('dmg_normal')).toBeCloseTo(0.15, 10);
    expect(withFlag.get('atk_speed_normal')).toBeCloseTo(0.12, 10);
    yunjin.setCharSettings({yunjin_flag: false, yunjin_myriad: true});
    expect(finalStats(receiver).get('atk_speed_normal')).toBe(0);
    const hit = () => featureValues(receiver)['attack.normal_hit_1'][0];
    const unbuffed = hit();
    yunjin.setCharSettings({yunjin_flag: true, yunjin_myriad: true});
    const initialBonus = hit() - unbuffed;
    const stats = finalStats(yunjin);
    const baseDef = stats.get('def_base') + stats.get('def');
    yunjin.modifyBuffsSettings({'custom_buffs.def': 5000});
    expect((hit() - unbuffed) / initialBonus).toBeCloseTo((baseDef + 5000) / baseDef, 8);
    const highTalent = hit();
    yunjin.setCharSkills({attack: 10, elemental: 10, burst: 1});
    expect(hit()).toBeLessThan(highTalent);
});

test("YunJin's C2 bonus stays locked before C2", () => {
    const yunjin = makeBuild('YunJin');
    yunjin.setCharLevels({level: 90, ascension: 6, constellation: 0});
    yunjin.setCharSettings({yunjin_flag: true, yunjin_myriad: true});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(yunjin);
    team.setMember(1, receiver);
    expect(finalStats(receiver).get('dmg_normal')).toBe(0);
});

test("Zhongli's shield strength stacks and his shred covers the team", () => {
    const zhongli = makeBuild('Zhongli');
    zhongli.setCharSettings({zhongli_jade_shield: true, zhongli_resonant_waves: 5});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(zhongli);
    team.setMember(1, receiver);
    const stats = finalStats(receiver);
    expect(stats.get('shield')).toBeCloseTo(0.25, 10);
    expect(enemyChange(receiver, 'enemy_res_pyro', stats)).toBeCloseTo(-0.2, 10);
    zhongli.setCharSettings({zhongli_jade_shield: true, zhongli_resonant_waves: 0});
    expect(finalStats(receiver).get('shield')).toBe(0);
    expect(enemyChange(receiver, 'enemy_res_pyro')).toBeCloseTo(-0.2, 10);
});

test("Razor's Bite shreds DEF for the team including himself", () => {
    const razor = makeBuild('Razor');
    razor.setCharLevels({level: 90, ascension: 6, constellation: 4});
    razor.setCharSettings({razor_bite: true});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(razor);
    team.setMember(1, receiver);
    expect(enemyChange(receiver, 'enemy_def_reduce')).toBeCloseTo(0.15, 10);
    expect(enemyChange(razor, 'enemy_def_reduce')).toBeCloseTo(0.15, 10);
    razor.setCharSettings({razor_bite: false});
    expect(enemyChange(receiver, 'enemy_def_reduce')).toBe(0);
});

test("Xiangling's chili targets one member while Pyronado and Xinyan buffs reach the team", () => {
    const xiangling = makeBuild('Xiangling');
    xiangling.setCharLevels({level: 90, ascension: 6, constellation: 6});
    xiangling.setCharSettings({xiangling_beware: true, xiangling_condensed_pyronado: true});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(xiangling);
    team.setMember(1, receiver);
    xiangling.setCharSettings({xiangling_beware: true, xiangling_beware_receiver: String(receiver.char.getId()), xiangling_condensed_pyronado: true});
    expect(finalStats(receiver).get('atk_percent')).toBeCloseTo(0.1, 10);
    expect(finalStats(receiver).get('dmg_pyro')).toBeCloseTo(0.15, 10);
    expect(finalStats(xiangling).get('atk_percent')).toBe(0);
    expect(finalStats(xiangling).get('dmg_pyro')).toBeCloseTo(0.15, 10);

    const xinyan = makeBuild('Xinyan');
    xinyan.setCharLevels({level: 90, ascension: 6, constellation: 4});
    xinyan.setCharSettings({xinyan_now_thats_rock: true, xinyan_wildfire_rhythm: true});
    const team2 = Team.fromMember(xinyan);
    const receiver2 = makeBuild('Ayaka');
    team2.setMember(1, receiver2);
    expect(finalStats(receiver2).get('dmg_phys')).toBeCloseTo(0.15, 10);
    expect(enemyChange(receiver2, 'enemy_res_phys')).toBeCloseTo(-0.15, 10);
});

test.each([
    ['Xiangling', 'xiangling_beware', 'atk_percent', 0.1],
    ['Venti', 'venti_secret_rite_4s', 'dmg_all', 0.5],
])('%s saves one explicit recipient, including self and an off-field member', (key, toggle, stat, bonus) => {
    const source = makeBuild(key);
    const target = makeBuild('Ayaka');
    const helper = makeBuild('Klee');
    const team = Team.fromMember(helper);
    team.setMember(1, source);
    team.setMember(2, target);
    helper.setCharSettings({klee_witch_homework: true});
    const base = {venti_witch_homework: true, [toggle]: true};
    source.setCharSettings(base);
    const baseline = [source, target, helper].map(member => finalStats(member).get(stat));
    const selector = toggle + '_receiver';
    const control = source.char.getConditions().find(item => item instanceof ConditionDropdownTeamMember);
    expect(control.getDropdownItems(source.getBuildData().settings).map(item => Number(item.value)))
        .toContain(source.char.getId());
    source.setCharSettings({...base, [selector]: target.char.getId()});
    expect(finalStats(source).get(stat)).toBe(baseline[0]);
    expect(finalStats(target).get(stat) - baseline[1]).toBeCloseTo(bonus, 10);
    expect(finalStats(helper).get(stat)).toBe(baseline[2]);
    team.setOnFieldMember(source);
    expect(finalStats(target).get(stat) - baseline[1]).toBeCloseTo(bonus, 10);
    team.setOnFieldMember(helper);
    const copy = Team.deserialize(team.serialize());
    expect(finalStats(copy.getMember(2)).get(stat) - baseline[1]).toBeCloseTo(bonus, 10);
    team.swapMembers(1, 2);
    expect(finalStats(target).get(stat) - baseline[1]).toBeCloseTo(bonus, 10);
    source.setCharSettings({...base, [selector]: source.char.getId()});
    expect(finalStats(source).get(stat) - baseline[0]).toBeCloseTo(bonus, 10);
    expect(finalStats(target).get(stat)).toBe(baseline[1]);
    source.setCharSettings({...base, [toggle]: false, [selector]: target.char.getId()});
    expect(finalStats(target).get(stat)).toBe(baseline[1]);
    source.setCharSettings({...base, [selector]: target.char.getId()});
    // The choice is kept while its target is away, and applies when it returns.
    team.removeMember(1);
    expect(source.getSettings()[selector]).toBe(target.char.getId());
    team.setMember(1, target);
    expect(finalStats(target).get(stat) - baseline[1]).toBeCloseTo(bonus, 10);
});

test("Venti's ordinary C4 is self-only and Hexerei C4 reaches active teammates", () => {
    const venti = makeBuild('Venti');
    venti.setCharLevels({level: 90, ascension: 6, constellation: 4});
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, venti);
    venti.setCharSettings({venti_hurricane: true});
    expect(finalStats(venti).get('dmg_anemo')).toBeCloseTo(0.25, 10);
    expect(finalStats(receiver).get('dmg_anemo')).toBe(0);
    venti.setCharSettings({venti_hurricane: true, venti_witch_homework: true});
    expect(finalStats(receiver).get('dmg_anemo')).toBeCloseTo(0.25, 10);
    const copy = Team.deserialize(team.serialize());
    expect(finalStats(copy.getMember(0)).get('dmg_anemo')).toBeCloseTo(0.25, 10);
    team.setOnFieldMember(venti);
    expect(finalStats(receiver).get('dmg_anemo')).toBe(0);
    expect(finalStats(venti).get('dmg_anemo')).toBeCloseTo(0.25, 10);
    venti.setCharLevels({level: 90, ascension: 6, constellation: 3});
    expect(finalStats(venti).get('dmg_anemo')).toBe(0);
});

test("Sucrose's selected Swirl elements survive saves and buff only matching members", () => {
    const sucrose = makeBuild('Sucrose');
    const pyro = makeBuild('Hutao');
    const hydro = makeBuild('Barbara');
    const team = Team.fromMember(pyro);
    team.setMember(1, sucrose);
    team.setMember(2, hydro);
    sucrose.setCharSettings({sucrose_catalyst_conversion: 'pyro'});
    expect(finalStats(pyro).get('mastery')).toBe(50);
    expect(finalStats(hydro).get('mastery')).toBe(0);
    sucrose.setCharSettings({sucrose_catalyst_conversion: 'pyro;hydro'});
    const copy = Team.deserialize(team.serialize());
    expect(finalStats(copy.getMember(0)).get('mastery')).toBe(50);
    expect(finalStats(copy.getMember(2)).get('mastery')).toBe(50);
    expect(finalStats(copy.getMember(1)).get('mastery')).toBe(0);
    sucrose.setCharLevels({level: 20, ascension: 0, constellation: 0});
    expect(finalStats(pyro).get('mastery')).toBe(0);
});

test.each([FeatureDamageStellarConduct, FeatureDamageStellarSwirl])(
    "Qiqi C6 adds live ATK once to active other members for %p", Damage => {
        const qiqi = makeBuild('Qiqi');
        qiqi.setCharLevels({level: 90, ascension: 6, constellation: 6});
        const receiver = makeBuild('Ayaka');
        const team = Team.fromMember(receiver);
        team.setMember(1, qiqi);
        const feature = new Damage({category: 'skill', element: 'cryo', multipliers: [
            new FeatureMultiplier({values: new StatTable('test_hit', [100])}),
        ]});
        const hit = member => feature.getResult(member.getBuildData())['skill.test_hit'].normal;
        const baseline = hit(receiver);
        const ownBaseline = hit(qiqi);
        qiqi.setCharSettings({qiqi_glimpse_of_mystery: 1});
        const bonus = hit(receiver) - baseline;
        expect(bonus).toBeGreaterThan(0);
        expect(hit(qiqi)).toBe(ownBaseline);
        const stats = finalStats(qiqi);
        const atk = stats.get('atk_base') + stats.get('atk');
        qiqi.modifyBuffsSettings({'custom_buffs.atk': 1000});
        expect((hit(receiver) - baseline) / bonus).toBeCloseTo((atk + 1000) / atk, 8);
        const oneStack = hit(receiver);
        qiqi.setCharSettings({qiqi_glimpse_of_mystery: 4});
        expect(hit(receiver)).toBe(oneStack);
        const copy = Team.deserialize(team.serialize());
        expect(hit(copy.getMember(0))).toBeCloseTo(oneStack, 8);
        team.setOnFieldMember(qiqi);
        expect(hit(receiver)).toBe(baseline);
        team.setOnFieldMember(receiver);
        qiqi.setCharLevels({level: 90, ascension: 6, constellation: 5});
        expect(hit(receiver)).toBe(baseline);
    },
);

test("Qiqi saves her Radiance mode and Herald delivery while off-field", () => {
    const qiqi = makeBuild('Qiqi');
    const receiver = makeBuild('Ayaka');
    const team = Team.fromMember(receiver);
    team.setMember(1, qiqi);
    team.setSettings({...team.getSettings(), polestar_field: true});
    qiqi.setCharSettings({qiqi_radiance_stellarconduct: true, qiqi_herald_of_frost_radiance: true});
    const copy = Team.deserialize(team.serialize());
    expect(finalStats(copy.getMember(0)).get('dmg_stellarconduct')).toBeCloseTo(0.5, 10);
    expect(finalStats(copy.getMember(0)).get('dmg_stellarswirl')).toBe(0);
    qiqi.setCharSettings({qiqi_radiance_stellarswirl: true, qiqi_herald_of_frost_radiance: true});
    expect(finalStats(receiver).get('dmg_stellarconduct')).toBe(0);
    expect(finalStats(receiver).get('dmg_stellarswirl')).toBeCloseTo(0.5, 10);
});
