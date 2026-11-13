import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeaturePostEffectValue } from "../../../classes/Feature2/PostEffectValue";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsHPJadefall } from "../../../classes/PostEffect/Stats/HP/Jadefall";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, times } from "../../Params";

const weaponPost = new PostEffectStatsHPJadefall({
    // Game data: Weapon_Catalyst_Morax computes CurBuff from FIGHT_PROP_MAX_HP
    // (total) times HPConvertRatio (affix 114505), and
    // UNIQUE_Weapon_Catalyst_Morax_Buff writes Actor_*AddHurtDelta (no
    // "Extra"): premod. GO reads input.total.hp and writes the bonus under
    // premod (its comment guesses a premod read, left as total for formatting).
    // KQM has no chain test for this weapon. Declared reads: TOTAL, writes:
    // PREMOD. No ability writes extra HP, so the total read changes no number
    // today.
    reads: CHANNELS.TOTAL,
    writes: CHANNELS.PREMOD,
    levelSetting: 'weapon_refine',
    percent: new StatTable('dmg_value', percent(times(weaponPassiveTables.JadefallsSplendor.p1, 0.001))),
    statCap: new StatTable('', percent(weaponPassiveTables.JadefallsSplendor.p2)),
    conditions: [
        new ConditionBoolean({name: 'weapon_jadefalls_splendor'}),
    ],
});

export const JadefallsSplendor = new DbObjectWeapon({
    name: 'jadefalls_splendor',
    serializeId: 144,
    gameId: 14505,
    iconClass: "weapon-icon-catalyst-jadefalls-splendor",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.JadefallsSplendor,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_jadefalls_splendor',
            serializeId: 1,
            title: 'talent_name.weapon_jadefalls_splendor',
            description: 'talent_descr.weapon_jadefalls_splendor',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.JadefallsSplendor.p1)),
                new StatTable('text_percent_max', percent(weaponPassiveTables.JadefallsSplendor.p2)),
            ],
        }),
    ],
    postEffects: [
        weaponPost,
    ],
    features: [
        // Display of the classified post-effect above: no stat read of its own.
        new FeaturePostEffectValue({
            category: 'weapon',
            name: 'dmg_bonus',
            postEffect: weaponPost,
            format: 'percent',
        }),
    ],
});
