import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { teamElements } from "../../../classes/Team/Party";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const cryoMastery = new StatTable('mastery', weaponPassiveTables.WintersHeavyHeart.p1);
const electroAtk = new StatTable('atk_percent', percent(weaponPassiveTables.WintersHeavyHeart.p2));
const radianceMastery = new StatTable('mastery', weaponPassiveTables.WintersHeavyHeart.p3);
const radianceDmg = new StatTable('', percent(weaponPassiveTables.WintersHeavyHeart.p4));

class ConditionWintersHeavyHeart extends ConditionStaticRefine {
    getElementCounts(settings) {
        const elements = teamElements(settings);
        const cryo = Math.min(4, elements.filter((element) => element === 'cryo').length);
        const electro = Math.min(4 - cryo,
            elements.filter((element) => element === 'electro').length);
        return {cryo, electro};
    }

    getStats(settings) {
        const stats = super.getStats(settings);
        const level = settings.weapon_refine;
        const {cryo, electro} = this.getElementCounts(settings);

        stats.add('text_number_cryo', cryo || 0.0001);
        stats.add('text_number_electro', electro || 0.0001);

        if (settings.weapon_winters_heavy_heart_radiance) {
            const eligible = cryo + electro;
            stats.add('mastery', radianceMastery.getValue(level) * eligible);
            stats.add('dmg_stellarconduct', radianceDmg.getValue(level) * eligible);
            stats.add('dmg_stellarswirl', radianceDmg.getValue(level) * eligible);
        } else {
            stats.add('mastery', cryoMastery.getValue(level) * cryo);
            stats.add('atk_percent', electroAtk.getValue(level) * electro);
        }
        return stats;
    }
}

export const WintersHeavyHeart = new DbObjectWeapon({
    name: 'winters_heavy_heart',
    serializeId: 261,
    gameId: 14437,
    iconClass: 'weapon-icon-catalyst-winters-heavy-heart',
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.WintersHeavyHeart,
    conditions: [
        new ConditionBoolean({
            name: 'weapon_winters_heavy_heart_radiance',
            serializeId: 1,
            title: 'talent_name.n11500004',
        }),
        new ConditionWintersHeavyHeart({
            title: 'talent_name.weapon_winters_heavy_heart',
            description: 'talent_descr.weapon_winters_heavy_heart',
            stats: [
                new StatTable('text_mastery_cryo', weaponPassiveTables.WintersHeavyHeart.p1),
                new StatTable('text_atk_electro', percent(weaponPassiveTables.WintersHeavyHeart.p2)),
                new StatTable('text_mastery_radiance', weaponPassiveTables.WintersHeavyHeart.p3),
                new StatTable('text_dmg_radiance', percent(weaponPassiveTables.WintersHeavyHeart.p4)),
            ],
        }),
    ],
});
