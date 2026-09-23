import { ConditionBooleanDropdownValue } from "../../../classes/Condition/Boolean/DropdownValue";
import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { PostEffectStatsHP } from "../../../classes/PostEffect/Stats/HP";
import { StatTable } from "../../../classes/StatTable";
import { StatTableConditions } from "../../../classes/StatTable/Condition";
import { weaponStatTables } from "../../generated/WeaponStatTables";

const tippleMode = new ConditionBooleanDropdownValue({
    name: 'weapon_hymn_of_the_maelstrom_mode',
    value: 'hymn',
    defaultValue: 'hymn',
});
const boostedMode = new ConditionBooleanDropdownValue({
    name: 'weapon_hymn_of_the_maelstrom_mode',
    value: 'triumph',
});
export const atkPerThousand = [0.4, 0.5, 0.6, 0.7, 0.8];
export const atkCap = [8, 10, 12, 14, 16];
export const hpPerStack = [4, 5, 6, 7, 8];
export const holderHpThreshold = 40000;
export const reactionBoostMultiplier = 1.75;

function makeAtkPostEffect(stacks, mode, multiplier) {
    return new PostEffectStatsHP({
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
                new StatTable('healing', [4, 5, 6, 7, 8]),
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
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTableConditions('hp_percent', hpPerStack, [tippleMode]),
                new StatTableConditions('hp_percent',
                    hpPerStack.map((value) => value * reactionBoostMultiplier),
                    [boostedMode]),
            ],
        }),
    ],
    postEffects: atkPostEffects,
});
