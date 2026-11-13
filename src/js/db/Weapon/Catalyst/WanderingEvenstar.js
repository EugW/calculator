import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { PostEffectStatsMastery } from "../../../classes/PostEffect/Stats/Mastery";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

// Wildling Nightstar, self ATK from own EM.
// Game data: UNIQUE_Catalyst_Pleroma_Handler reads FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY
// (premod) into MasteryCache, and Catalyst_Pleroma_Buff_Self writes
// Actor_AttackExtraDelta (extra; affix 114416: 24/30/36/42/48% of EM as ATK).
// KQM Nahida: her A1 EM does not count for Wandering Evenstar. GO reads
// input.premod.eleMas into total atk. The default premod read and extra
// write are confirmed.
const weaponPost = new PostEffectStatsMastery({
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', weaponPassiveTables.WanderingEvenstar.p2),
    conditions: [
        new ConditionBoolean({name: 'weapon_desert_pavilion'}),
    ],
});

// Wildling Nightstar: nearby party members gain 30% of the wielder's buff,
// scaling on the wielder's EM. Multiple instances can stack: no key. Same
// priority as the old party post-effect (default).
// Game data: Catalyst_Pleroma_Buff_Self attaches Catalyst_Pleroma_Buff_Other
// to nearby AllPlayerAvatars, writing Actor_AttackExtraDelta (extra) of
// MasteryCache x MasteryTransformRatio x TeamInheritRatio (affix 114416:
// 0.30). GO applies it as a teamBuff under total atk. The default premod
// read and extra write are confirmed.
const partyPost = new PostEffectStatsMastery({
    receivers: RECEIVERS.OTHERS,
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', times(weaponPassiveTables.WanderingEvenstar.p2, weaponPassiveTables.WanderingEvenstar.p4)),
    conditions: [
        new ConditionBoolean({name: 'weapon_desert_pavilion'}),
    ],
});

export const WanderingEvenstar = new DbObjectWeapon({
    name: 'wandering_evenstar',
    serializeId: 137,
    gameId: 14416,
    iconClass: "weapon-icon-catalyst-wandering-evenstar",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.WanderingEvenstar,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_desert_pavilion',
            serializeId: 1,
            title: 'talent_name.wildling_nightstar',
            description: 'talent_descr.desert_pavilion',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.WanderingEvenstar.p2)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
        partyPost,
    ],
    features: [
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'atk_bonus',
            postEffect: weaponPost,
            digits: 1,
        }),
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'atk_bonus_bonus',
            postEffect: new PostEffectStatsMastery({
                levelSetting: 'weapon_refine',
                percent: new StatTable('atk', times(weaponPassiveTables.WanderingEvenstar.p2, weaponPassiveTables.WanderingEvenstar.p4)),
            }),
            digits: 1,
        }),
    ],
});

