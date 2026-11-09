import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const crystalCompoundingName = 'weapon_starsealed_edict';
const lawOfCombustionName = 'weapon_starsealed_edict_law_of_combustion';
const radianceName = 'weapon_starsealed_edict_radiance';
const LawOfCombustionMaxStacks = 3;

const stellarConductCritDmgPerStack = [12, 15, 18, 21, 24];

/**
 * Radiance: Stellar-Conduct turns every Law of Combustion stack into
 * Stellar-Conduct CRIT DMG for the holder. The text stat keeps the per-stack
 * value visible in the description at every refinement.
 */
class ConditionStarsealedEdictRadiance extends ConditionStaticRefine {
    getStats(settings) {
        const stats = super.getStats(settings);
        if (!settings[radianceName] || !settings[crystalCompoundingName]) {
            return stats;
        }

        const stacks = Math.min(LawOfCombustionMaxStacks, settings[lawOfCombustionName] || 0);
        if (stacks > 0) {
            const perStack = new StatTable('crit_dmg_stellarconduct', stellarConductCritDmgPerStack);
            stats.add('crit_dmg_stellarconduct', perStack.getValue(settings.weapon_refine) * stacks);
        }
        return stats;
    }
}

export const StarsealedEdict = new DbObjectWeapon({
    name: 'starsealed_edict',
    serializeId: 269,
    gameId: 14525,
    iconClass: 'weapon-icon-catalyst-starsealed-edict',
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.StarsealedEdict,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_starsealed_edict',
            description: 'talent_descr.weapon_starsealed_edict_1',
            stats: [
                new StatTable('crit_dmg', [24, 30, 36, 42, 48]),
            ],
        }),
        new ConditionBooleanRefine({
            name: crystalCompoundingName,
            serializeId: 1,
            title: 'talent_name.weapon_starsealed_edict',
            description: 'talent_descr.weapon_starsealed_edict_2',
            stats: [
                new StatTable('mastery', [48, 60, 72, 84, 96]),
            ],
        }),
        new ConditionStacks({
            name: lawOfCombustionName,
            serializeId: 2,
            title: 'talent_name.weapon_starsealed_edict',
            description: 'talent_descr.weapon_starsealed_edict_3',
            maxStacks: LawOfCombustionMaxStacks,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('mastery', [24, 30, 36, 42, 48]),
            ],
            condition: new ConditionBoolean({name: crystalCompoundingName}),
        }),
        new ConditionBoolean({
            name: radianceName,
            serializeId: 3,
            title: 'talent_name.radiance_stellarconduct',
        }),
        new ConditionStarsealedEdictRadiance({
            title: 'talent_name.weapon_starsealed_edict',
            description: 'talent_descr.weapon_starsealed_edict_4',
            stats: [
                new StatTable('text_percent_stellarconduct_crit_dmg', stellarConductCritDmgPerStack),
            ],
        }),
    ],
});
