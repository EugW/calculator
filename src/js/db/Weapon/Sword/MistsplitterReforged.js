import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const MistsplitterReforged = new DbObjectWeapon({
    name: 'mistsplitter_reforged',
    serializeId: 101,
    gameId: 11509,
    iconClass: "weapon-icon-sword-mistsplitter-reforged",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.MistsplitterReforged,
    settingsSets: [
        {
            name: 'stacks_2',
            settings: {
                weapon_mistsplitters_reforged: 2,
            },
        },
        {
            name: 'stacks_3',
            settings: {
                weapon_mistsplitters_reforged: 3,
            },
        },
    ],
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_mistsplitters_reforged',
            description: 'talent_descr.weapon_mistsplitters_reforged_1',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.MistsplitterReforged.p1)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.MistsplitterReforged.p1)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.MistsplitterReforged.p1)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.MistsplitterReforged.p1)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.MistsplitterReforged.p1)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.MistsplitterReforged.p1)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.MistsplitterReforged.p1)),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_mistsplitters_reforged',
            serializeId: 1,
            title: 'talent_name.weapon_mistsplitters_reforged',
            description: 'talent_descr.weapon_mistsplitters_reforged_2',
            suggesterValue: 3,
            values: [
                {
                    title: 1,
                    value: 1,
                    serializeId: 1,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('dmg_own', percent(weaponPassiveTables.MistsplitterReforged.p2)),
                            ],
                        }),
                    ],
                },
                {
                    title: 2,
                    value: 2,
                    serializeId: 2,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('dmg_own', percent(weaponPassiveTables.MistsplitterReforged.p3)),
                            ],
                        }),
                    ],
                },
                {
                    title: 3,
                    value: 3,
                    serializeId: 3,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('dmg_own', percent(weaponPassiveTables.MistsplitterReforged.p4)),
                            ],
                        }),
                    ],
                },
            ],
        }),
    ],
});
