import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

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
                new StatTable('crit_rate', [8, 10, 12, 14, 16]),
            ],
        }),
        // Secret of Lies: EM bonus on Elemental Skill (12s)
        new ConditionBooleanRefine({
            name: 'weapon_reliquary_of_truth',
            serializeId: 1,
            title: 'talent_name.weapon_reliquary_of_truth',
            description: 'talent_descr.weapon_reliquary_of_truth_2',
            stats: [
                new StatTable('mastery', [80, 100, 120, 140, 160]),
            ],
        }),
        // Moon of Truth: CRIT DMG bonus on Lunar-Bloom (4s)
        new ConditionBooleanRefine({
            name: 'weapon_reliquary_of_truth_2',
            serializeId: 2,
            title: 'talent_name.weapon_reliquary_of_truth',
            description: 'talent_descr.weapon_reliquary_of_truth_3',
            stats: [
                new StatTable('crit_dmg', [24, 30, 36, 42, 48]),
            ],
        }),
        // Combined bonus: +50% to both effects when both are active
        new ConditionStaticRefine({
            stats: [
                new StatTable('mastery', [40, 50, 60, 70, 80]),
                new StatTable('crit_dmg', [12, 15, 18, 21, 24]),
            ],
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_reliquary_of_truth'}),
                new ConditionBoolean({name: 'weapon_reliquary_of_truth_2'}),
            ]),
        }),
    ],
});
