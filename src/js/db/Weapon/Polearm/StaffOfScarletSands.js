import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectStatsMastery } from "../../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

// Heat Haze at Horizon's End: bonus ATK from EM (52/65/78/91/104% base,
// plus 28/35/42/49/56% per Dream of the Scarlet Sands stack, max 3).
// Game data: Weapon_Pole_Deshret reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY
// (premod) into Cur_Mastery (UNIQUE_Pole_Deshret_MasteryToAtk_Refresh and
// UNIQUE_Pole_Deshret_TriggerCD) and writes Actor_AttackExtraDelta (extra)
// in UNIQUE_Pole_Deshret_BaseBuff and UNIQUE_Pole_Deshret_StackBuff.
// KQM (Nahida): Nahida's A1 EM does not count for Scarlet Sands (nor do the
// Key, Xiphos or Evenstar extra EM). GO reads input.premod.eleMas into total
// atk. The default premod read and extra write are confirmed, so no params.
const weaponPost = new PostEffectStatsMastery({
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', weaponPassiveTables.StaffOfScarletSands.p1),
    percentBonusLevel: 'weapon_refine',
    percentBonus: new StatTable('atk', weaponPassiveTables.StaffOfScarletSands.p2),
    bonusStackSettings: 'weapon_staff_of_the_scarlet_sands',
    bonusCondition: new ConditionBoolean({name: 'weapon_staff_of_the_scarlet_sands'})
});

export const StaffOfScarletSands = new DbObjectWeapon({
    name: 'staff_of_the_scarlet_sands',
    serializeId: 132,
    gameId: 13511,
    iconClass: "weapon-icon-polearm-staff-of-the-scarlet-sands",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.StaffOfScarletSands,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.heat_haze_at_horizons_end',
            description: 'talent_descr.heat_haze_at_horizons_end_1',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.StaffOfScarletSands.p1)),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_staff_of_the_scarlet_sands',
            serializeId: 1,
            title: 'talent_name.heat_haze_at_horizons_end',
            description: 'talent_descr.heat_haze_at_horizons_end_2',
            levelSetting: 'weapon_refine',
            maxStacks: weaponPassiveTables.StaffOfScarletSands.p5[0],
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.StaffOfScarletSands.p2)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'atk_bonus',
            postEffect: weaponPost,
            digits: 1,
        }),
    ],
});

