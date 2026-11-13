import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const VividNotions = new DbObjectWeapon({
    name: 'vivid_notions',
    serializeId: 198,
    gameId: 14519,
    iconClass: "weapon-icon-catalyst-vivid-notions",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.VividNotions,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_vivid_notions',
            description: 'talent_descr.weapon_vivid_notions_1',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.VividNotions.atk_percent),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_vivid_notions',
            description: 'talent_descr.weapon_vivid_notions_2',
            stats: [
                new StatTable('text_percent_1', percent(weaponPassiveTables.VividNotions.p3)),
                new StatTable('text_percent_2', percent(weaponPassiveTables.VividNotions.p4)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_vivid_notions_3_1',
            serializeId: 1,
            title: 'talent_name.weapon_vivid_notions_3_1',
            description: 'talent_descr.weapon_vivid_notions_3',
            stats: [
                new StatTable('crit_dmg_plunge', percent(weaponPassiveTables.VividNotions.p3)),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_vivid_notions_3_2',
            serializeId: 2,
            title: 'talent_name.weapon_vivid_notions_3_2',
            description: 'talent_descr.weapon_vivid_notions_3',
            stats: [
                new StatTable('crit_dmg_plunge', percent(weaponPassiveTables.VividNotions.p4)),
            ],
        }),
    ],
});

