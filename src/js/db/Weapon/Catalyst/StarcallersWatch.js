import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const StarcallersWatch = new DbObjectWeapon({
    name: 'starcallers_watch',
    serializeId: 195,
    gameId: 14517,
    iconClass: "weapon-icon-catalyst-starcallers-watch",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.StarcallersWatch,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_starcallers_watch',
            description: 'talent_descr.weapon_starcallers_watch_1',
            stats: [
                new StatTable('mastery', weaponPassiveTables.StarcallersWatch.mastery),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_starcallers_watch',
            serializeId: 1,
            receivers: RECEIVERS.TEAM,
            stack: 'starcallers_watch',
            title: 'talent_name.weapon_starcallers_watch',
            description: 'talent_descr.weapon_starcallers_watch_2',
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.StarcallersWatch.p1)),
            ],
        }),
    ],
});

