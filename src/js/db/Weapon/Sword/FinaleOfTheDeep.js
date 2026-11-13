import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionNumberLevels } from "../../../classes/Condition/Number/Levels";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsBondOfLife } from "../../../classes/PostEffect/Stats/BondOfLife";
import { StatTable } from "../../../classes/StatTable";
import { BOND_OF_LIFE_MAX_PERCENT } from "../../Constants";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const atkBuffPost = new PostEffectStatsBondOfLife({
    // Bond of Life cleared -> flat ATK. The game (Weapon_Sword_Vorpal)
    // grants the debt as [Debts, FIGHT_PROP_MAX_HP, MUL] (total HP) in
    // UNIQUE_Sword_Vorpal_TriggerCD, then sets Attack as
    // [TotalDebts, Ratio2, MUL] (2.4%/3%/3.6%/4.2%/4.8%, cap MaxAttack
    // 150/187.5/225/262.5/300) in HPDebtsMixin and writes it via
    // UNIQUE_Sword_Vorpal_Buff2 properties Actor_AttackDelta (no "Extra":
    // premod). GO reads input.total.hp into premod atk. The total read is
    // declared even though no ability writes extra HP today, so the model
    // matches the game when one appears; premod ATK readers (Cryo Traveler
    // A4) count it, extra writers (Bennett burst) do not feed it. KQM has
    // no Finale Of The Deep buff-chain test.
    reads: CHANNELS.TOTAL,
    writes: CHANNELS.PREMOD,
    levelSetting: 'weapon_refine',
    bolSettingName: 'weapon_finale_of_the_deep_bol',
    percent: new StatTable('atk', weaponPassiveTables.FinaleOfTheDeep.p4),
    statCap: new StatTable('', weaponPassiveTables.FinaleOfTheDeep.p5),
    conditions: [
        new ConditionBoolean({name: 'weapon_finale_of_the_deep_bol'}),
    ],
});

export const FinaleOfTheDeep = new DbObjectWeapon({
    name: 'finale_of_the_deep',
    serializeId: 147,
    gameId: 11425,
    iconClass: 'weapon-icon-sword-finale-of-the-deep',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.FinaleOfTheDeep,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_finale_of_the_deep_1',
            serializeId: 1,
            title: 'talent_name.weapon_finale_of_the_deep',
            description: 'talent_descr.weapon_finale_of_the_deep_1',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.FinaleOfTheDeep.p1)),
            ],
        }),
        new ConditionNumberLevels({
            name: 'weapon_finale_of_the_deep_bol',
            serializeId: 2,
            max: BOND_OF_LIFE_MAX_PERCENT,
            levelSetting: 'weapon_refine',
            title: 'talent_name.weapon_finale_of_the_deep_2',
            description: 'talent_descr.weapon_finale_of_the_deep_2',
            stats: [
                new StatTable('text_decimal', weaponPassiveTables.FinaleOfTheDeep.p5),
                new StatTable('text_percent_hp', percent(weaponPassiveTables.FinaleOfTheDeep.p4)),
            ],
        }),
    ],
    postEffects: [
        atkBuffPost,
    ],
    features: [
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'weapon_finale_of_the_deep_bonus',
            postEffect: atkBuffPost,
            format: 'decimal',
            digits: 1,
        }),
    ],
});
