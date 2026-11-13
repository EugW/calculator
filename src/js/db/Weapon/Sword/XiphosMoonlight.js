import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectStatsMastery } from "../../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { times } from "../../Params";

// Jinni's Whisper (self): ER from the wielder's EM. Game data:
// Weapon_Sword_Pleroma / UNIQUE_Sword_Pleroma_Handler reads
// FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod EM) into MasteryCache, and
// Sword_Pleroma_Buff_Self writes Actor_ChargeEfficiencyExtraDelta (extra ER)
// from MasteryCache x MasteryTransformRatio (refine R1-R5 0.036-0.072, per
// EquipAffixExcelConfigData id 111418, openConfig Weapon_Sword_Pleroma).
// KQM weapons evidence ("Xiphos and Raiden A4 Interactions"): its ER affects
// neither part of Raiden's A4 nor Emblem's Burst DMG bonus (premod ER
// readers). GO reads input.premod.eleMas and writes total.enerRech_.
// Default channels confirmed: premod read, extra write.
const weaponPost = new PostEffectStatsMastery({
    levelSetting: 'weapon_refine',
    percent: new StatTable('recharge', weaponPassiveTables.XiphosMoonlight.p2),
    conditions: [
        new ConditionBoolean({name: 'whisper_of_the_jinn'}),
    ],
});

// Jinni's Whisper: nearby party members gain 30% of the wielder's buff,
// scaling on the wielder's EM. Multiple instances can stack: no key. Same
// priority as the old party post-effect (default).
// Game data: Sword_Pleroma_Buff_Other writes Actor_ChargeEfficiencyExtraDelta
// (extra ER) from MasteryCache x MasteryTransformRatio x TeamInheritRatio
// (0.3, same affix entry as above); the read is the same premod EM as the
// self buff. KQM/GO as above. Default channels confirmed: premod read of the
// wielder's EM, extra write.
const partyPost = new PostEffectStatsMastery({
    receivers: RECEIVERS.OTHERS,
    levelSetting: 'weapon_refine',
    percent: new StatTable('recharge', times(weaponPassiveTables.XiphosMoonlight.p2, weaponPassiveTables.XiphosMoonlight.p4)),
    conditions: [
        new ConditionBoolean({name: 'whisper_of_the_jinn'}),
    ],
});

export const XiphosMoonlight = new DbObjectWeapon({
    name: 'xiphos_moonlight',
    serializeId: 134,
    gameId: 11418,
    iconClass: "weapon-icon-sword-xiphos-moonlight",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.XiphosMoonlight,
    conditions: [
        new ConditionBooleanRefine({
            name: 'whisper_of_the_jinn',
            serializeId: 1,
            title: 'talent_name.whisper_of_the_jinn',
            description: 'talent_descr.whisper_of_the_jinn',
            stats: [
                new StatTable('text_percent', weaponPassiveTables.XiphosMoonlight.p2),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
        partyPost,
    ],
    features: [
        // Display values read through the post-effects above (same premod EM
        // input); the party display copy has no toggle because it is never
        // applied, only shown. No channels to declare.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'recharge_bonus',
            postEffect: weaponPost,
            format: 'percent',
        }),
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'recharge_party_bonus',
            postEffect: new PostEffectStatsMastery({
                levelSetting: 'weapon_refine',
                percent: new StatTable('recharge', times(weaponPassiveTables.XiphosMoonlight.p2, weaponPassiveTables.XiphosMoonlight.p4)),
            }),
            format: 'percent',
        }),
    ],
});
