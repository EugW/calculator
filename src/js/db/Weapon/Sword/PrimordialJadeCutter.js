import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const atkBuff = new PostEffectStatsHP({
    // Game data: Weapon_Sword_Morax_HpToAtk (UNIQUE_Sword_Morax_HpToAtk_Buff)
    // writes Actor_AttackExtraDelta as [FIGHT_PROP_MAX_HP, HptoAtk_Factor,
    // MUL] (extra write = the default); FIGHT_PROP_MAX_HP is the total
    // read (md/buff_chains.md), as for Homa, Hu Tao, Baizhu and Candace.
    // Same number as a premod read while no ability writes extra HP. GO
    // reads input.premod.hp here (supporting evidence only; the data says
    // total). KQM weapons TCL lists the weapon with its description only;
    // no buff-chain interaction test.
    reads: CHANNELS.TOTAL,
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', weaponPassiveTables.PrimordialJadeCutter.p2),
});

export const PrimordialJadeCutter = new DbObjectWeapon({
    name: 'primordial_jade_cutter',
    serializeId: 14,
    gameId: 11505,
    iconClass: "weapon-icon-sword-primordial-jade-cutter",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.PrimordialJadeCutter,
    conditions: [
        // Flat HP% (and the text_percent display number): conditions are
        // always premod, which is right for ordinary percent buffs; needs
        // nothing. The HP% itself is FIGHT_PROP_HP_PERCENT in the affix
        // (EquipAffixExcelConfigData 111505, openConfig
        // Weapon_Sword_Morax_HpToAtk).
        new ConditionStaticRefine({
            title: 'talent_name.weapon_primordial_jade_cutter',
            description: 'talent_descr.weapon_primordial_jade_cutter',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.PrimordialJadeCutter.hp_percent),
                new StatTable('text_percent', percent(weaponPassiveTables.PrimordialJadeCutter.p2)),
            ],
        }),
    ],
    postEffects: [atkBuff],
    features: [
        // Displays atkBuff's value; reads no stat itself and needs nothing.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'atk_bonus',
            postEffect: atkBuff,
        }),
    ],
});
