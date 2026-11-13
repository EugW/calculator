
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

const weaponPost = new PostEffectStatsMastery({
    // Desert Pavilion (self): ATK from own EM.
    // Game data: Weapon_Claymore_Pleroma Claymore_Pleroma_Buff_Self writes
    // Actor_AttackExtraDelta (extra) from MasteryCache x MasteryTransformRatio
    // (24%/30%/36%/42%/48%, affix 1124150-4), where MasteryCache is
    // FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY (premod) via
    // UNIQUE_Claymore_Pleroma_Handler; extra_scan: NONEXTRA_ELEMENT_MASTERY
    // read, Actor_AttackExtraDelta write. GO reads input.premod.eleMas into
    // total.atk. KQM has no direct Makhaira interaction test; the sister
    // Pleroma weapon Xiphos does not affect Raiden A4 / Emblem (premod
    // readers). Default premod read and extra write confirmed, no params.
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', weaponPassiveTables.MakhairaAquamarine.p2),
    conditions: [
        new ConditionBoolean({name: 'weapon_desert_pavilion'}),
    ],
});

// Desert Pavilion: nearby party members gain 30% of the wielder's buff,
// scaling on the wielder's EM. Multiple instances can stack: no key. Same
// priority as the old party post-effect (default).
// Game data: Weapon_Claymore_Pleroma Claymore_Pleroma_Buff_Other writes
// Actor_AttackExtraDelta (extra) from MasteryCache x MasteryTransformRatio x
// TeamInheritRatio (0.3, affix 1124150-4), same premod MasteryCache as the
// self buff above. GO: 30% of the premod-EM self buff into total.atk.
// Default premod read and extra write confirmed, no params.
const partyPost = new PostEffectStatsMastery({
    receivers: RECEIVERS.OTHERS,
    levelSetting: 'weapon_refine',
    percent: new StatTable('atk', times(weaponPassiveTables.MakhairaAquamarine.p2, weaponPassiveTables.MakhairaAquamarine.p4)),
    conditions: [
        new ConditionBoolean({name: 'weapon_desert_pavilion'}),
    ],
});

export const MakhairaAquamarine = new DbObjectWeapon({
    name: 'makhaira_aquamarine',
    serializeId: 136,
    gameId: 12415,
    iconClass: "weapon-icon-claymore-makhaira-aquamarine",
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.MakhairaAquamarine,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_desert_pavilion',
            serializeId: 1,
            title: 'talent_name.desert_pavilion',
            description: 'talent_descr.desert_pavilion',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.MakhairaAquamarine.p2)),
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
            // Party-bonus display (30% of the self buff): same premod EM read
            // as partyPost above (game: TeamInheritRatio 0.3); display only,
            // not in postEffects. Default confirmed, no params.
            postEffect: new PostEffectStatsMastery({
                levelSetting: 'weapon_refine',
                percent: new StatTable('atk', times(weaponPassiveTables.MakhairaAquamarine.p2, weaponPassiveTables.MakhairaAquamarine.p4)),
            }),
            digits: 1,
        }),
    ],
});

