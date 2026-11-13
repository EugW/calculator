import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanNightSoul } from "../../../classes/Condition/Boolean/NightSoul";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";
import { atkTables } from "../AtkTables";

export const AThousandBlazingSuns = new DbObjectWeapon({
    name: 'a_thousand_blazing_suns',
    serializeId: 193,
    gameId: 12514,
    iconClass: "weapon-icon-claymore-a-thousand-blazing-suns",
    rarity: 5,
    weapon: 'claymore',
    statTable: weaponStatTables.AThousandBlazingSuns,
    conditions: [
        new ConditionBoolean({
            name: 'common.nightsoul_blessing_state',
            serializeId: 1,
            title: 'talent_name.nightsoul_blessing_state',
            subConditions: [
                new ConditionBooleanNightSoul(),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_a_thousand_blazing_suns',
            serializeId: 2,
            title: 'talent_name.weapon_a_thousand_blazing_suns',
            description: 'talent_descr.weapon_a_thousand_blazing_suns_1',
            stats: [
                new StatTable('crit_dmg', percent(weaponPassiveTables.AThousandBlazingSuns.p1)),
                new StatTable('atk_percent', percent(weaponPassiveTables.AThousandBlazingSuns.p2)),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.weapon_a_thousand_blazing_suns',
            description: 'talent_descr.weapon_a_thousand_blazing_suns_2',
            stats: [
                new StatTable('text_petcent', [percent(weaponPassiveTables.AThousandBlazingSuns.p3[0])]),
                new StatTable('crit_dmg', percent(times(weaponPassiveTables.AThousandBlazingSuns.p1, weaponPassiveTables.AThousandBlazingSuns.p3))),
                new StatTable('atk_percent', percent(times(weaponPassiveTables.AThousandBlazingSuns.p2, weaponPassiveTables.AThousandBlazingSuns.p3))),
            ],
            subConditions: [
                new ConditionBooleanNightSoul(),
                new ConditionBoolean({name: 'common.nightsoul_blessing_state'}),
                new ConditionBooleanRefine({name: 'weapon_a_thousand_blazing_suns'}),
            ],
        }),
    ],
});

