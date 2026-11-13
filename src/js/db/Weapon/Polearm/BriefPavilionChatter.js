import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const BriefPavilionChatter = new DbObjectWeapon({
    name: 'brief_pavilion_chatter',
    serializeId: 197,
    gameId: 13432,
    iconClass: 'weapon-icon-polearm-tamayuratei-no-ohanashi',
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.BriefPavilionChatter,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_brief_pavilion_chatter',
            serializeId: 1,
            title: 'talent_name.weapon_brief_pavilion_chatter',
            description: 'talent_descr.weapon_brief_pavilion_chatter',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.BriefPavilionChatter.p1)),
                new StatTable('move_speed', [percent(weaponPassiveTables.BriefPavilionChatter.p2[0])]),
            ],
        }),
    ],
});
