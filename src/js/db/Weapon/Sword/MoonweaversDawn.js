import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const energyCapacity60Bonus = new StatTable('dmg_burst', [16, 20, 24, 28, 32]);
const energyCapacity40Bonus = new StatTable('dmg_burst', [28, 35, 42, 49, 56]);

/**
 * Extra Elemental Burst DMG from the equipping character's Energy Capacity:
 * at most 60 gives the first bonus, at most 40 the larger one. Characters
 * without an Energy Capacity (e.g. Skirk) get neither.
 */
class ConditionMoonweaversDawnEnergy extends ConditionStaticRefine {
    getEnergyCapacity(settings) {
        const char = settings && settings.char_id ? DB.Chars.getById(settings.char_id) : null;
        if (!char || !Array.isArray(char.statTable)) {
            return null;
        }

        const table = char.statTable.find((item) => item.getName() === 'burst_energy_cost');
        return table ? table.getValue(1) : null;
    }

    checkSubconditions(settings) {
        const energy = this.getEnergyCapacity(settings);
        return super.checkSubconditions(settings) && energy !== null && energy <= 60;
    }

    getStats(settings) {
        const stats = super.getStats(settings);
        const energy = this.getEnergyCapacity(settings);
        if (energy !== null && energy <= 60) {
            const bonus = energy <= 40 ? energyCapacity40Bonus : energyCapacity60Bonus;
            stats.add('dmg_burst', bonus.getValue(settings.weapon_refine));
        }
        return stats;
    }
}

export const MoonweaversDawn = new DbObjectWeapon({
    name: 'moonweavers_dawn',
    serializeId: 226,
    gameId: 11434,
    iconClass: "weapon-icon-sword-moonweavers-dawn",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.MoonweaversDawn,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_moonweavers_dawn',
            description: 'talent_descr.weapon_moonweavers_dawn_1',
            stats: [
                new StatTable('dmg_burst', [20, 25, 30, 35, 40]),
            ],
        }),
        new ConditionMoonweaversDawnEnergy({
            title: 'talent_name.weapon_moonweavers_dawn',
            description: 'talent_descr.weapon_moonweavers_dawn_2',
            stats: [
                new StatTable('text_percent_energy_60', [16, 20, 24, 28, 32]),
                new StatTable('text_percent_energy_40', [28, 35, 42, 49, 56]),
            ],
        }),
    ],
});
