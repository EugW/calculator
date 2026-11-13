import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const PolarStar = new DbObjectWeapon({
    name: 'polar_star',
    serializeId: 112,
    gameId: 15507,
    iconClass: "weapon-icon-bow-polar-star",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.PolarStar,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_polar_star',
            description: 'talent_descr.weapon_polar_star_1',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.PolarStar.p1)),
                new StatTable('dmg_burst', percent(weaponPassiveTables.PolarStar.p1)),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_polar_star',
            serializeId: 1,
            title: 'talent_name.weapon_polar_star',
            description: 'talent_descr.weapon_polar_star_2',
            suggesterValue: 4,
            values: [
                {
                    title: 1,
                    value: 1,
                    serializeId: 1,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('atk_percent', percent(weaponPassiveTables.PolarStar.p3)),
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
                                new StatTable('atk_percent', percent(weaponPassiveTables.PolarStar.p4)),
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
                                new StatTable('atk_percent', percent(weaponPassiveTables.PolarStar.p5)),
                            ],
                        }),
                    ],
                },
                {
                    title: 4,
                    value: 4,
                    serializeId: 4,
                    conditions: [
                        new ConditionStaticRefine({
                            stats: [
                                new StatTable('atk_percent', percent(weaponPassiveTables.PolarStar.p6)),
                            ],
                        }),
                    ],
                },
            ],
        }),
    ],
});
