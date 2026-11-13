import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const KeyofKhajNisut = new DbObjectWeapon({
    name: 'key_of_khaj_nisut',
    serializeId: 135,
    gameId: 11511,
    iconClass: "weapon-icon-sword-key-of-khaj-nisut",
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.KeyofKhajNisut,
    conditions: [
        // Sunken Song of the Sands HP (affix 111511 addProps
        // FIGHT_PROP_HP_PERCENT, 20-40%): a flat condition, always premod,
        // needs nothing (GO premod.hp_). The Grand Hymn text_percent stacks
        // below are display values on a stacks condition, no stat read.
        new ConditionStaticRefine({
            title: 'talent_name.sunken_song_of_the_sands',
            description: 'talent_descr.sunken_song_of_the_sands_1',
            stats: [
                new StatTable('hp_percent', weaponPassiveTables.KeyofKhajNisut.hp_percent),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_key_of_khaj_nisut',
            serializeId: 1,
            title: 'talent_name.sunken_song_of_the_sands',
            description: 'talent_descr.sunken_song_of_the_sands_2',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.KeyofKhajNisut.p2)),
            ],
        }),
        new ConditionStaticRefine({
            title: 'talent_name.sunken_song_of_the_sands',
            description: 'talent_descr.sunken_song_of_the_sands_3',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.KeyofKhajNisut.p5)),
            ],
            subConditions: [
                new ConditionBooleanValue({
                    cond: 'ge',
                    value: 3,
                    setting: 'weapon_key_of_khaj_nisut',
                }),
            ],
        }),
    ],
    postEffects: [
        new PostEffectStatsHP({
            // Game data: UNIQUE_Sword_Deshret_Stack_MasteryUp properties
            // Actor_ElemMasteryExtraDelta = [FIGHT_PROP_MAX_HP,
            // MaxHPTransformRatio, MUL, Stack, MUL] (total HP read, extra EM
            // write, the default). FIGHT_PROP_MAX_HP is the total marker
            // (md/buff_chains.md), as for Hu Tao/Baizhu/Candace/Chevreuse/
            // Vodyanitsa; the same number as premod while no ability writes
            // extra HP. Declared reads: TOTAL. GO reads input.total.hp and
            // writes total.eleMas. Game formula R1: 0.12% of Max HP per
            // Grand Hymn stack (affix 111511 paramList[1]).
            reads: CHANNELS.TOTAL,
            stacksSetting: 'weapon_key_of_khaj_nisut',
            percent: new StatTable('mastery', weaponPassiveTables.KeyofKhajNisut.p2),
            conditions: [
                new ConditionBoolean({name: 'weapon_key_of_khaj_nisut'}),
            ],
        }),
        // Sunken Song of the Sands: all nearby party members gain EM
        // scaling on the wielder's max HP when Grand Hymn reaches 3 stacks.
        // It does not stack between wielders: the modifier is unique and
        // removed from AllPlayerAvatars before each re-application (the
        // released row had three serialize IDs but showed one Key,
        // maxDisplay: 1). Same priority as the old party post-effect
        // (default).
        // Game data: UNIQUE_Sword_Deshret_MasteryUp_Team properties
        // Actor_ElemMasteryExtraDelta = [FIGHT_PROP_MAX_HP,
        // MaxHPTransformRatioForTeam, MUL] (total HP read, extra EM write,
        // the default). Declared reads: TOTAL. GO reads input.total.hp and
        // writes teamBuff.total.eleMas. KQM: neither this party EM nor the
        // self stacks count for Kazuha's A4 or Nahida's A1 (weapons and
        // Nahida evidence). Game formula R1: 0.2% of the wielder's Max HP
        // (affix 111511 paramList[4]); both parts reach the wielder.
        new PostEffectStatsHP({
            receivers: RECEIVERS.TEAM,
            stack: 'key_of_khaj_nisut',
            reads: CHANNELS.TOTAL,
            levelSetting: 'weapon_refine',
            percent: new StatTable('mastery', weaponPassiveTables.KeyofKhajNisut.p5),
            conditions: [
                new ConditionBooleanValue({
                    cond: 'ge',
                    value: 3,
                    setting: 'weapon_key_of_khaj_nisut',
                }),
            ],
        }),
    ],
});
