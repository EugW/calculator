import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const crystalCompoundingName = 'weapon_starsealed_edict';
const lawOfCombustionName = 'weapon_starsealed_edict_law_of_combustion';
const radianceName = 'weapon_starsealed_edict_radiance';
// "Max 3 stacks": fixed inside the ability.
const LawOfCombustionMaxStacks = 3;

const stellarConductCritDmgPerStack = percent(weaponPassiveTables.StarsealedEdict.p3);
const stellarConductCritDmg = new StatTable('crit_dmg_stellarconduct', stellarConductCritDmgPerStack);

/**
 * The toggle is the Radiance: Stellar-Conduct state: while it is on, every
 * Law of Combustion stack also grants Stellar-Conduct CRIT DMG. The text stat
 * keeps the per-stack value visible in the description at every refinement.
 */
class ConditionStarsealedEdictRadiance extends ConditionBooleanRefine {
    getStats(settings) {
        const stats = super.getStats(settings);
        const stacks = Math.min(LawOfCombustionMaxStacks, settings[lawOfCombustionName] || 0);
        if (stacks > 0) {
            stats.add('crit_dmg_stellarconduct', stellarConductCritDmg.getValue(settings.weapon_refine) * stacks);
        }
        return stats;
    }
}

// Every effect is the equipping character's own: nothing reaches the team.
// Game data: Weapon_Catalyst_Chernaya writes flat values and reads no stat
// (ability_channels.txt lists no effect for it).
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
                new StatTable('crit_dmg', weaponPassiveTables.StarsealedEdict.crit_dmg),
            ],
        }),
        new ConditionBooleanRefine({
            name: crystalCompoundingName,
            serializeId: 1,
            title: 'talent_name.weapon_starsealed_edict',
            description: 'talent_descr.weapon_starsealed_edict_2',
            stats: [
                new StatTable('mastery', weaponPassiveTables.StarsealedEdict.p1),
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
                new StatTable('mastery', weaponPassiveTables.StarsealedEdict.p2),
            ],
            condition: new ConditionBoolean({name: crystalCompoundingName}),
        }),
        new ConditionStarsealedEdictRadiance({
            name: radianceName,
            serializeId: 3,
            title: 'talent_name.weapon_starsealed_edict',
            description: 'talent_descr.weapon_starsealed_edict_4',
            stats: [
                new StatTable('text_percent_stellarconduct_crit_dmg', stellarConductCritDmgPerStack),
            ],
            condition: new ConditionBoolean({name: crystalCompoundingName}),
        }),
    ],
});
