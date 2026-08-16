import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

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
                new StatTable('hp_percent', [10, 12, 14, 16, 18]),
            ],
        }),
        // Bountiful Sea's Sacred Wine: Additional HP% + Lunar CRIT DMG on Lunar reaction
        new ConditionBooleanRefine({
            name: 'weapon_nocturnes_curtain_call',
            serializeId: 1,
            title: 'talent_name.weapon_nocturnes_curtain_call',
            description: 'talent_descr.weapon_nocturnes_curtain_call_2',
            stats: [
                new StatTable('hp_percent', [14, 16, 18, 20, 22]),
                new StatTable('crit_dmg_lunar', [60, 80, 100, 120, 140]),
            ],
        }),
    ],
});
