import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const BloodsoakedRuins = new DbObjectWeapon({
    name: 'bloodsoaked_ruins',
    serializeId: 228,
    gameId: 13516,
    iconClass: "weapon-icon-polearm-bloodsoaked-ruins",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.BloodsoakedRuins,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_bloodsoaked_ruins',
            serializeId: 1,
            title: 'talent_name.weapon_bloodsoaked_ruins',
            description: 'talent_descr.weapon_bloodsoaked_ruins_1',
            stats: [
                new StatTable('dmg_reaction_lunarcharged', [36, 48, 60, 72, 84]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_bloodsoaked_ruins_2',
            serializeId: 2,
            title: 'talent_name.weapon_bloodsoaked_ruins_2',
            description: 'talent_descr.weapon_bloodsoaked_ruins_2',
            stats: [
                new StatTable('crit_dmg', [28, 35, 42, 49, 56]),
                new StatTable('text_energy', [12, 13, 14, 15, 16]),
            ],
        }),
    ],
});
