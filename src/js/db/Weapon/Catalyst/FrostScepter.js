import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const cryoMastery = new StatTable('mastery', [24, 30, 36, 42, 48]);
const electroAtk = new StatTable('atk_percent', [4.8, 6, 7.2, 8.4, 9.6]);
const radianceMastery = new StatTable('mastery', [20, 25, 30, 35, 40]);
const radianceDmg = new StatTable('', [6, 7.5, 9, 10.5, 12]);

class ConditionFrostScepter extends ConditionStaticRefine {
    getElementCounts(settings) {
        const elements = [
            settings.char_element,
            settings.resonance_element_1,
            settings.resonance_element_2,
            settings.resonance_element_3,
        ].filter(Boolean);
        const cryo = Math.min(4, elements.filter((element) => element === 'cryo').length);
        const electro = Math.min(4 - cryo,
            elements.filter((element) => element === 'electro').length);
        return {cryo, electro};
    }

    getStats(settings) {
        const stats = super.getStats(settings);
        const level = settings.weapon_refine;
        const {cryo, electro} = this.getElementCounts(settings);

        stats.add('mastery', cryoMastery.getValue(level) * cryo);
        stats.add('atk_percent', electroAtk.getValue(level) * electro);
        stats.add('text_number_cryo', cryo || 0.0001);
        stats.add('text_number_electro', electro || 0.0001);

        if (settings.weapon_frost_scepter_radiance) {
            const eligible = cryo + electro;
            stats.add('mastery', radianceMastery.getValue(level) * eligible);
            stats.add('dmg_stellarconduct', radianceDmg.getValue(level) * eligible);
            stats.add('dmg_stellarswirl', radianceDmg.getValue(level) * eligible);
        }
        return stats;
    }
}

export const FrostScepter = new DbObjectWeapon({
    name: 'frost_scepter',
    serializeId: 261,
    gameId: 14437,
    iconClass: 'weapon-icon-catalyst-frost-scepter',
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.FrostScepter,
    beta: true,
    conditions: [
        new ConditionBoolean({
            name: 'weapon_frost_scepter_radiance',
            serializeId: 1,
            title: 'talent_name.weapon_frost_scepter_radiance',
        }),
        new ConditionFrostScepter({
            title: 'talent_name.weapon_frost_scepter',
            description: 'talent_descr.weapon_frost_scepter',
            stats: [
                new StatTable('text_mastery_cryo', [24, 30, 36, 42, 48]),
                new StatTable('text_atk_electro', [4.8, 6, 7.2, 8.4, 9.6]),
                new StatTable('text_mastery_radiance', [20, 25, 30, 35, 40]),
                new StatTable('text_dmg_radiance', [6, 7.5, 9, 10.5, 12]),
            ],
        }),
    ],
});
