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

const hymnMode = new ConditionBooleanDropdownValue({
    name: 'weapon_bludnye_mode',
    value: 'hymn',
    defaultValue: 'hymn',
});
const triumphMode = new ConditionBooleanDropdownValue({
    name: 'weapon_bludnye_mode',
    value: 'triumph',
});
const atkPerThousand = [0.25, 0.325, 0.4, 0.475, 0.55];
const atkCap = [5, 6.5, 8, 9.5, 11];

function makeAtkPostEffect(stacks, mode, multiplier) {
    return new PostEffectStatsHP({
        levelSetting: 'weapon_refine',
        exceed: 40000,
        percent: new StatTable('atk_percent',
            atkPerThousand.map((value) => value / 1000 * stacks * multiplier)),
        statCap: new StatTable('', atkCap.map((value) => value * stacks * multiplier)),
        conditions: [
            new ConditionBooleanValue({
                cond: 'eq',
                value: stacks,
                setting: 'weapon_bludnye_stacks',
            }),
            new ConditionBooleanDropdownValue({
                name: 'weapon_bludnye_mode',
                value: mode,
                defaultValue: 'hymn',
            }),
        ],
    });
}

const atkPostEffects = [];
for (const stacks of [1, 2, 3]) {
    atkPostEffects.push(makeAtkPostEffect(stacks, 'hymn', 1));
    atkPostEffects.push(makeAtkPostEffect(stacks, 'triumph', 1.75));
}

export const Bludnye = new DbObjectWeapon({
    name: 'bludnye',
    serializeId: 262,
    gameId: 14524,
    iconClass: 'weapon-icon-catalyst-bludnye',
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.Bludnye,
    beta: true,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_bludnye',
            description: 'talent_descr.weapon_bludnye',
            stats: [
                new StatTable('healing', [8, 10, 12, 14, 16]),
                new StatTable('text_hp_hymn', [5, 6, 7, 8, 9]),
                new StatTable('text_atk_per_thousand', atkPerThousand),
                new StatTable('text_atk_cap', atkCap),
                new StatTable('text_hp_triumph', [8.75, 10.5, 12.25, 14, 15.75]),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_bludnye_mode',
            serializeId: 1,
            title: 'talent_name.weapon_bludnye_mode',
            defaultValue: 'hymn',
            values: [
                {
                    title_str: 'talent_name.weapon_bludnye_hymn',
                    value: 'hymn',
                    serializeId: 1,
                    conditions: [],
                },
                {
                    title_str: 'talent_name.weapon_bludnye_triumph',
                    value: 'triumph',
                    serializeId: 2,
                    conditions: [],
                },
            ],
        }),
        new ConditionStacks({
            name: 'weapon_bludnye_stacks',
            serializeId: 2,
            title: 'talent_name.weapon_bludnye_stacks',
            description: 'talent_descr.weapon_bludnye_stacks',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTableConditions('hp_percent', [5, 6, 7, 8, 9], [hymnMode]),
                new StatTableConditions('hp_percent', [8.75, 10.5, 12.25, 14, 15.75], [triumphMode]),
            ],
        }),
    ],
    postEffects: atkPostEffects,
});
