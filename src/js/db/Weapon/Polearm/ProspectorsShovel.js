import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const ProspectorsShovel = new DbObjectWeapon({
    name: 'prospectors_shovel',
    serializeId: 229,
    gameId: 13433,
    iconClass: "weapon-icon-polearm-prospectors-shovel",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.ProspectorsShovel,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_prospectors_shovel',
            description: 'talent_descr.weapon_prospectors_shovel',
            stats: [
                new StatTable('dmg_reaction_electrocharged', [48, 60, 72, 84, 96]),
                new StatTable('dmg_reaction_lunarcharged', [12, 15, 18, 21, 24]),
            ],
        }),
    ],
});
