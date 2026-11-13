import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

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
                new StatTable('dmg_reaction_lunarcharged', percent(weaponPassiveTables.BloodsoakedRuins.p2)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_bloodsoaked_ruins_2',
            serializeId: 2,
            title: 'talent_name.weapon_bloodsoaked_ruins',
            description: 'talent_descr.weapon_bloodsoaked_ruins_2',
            stats: [
                new StatTable('crit_dmg', percent(weaponPassiveTables.BloodsoakedRuins.p4)),
                new StatTable('text_energy', weaponPassiveTables.BloodsoakedRuins.p5),
            ],
        }),
    ],
});
