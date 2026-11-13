import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const UrakuMisugiri = new DbObjectWeapon({
    name: 'uraku_misugiri',
    serializeId: 170,
    gameId: 11514,
    iconClass: "weapon-icon-sword-uraku-misugiri",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.UrakuMisugiri,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_uraku_misugiri',
            description: 'talent_descr.weapon_uraku_misugiri_1',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.UrakuMisugiri.p2)),
                new StatTable('dmg_skill', percent(weaponPassiveTables.UrakuMisugiri.p3)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_uraku_misugiri',
            serializeId: 1,
            title: 'talent_name.weapon_uraku_misugiri',
            description: 'talent_descr.weapon_uraku_misugiri_2',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.UrakuMisugiri.p2)),
                new StatTable('dmg_skill', percent(weaponPassiveTables.UrakuMisugiri.p3)),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_uraku_misugiri',
            description: 'talent_descr.weapon_uraku_misugiri_3',
            stats: [
                new StatTable('def_percent', weaponPassiveTables.UrakuMisugiri.def_percent),
            ],
        }),
    ],
});
