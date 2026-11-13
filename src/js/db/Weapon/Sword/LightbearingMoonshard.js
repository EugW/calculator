import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const LightbearingMoonshard = new DbObjectWeapon({
    name: 'lightbearing_moonshard',
    serializeId: 240,
    gameId: 11519,
    iconClass: "weapon-icon-sword-lightbearing-moonshard",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.LightbearingMoonshard,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_lightbearing_moonshard',
            description: 'talent_descr.weapon_lightbearing_moonshard_1',
            stats: [
                new StatTable('def_percent', weaponPassiveTables.LightbearingMoonshard.def_percent),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_lightbearing_moonshard',
            serializeId: 1,
            title: 'talent_name.weapon_lightbearing_moonshard',
            description: 'talent_descr.weapon_lightbearing_moonshard_2',
            stats: [
                new StatTable('dmg_reaction_lunarcrystallize', percent(weaponPassiveTables.LightbearingMoonshard.p1)),
            ],
        }),
    ],
});
