import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";

export const ForestRegalia = new DbObjectWeapon({
    name: 'forest_regalia',
    serializeId: 127,
    gameId: 12417,
    iconClass: "weapon-icon-claymore-forest-regalia",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.ForestRegalia,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_forest_sanctuary',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            stack: 'forest_sanctuary',
            title: 'talent_name.forest_sanctuary',
            description: 'talent_descr.forest_sanctuary',
            stats: [
                new StatTable('mastery', weaponPassiveTables.ForestRegalia.p1),
            ],
        }),
    ],
});
