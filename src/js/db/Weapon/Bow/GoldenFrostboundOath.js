import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const GoldenFrostboundOath = new DbObjectWeapon({
    name: 'golden_frostbound_oath',
    serializeId: 242,
    gameId: 15516,
    iconClass: "weapon-icon-bow-golden-frostbound-oath",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.GoldenFrostboundOath,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_golden_frostbound_oath',
            description: 'talent_descr.weapon_golden_frostbound_oath_1',
            stats: [
                new StatTable('def_percent', [16, 20, 24, 28, 32]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_golden_frostbound_oath',
            serializeId: 1,
            title: 'talent_name.weapon_golden_frostbound_oath',
            description: 'talent_descr.weapon_golden_frostbound_oath',
            stats: [
                new StatTable('dmg_geo', [40, 50, 60, 70, 80]),
                new StatTable('dmg_reaction_lunarcrystallize', [40, 50, 60, 70, 80]),
                new StatTable('text_percent', [20, 25, 30, 35, 40]),
            ],
        }),
    ],
});
