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
import { percent, times } from "../../Params";

let bonusTable = percent(times(weaponPassiveTables.FlowingPurity.p4, 0.001));
let elementalBase = percent(weaponPassiveTables.FlowingPurity.p1);
let elementalBonus = percent(weaponPassiveTables.FlowingPurity.p5);

// BoL-cleared Elemental DMG% (PostEffectStatsBondOfLife, 0.2% R1 per cleared
// HP unit, cap 12% R1): the game (Weapon_Catalyst_Vorpal in
// ConfigAbility_Weapon_Catalyst.json) grants the Bond with AddHPDebts value
// [Debts, FIGHT_PROP_MAX_HP, MUL] (FIGHT_PROP_MAX_HP is the total marker,
// md/buff_chains.md; affix 114425 R1 Debts 0.24 = 24% of Max HP), then the
// HPDebtsMixin sets Attack = TotalDebts (GetHPPaidDebts) * Ratio2 * 0.001
// (R1 Ratio2 0.02: 1000 HP -> 2%) capped at MaxAttack (R1 0.12 = 12%), and
// UNIQUE_Catalyst_Vorpal_Buff2 writes plain Actor_*AddHurtDelta (no "Extra":
// a premod DMG% write, as Citlali C6). GO
// (Weapons/Catalyst/FlowingPurity) reads input.total.hp and writes both DMG%
// parts under premod:. KQM TCL lists the weapon text with no buff-chain test.
// Declared reads: TOTAL (explicit total read, same number as premod while no
// ability writes extra HP) and writes: PREMOD.
const weaponPost = new PostEffectStatsBondOfLife({
    reads: CHANNELS.TOTAL,
    writes: CHANNELS.PREMOD,
    levelSetting: 'weapon_refine',
    bolSettingName: 'weapon_flowing_purity_bol',
    percent: [
        new StatTable('dmg_anemo', bonusTable),
        new StatTable('dmg_geo', bonusTable),
        new StatTable('dmg_pyro', bonusTable),
        new StatTable('dmg_electro', bonusTable),
        new StatTable('dmg_hydro', bonusTable),
        new StatTable('dmg_cryo', bonusTable),
        new StatTable('dmg_dendro', bonusTable),
    ],
    statCap: new StatTable('', elementalBonus),
    conditions: [
        new ConditionBoolean({name: 'weapon_flowing_purity_bol'}),
    ],
});

export const FlowingPurity = new DbObjectWeapon({
    name: 'flowing_purity',
    serializeId: 154,
    gameId: 14425,
    iconClass: 'weapon-icon-catalyst-flowing-purity',
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.FlowingPurity,
    conditions: [
        // Flat Elemental DMG% on skill (8% R1, ConditionBooleanRefine): the
        // game (Weapon_Catalyst_Vorpal UNIQUE_Catalyst_Vorpal_Buff1) writes
        // plain Actor_*AddHurtDelta = Rate1 (no "Extra"): premod. Flat
        // conditions are premod by construction, no params. GO writes it
        // under premod: as well.
        new ConditionBooleanRefine({
            name: 'weapon_flowing_purity_1',
            serializeId: 1,
            title: 'talent_name.weapon_flowing_purity_1',
            description: 'talent_descr.weapon_flowing_purity_1',
            stats: [
                new StatTable('dmg_anemo', elementalBase),
                new StatTable('dmg_geo', elementalBase),
                new StatTable('dmg_pyro', elementalBase),
                new StatTable('dmg_electro', elementalBase),
                new StatTable('dmg_hydro', elementalBase),
                new StatTable('dmg_cryo', elementalBase),
                new StatTable('dmg_dendro', elementalBase),
            ],
        }),
        // Bond-of-Life amount entry (display text_* only, no attribute read
        // or write): needs nothing.
        new ConditionNumberLevels({
            name: 'weapon_flowing_purity_bol',
            serializeId: 2,
            max: BOND_OF_LIFE_MAX_PERCENT,
            levelSetting: 'weapon_refine',
            title: 'talent_name.weapon_flowing_purity_2',
            description: 'talent_descr.weapon_flowing_purity_2',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.FlowingPurity.p4)),
                new StatTable('text_value_hp', [1000]),
                new StatTable('text_percent_max', elementalBonus),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        // Display of the BoL-cleared bonus above (FeaturePostEffectValue):
        // shows the post-effect's value, needs nothing.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'weapon_finale_of_the_deep_bonus',
            postEffect: weaponPost,
            format: 'percent',
            digits: 2,
        }),
    ],
});
