import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const Moonpiercer = new DbObjectWeapon({
    name: 'moonpiercer',
    serializeId: 128,
    gameId: 13417,
    iconClass: "weapon-icon-polearm-moonpiercer",
    rarity: 4,
    weapon: 'polearm',
    statTable: weaponStatTables.Moonpiercer,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_stillwood_moonshadow',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            stack: 'stillwood_moonshadow',
            title: 'talent_name.stillwood_moonshadow',
            description: 'talent_descr.stillwood_moonshadow',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.Moonpiercer.p1)),
            ],
        }),
    ],
});
