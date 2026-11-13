import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const WhiteTassel = new DbObjectWeapon({
    name: 'white_tassel',
    serializeId: 84,
    gameId: 13301,
    iconClass: "weapon-icon-polearm-white-tassel",
    rarity: 3,
    weapon: 'polearm',
    statTable: weaponStatTables.WhiteTassel,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_white_tassel',
            description: 'talent_descr.weapon_white_tassel',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.WhiteTassel.p1)),
            ],
        }),
    ],
});

