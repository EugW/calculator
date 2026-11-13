import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";

export const SapwoodBlade = new DbObjectWeapon({
    name: 'sapwood_blade',
    serializeId: 126,
    gameId: 11417,
    iconClass: "weapon-icon-sword-sapwood-blade",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SapwoodBlade,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_forest_sanctuary',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            stack: 'forest_sanctuary',
            title: 'talent_name.forest_sanctuary',
            description: 'talent_descr.forest_sanctuary',
            stats: [
                new StatTable('mastery', weaponPassiveTables.SapwoodBlade.p1),
            ],
        }),
    ],
});
