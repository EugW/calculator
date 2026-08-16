import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionNumber } from "../../../classes/Condition/Number";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const atkMinimum = new StatTable('atk_percent', [18, 22.5, 27, 31.5, 36]);
const atkMaximum = new StatTable('atk_percent', [36, 45, 54, 63, 72]);

class ConditionHereticsMoltenBlade extends ConditionBooleanRefine {
    getStats(settings) {
        const stats = super.getStats(settings);
        const refine = settings.weapon_refine;
        const minimum = atkMinimum.getValue(refine);
        const maximum = atkMaximum.getValue(refine);
        const distance = Math.min(7, Math.max(0,
            parseFloat(settings.weapon_heretics_molten_blade_distance) || 0));

        stats.add('atk_percent', minimum + (maximum - minimum) * distance / 7);
        return stats;
    }
}

export const HereticsMoltenBlade = new DbObjectWeapon({
    name: 'heretics_molten_blade',
    serializeId: 246,
    gameId: 11435,
    iconClass: "weapon-icon-sword-heretics-molten-blade",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.HereticsMoltenBlade,
    conditions: [
        new ConditionHereticsMoltenBlade({
            name: 'weapon_heretics_molten_blade',
            serializeId: 1,
            title: 'talent_name.weapon_heretics_molten_blade',
            description: 'talent_descr.weapon_heretics_molten_blade',
            stats: [
                new StatTable('text_percent_min', [18, 22.5, 27, 31.5, 36]),
                new StatTable('text_percent_max', [36, 45, 54, 63, 72]),
            ],
        }),
        new ConditionNumber({
            name: 'weapon_heretics_molten_blade_distance',
            serializeId: 2,
            title: 'talent_name.weapon_heretics_molten_blade_distance',
            min: 0,
            max: 7,
            allowMinZero: true,
            format: 'decimal',
            noStat: true,
            subConditions: [
                new ConditionBoolean({name: 'weapon_heretics_molten_blade'}),
            ],
        }),
    ],
});
