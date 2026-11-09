import { BuildData } from "../src/js/classes/Build/Data";
import { DB } from "../src/js/db/DB";
import { Lang } from "../src/js/ui/Lang";

global.window = {};
global.localStorage = {};
require("../src/js/lang/eng.js");
global.UI = {Lang: new Lang()};
global.DB = DB;

function getWeapon() {
    return DB.Weapons.get('catalyst').get('StarsealedEdict');
}

function applyWeapon(settings) {
    const data = new BuildData(settings, {});
    for (const condition of getWeapon().getConditions()) {
        const conditionData = condition.getData(data.settings);
        data.addSettings(conditionData.settings);
        data.addStats(conditionData.stats);
    }
    return data.stats;
}

test('Starsealed Edict has its 7.2 identity and L90 stats', () => {
    const weapon = getWeapon();
    expect(weapon).toBeDefined();
    expect(weapon.getId()).toBe(269);
    expect(weapon.getGameId()).toBe(14525);
    expect(weapon.getIcon()).toBe('weapon-icon-catalyst-starsealed-edict');
    expect(DB.Weapons.get('catalyst').getKeys()).toContain('StarsealedEdict');
    expect(weapon.statTable[0].getValue(90, 6)).toBeCloseTo(542, 0);
    expect(weapon.statTable[1].getName()).toBe('crit_dmg_base');
    expect(weapon.statTable[1].getValue(90, 6)).toBeCloseTo(88.2, 1);
});

test.each([
    [1, 24, 48, 24, 12],
    [5, 48, 96, 48, 24],
])('Starsealed Edict R%i applies CRIT DMG, Crystal Compounding and Law of Combustion', (
    refine,
    critDmg,
    compoundingMastery,
    stackMastery,
    stellarCritDmg,
) => {
    const idle = applyWeapon({weapon_refine: refine});
    expect(idle.get('crit_dmg')).toBe(critDmg);
    expect(idle.get('mastery')).toBe(0);
    expect(idle.get('crit_dmg_stellarconduct')).toBe(0);

    const compounding = applyWeapon({
        weapon_refine: refine,
        weapon_starsealed_edict: true,
        weapon_starsealed_edict_law_of_combustion: 5,
    });
    expect(compounding.get('mastery')).toBe(compoundingMastery + stackMastery * 3);
    expect(compounding.get('crit_dmg_stellarconduct')).toBe(0);

    const radiance = applyWeapon({
        weapon_refine: refine,
        weapon_starsealed_edict: true,
        weapon_starsealed_edict_law_of_combustion: 2,
        weapon_starsealed_edict_radiance: true,
    });
    expect(radiance.get('mastery')).toBe(compoundingMastery + stackMastery * 2);
    expect(radiance.get('crit_dmg_stellarconduct')).toBe(stellarCritDmg * 2);

    // Law of Combustion only exists during Crystal Compounding.
    const stacksOnly = applyWeapon({
        weapon_refine: refine,
        weapon_starsealed_edict_law_of_combustion: 3,
        weapon_starsealed_edict_radiance: true,
    });
    expect(stacksOnly.get('mastery')).toBe(0);
    expect(stacksOnly.get('crit_dmg_stellarconduct')).toBe(0);
});

test('Starsealed Edict Radiance is the Dawnstar\'s Flowing Trail toggle itself', () => {
    const conditions = getWeapon().getConditions();
    expect(conditions.filter((condition) => condition.getName())
        .map((condition) => [condition.getName(), condition.params.serializeId, condition.getType()])).toEqual([
        ['weapon_starsealed_edict', 1, 'checkbox'],
        ['weapon_starsealed_edict_law_of_combustion', 2, 'stacks'],
        ['weapon_starsealed_edict_radiance', 3, 'checkbox'],
    ]);
    expect(conditions.some((condition) => condition.params.title === 'talent_name.radiance_stellarconduct')).toBe(false);

    const radiance = conditions.find((condition) => condition.getName() === 'weapon_starsealed_edict_radiance');
    expect(radiance.params.title).toBe('talent_name.weapon_starsealed_edict');
    expect(radiance.params.description).toBe('talent_descr.weapon_starsealed_edict_4');
    // Law of Combustion stacks only exist during Crystal Compounding, so the toggle waits for it.
    expect(radiance.checkSubconditions({weapon_refine: 1})).toBe(false);
    expect(radiance.checkSubconditions({weapon_refine: 1, weapon_starsealed_edict: true})).toBe(true);

    const noStacks = applyWeapon({
        weapon_refine: 1,
        weapon_starsealed_edict: true,
        weapon_starsealed_edict_radiance: true,
    });
    expect(noStacks.get('crit_dmg_stellarconduct')).toBe(0);
});

test('Starsealed Edict descriptions come from the generated passive with refinement values', () => {
    const settings = {weapon_refine: 1};
    const descriptions = getWeapon().getConditions()
        .filter((condition) => condition.params.description)
        .map((condition) => condition.getDescription(condition.getStats(settings)));

    expect(descriptions).toHaveLength(4);
    for (const description of descriptions) {
        expect(description).not.toContain('?');
        expect(description).not.toContain('%{');
    }
    expect(descriptions[0]).toContain('24%');
    expect(descriptions[1]).toContain('48');
    expect(descriptions[2]).toContain('24');
    expect(descriptions[2]).toContain('Law of Combustion');
    expect(descriptions[3]).toContain('12%');
    expect(descriptions[3]).toContain('Stellar-Conduct');
});
