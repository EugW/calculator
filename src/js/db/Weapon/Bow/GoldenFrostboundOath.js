import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

export const GoldenFrostboundOath = new DbObjectWeapon({
    name: 'golden_frostbound_oath',
    serializeId: 242,
    gameId: 15516,
    iconClass: "weapon-icon-bow-golden-frostbound-oath",
    rarity: 5,
    weapon: 'bow',
    statTable: weaponStatTables.GoldenFrostboundOath,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_golden_frostbound_oath',
            description: 'talent_descr.weapon_golden_frostbound_oath_1',
            stats: [
                new StatTable('def_percent', weaponPassiveTables.GoldenFrostboundOath.def_percent),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_golden_frostbound_oath',
            serializeId: 1,
            title: 'talent_name.weapon_golden_frostbound_oath',
            description: 'talent_descr.weapon_golden_frostbound_oath',
            stats: [
                new StatTable('dmg_geo', percent(weaponPassiveTables.GoldenFrostboundOath.p2)),
                new StatTable('dmg_reaction_lunarcrystallize', percent(weaponPassiveTables.GoldenFrostboundOath.p3)),
                new StatTable('text_percent', percent(times(weaponPassiveTables.GoldenFrostboundOath.p2, weaponPassiveTables.GoldenFrostboundOath.p4))),
            ],
        }),
        // Frost Fae's Mischief: all other nearby party members gain half of
        // the wielder's bonus while Moondrifts are near (the calculator does
        // not track Moondrifts, like the old party row).
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stack: 'golden_frostbound_oath',
            condition: new ConditionBoolean({name: 'weapon_golden_frostbound_oath'}),
            stats: [
                new StatTable('dmg_geo', percent(times(weaponPassiveTables.GoldenFrostboundOath.p2, weaponPassiveTables.GoldenFrostboundOath.p4))),
                new StatTable('dmg_reaction_lunarcrystallize', percent(times(weaponPassiveTables.GoldenFrostboundOath.p3, weaponPassiveTables.GoldenFrostboundOath.p4))),
            ],
        }),
    ],
});
