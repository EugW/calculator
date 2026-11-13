
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const LumidouceElegy = new DbObjectWeapon({
    name: 'lumidouce_elegy',
    serializeId: 176,
    gameId: 13513,
    iconClass: "weapon-icon-polearm-lumidouce-elegy",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.LumidouceElegy,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_lumidouce_elegy',
            description: 'talent_descr.weapon_lumidouce_elegy_1',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.LumidouceElegy.atk_percent),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_lumidouce_elegy',
            serializeId: 1,
            title: 'talent_name.weapon_lumidouce_elegy',
            description: 'talent_descr.weapon_lumidouce_elegy_2',
            maxStacks: 2,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.LumidouceElegy.p2)),
                new StatTable('text_value_energy', weaponPassiveTables.LumidouceElegy.p4),
            ],
        }),
    ],
});
