import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

export const ReliquaryOfTruth = new DbObjectWeapon({
    name: 'reliquary_of_truth',
    serializeId: 232,
    gameId: 14521,
    iconClass: "weapon-icon-catalyst-reliquary-of-truth",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.ReliquaryOfTruth,
    conditions: [
        // Permanent CRIT Rate bonus
        new ConditionStaticRefine({
            title: 'talent_name.weapon_reliquary_of_truth',
            description: 'talent_descr.weapon_reliquary_of_truth_1',
            stats: [
                new StatTable('crit_rate', weaponPassiveTables.ReliquaryOfTruth.crit_rate),
            ],
        }),
        // Secret of Lies: EM bonus on Elemental Skill (12s)
        new ConditionBooleanRefine({
            name: 'weapon_reliquary_of_truth',
            serializeId: 1,
            title: 'talent_name.weapon_reliquary_of_truth',
            description: 'talent_descr.weapon_reliquary_of_truth_2',
            stats: [
                new StatTable('mastery', weaponPassiveTables.ReliquaryOfTruth.p1),
            ],
        }),
        // Moon of Truth: CRIT DMG bonus on Lunar-Bloom (4s)
        new ConditionBooleanRefine({
            name: 'weapon_reliquary_of_truth_2',
            serializeId: 2,
            title: 'talent_name.weapon_reliquary_of_truth',
            description: 'talent_descr.weapon_reliquary_of_truth_3',
            stats: [
                new StatTable('crit_dmg', percent(weaponPassiveTables.ReliquaryOfTruth.p2)),
            ],
        }),
        // Combined bonus: +50% to both effects when both are active
        new ConditionStaticRefine({
            title: 'talent_name.weapon_reliquary_of_truth',
            description: 'talent_descr.weapon_reliquary_of_truth_4',
            stats: [
                new StatTable('mastery', times(weaponPassiveTables.ReliquaryOfTruth.p1, weaponPassiveTables.ReliquaryOfTruth.p5)),
                new StatTable('crit_dmg', percent(times(weaponPassiveTables.ReliquaryOfTruth.p2, weaponPassiveTables.ReliquaryOfTruth.p5))),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_reliquary_of_truth'}),
                new ConditionBoolean({name: 'weapon_reliquary_of_truth_2'}),
            ]),
        }),
    ],
});
