import { ConditionBooleanDropdownValue } from "../../../classes/Condition/Boolean/DropdownValue";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { CHANNELS } from "../../../classes/PostEffect/Channels";
import { PostEffectStatsHP } from "../../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../../classes/StatTable";
import { StatTableConditions } from "../../../classes/StatTable/Condition";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent, plus } from "../../Params";

const tippleMode = new ConditionBooleanDropdownValue({
    name: 'weapon_hymn_of_the_maelstrom_mode',
    value: 'hymn',
    defaultValue: 'hymn',
});
const boostedMode = new ConditionBooleanDropdownValue({
    name: 'weapon_hymn_of_the_maelstrom_mode',
    value: 'triumph',
});
export const atkPerThousand = percent(weaponPassiveTables.HymnofTheMaelstrom.p3);
export const atkCap = percent(weaponPassiveTables.HymnofTheMaelstrom.p4);
export const hpPerStack = percent(weaponPassiveTables.HymnofTheMaelstrom.p1);
export const holderHpThreshold = weaponPassiveTables.HymnofTheMaelstrom.p2[0];
export const reactionBoostMultiplier = plus(1, weaponPassiveTables.HymnofTheMaelstrom.p8[0]);

function makeAtkPostEffect(stacks, mode, multiplier) {
    // Game data: Weapon_Catalyst_Bludnye (UNIQUE_Weapon_Catalyst_Bludnye_GrandHandler)
    // sets _ABILITY_Weapon_Bludnye_MaxHP from FIGHT_PROP_MAX_HP (total HP) on heal,
    // derives Weapon_Bludnye_AttackRatio from it above Weapon_Bludnye_MinHP 40000,
    // and the stack buffs write Actor_AttackRatio (no "Extra": premod ATK%).
    // GO has no entry for this weapon yet and KQM has no interaction test;
    // classified from the traced expression, as for Chevreuse's A4
    // (Actor_AttackRatio, premod) and Baizhu's A4 (FIGHT_PROP_MAX_HP, total).
    // Premod ATK readers (Flins, Ineffa, Sandrone, Nicole, Iansan) count it.
    return new PostEffectStatsHP({
        receivers: RECEIVERS.TEAM,
        reads: CHANNELS.TOTAL,
        writes: CHANNELS.PREMOD,
        stack: 'hymn_of_the_maelstrom',
        levelSetting: 'weapon_refine',
        exceed: holderHpThreshold,
        percent: new StatTable('atk_percent',
            atkPerThousand.map((value) => value / 1000 * stacks * multiplier)),
        statCap: new StatTable('', atkCap.map((value) => value * stacks * multiplier)),
        conditions: [
            new ConditionBooleanValue({
                cond: 'eq',
                value: stacks,
                setting: 'weapon_hymn_of_the_maelstrom_stacks',
            }),
            new ConditionBooleanDropdownValue({
                name: 'weapon_hymn_of_the_maelstrom_mode',
                value: mode,
                defaultValue: 'hymn',
            }),
        ],
    });
}

const atkPostEffects = [];
for (const stacks of [1, 2, 3]) {
    atkPostEffects.push(makeAtkPostEffect(stacks, 'hymn', 1));
    atkPostEffects.push(makeAtkPostEffect(stacks, 'triumph', reactionBoostMultiplier));
}

export const HymnofTheMaelstrom = new DbObjectWeapon({
    name: 'hymn_of_the_maelstrom',
    serializeId: 262,
    gameId: 14524,
    iconClass: 'weapon-icon-catalyst-hymn-of-the-maelstrom',
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.HymnofTheMaelstrom,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_hymn_of_the_maelstrom',
            description: 'talent_descr.weapon_hymn_of_the_maelstrom_base',
            stats: [
                new StatTable('healing', weaponPassiveTables.HymnofTheMaelstrom.healing),
                new StatTable('text_percent_hp_hymn', hpPerStack),
                new StatTable('text_percent_atk_per_thousand', atkPerThousand),
                new StatTable('text_percent_atk_cap', atkCap),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_hymn_of_the_maelstrom_mode',
            serializeId: 1,
            title: 'talent_name.weapon_hymn_of_the_maelstrom_mode',
            defaultValue: 'hymn',
            values: [
                {
                    title_str: 'talent_name.weapon_hymn_of_the_maelstrom_hymn',
                    value: 'hymn',
                    serializeId: 1,
                    conditions: [],
                },
                {
                    title_str: 'talent_name.weapon_hymn_of_the_maelstrom_triumph',
                    value: 'triumph',
                    serializeId: 2,
                    conditions: [],
                },
            ],
        }),
        new ConditionStacks({
            name: 'weapon_hymn_of_the_maelstrom_stacks',
            serializeId: 2,
            title: 'talent_name.weapon_hymn_of_the_maelstrom_stacks',
            description: 'talent_descr.weapon_hymn_of_the_maelstrom_stacks',
            maxStacks: weaponPassiveTables.HymnofTheMaelstrom.p6[0],
            levelSetting: 'weapon_refine',
            stats: [
                // Game data: Weapon_Bludnye_Buff_WeakN / _StrongN write
                // Actor_MaxHPRatio (premod, no Extra). Conditions write premod:
                // default confirmed, no params (as for Furina's C2 HP%).
                new StatTableConditions('hp_percent', hpPerStack, [tippleMode]),
                new StatTableConditions('hp_percent',
                    hpPerStack.map((value) => value * reactionBoostMultiplier),
                    [boostedMode]),
            ],
        }),
    ],
    postEffects: atkPostEffects,
});
