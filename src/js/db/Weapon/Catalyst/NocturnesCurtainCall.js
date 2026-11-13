import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const NocturnesCurtainCall = new DbObjectWeapon({
    name: 'nocturnes_curtain_call',
    serializeId: 239,
    gameId: 14522,
    iconClass: "weapon-icon-catalyst-nocturnes-curtain-call",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.NocturnesCurtainCall,
    conditions: [
        // Passive: Max HP increase (always active)
        new ConditionStaticRefine({
            title: 'talent_name.weapon_nocturnes_curtain_call',
            description: 'talent_descr.weapon_nocturnes_curtain_call_1',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.NocturnesCurtainCall.hp_percent),
            ],
        }),
        // Bountiful Sea's Sacred Wine: Additional HP% + Lunar CRIT DMG on Lunar reaction
        new ConditionBooleanRefine({
            name: 'weapon_nocturnes_curtain_call',
            serializeId: 1,
            title: 'talent_name.weapon_nocturnes_curtain_call',
            description: 'talent_descr.weapon_nocturnes_curtain_call_2',
            stats: [
                new StatTable('hp_percent', percent(weaponPassiveTables.NocturnesCurtainCall.p1)),
                new StatTable('crit_dmg_lunar', percent(weaponPassiveTables.NocturnesCurtainCall.p2)),
            ],
        }),
    ],
});
