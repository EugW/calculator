import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionNot } from "../../../classes/Condition/Not";
import { ConditionPartyWeapon } from "../../../classes/Condition/PartyWeapon";
import { StatTable } from "../../../classes/StatTable";
import { CHARACTER_MAX_POSSIBLE_HP } from "../../Constants";
import {
    atkCap,
    atkPerThousand,
    holderHpThreshold,
    hpPerStack,
    reactionBoostMultiplier,
} from "../../Weapon/Catalyst/HymnofTheMaelstrom";

const atkPerThousandTable = new StatTable('', atkPerThousand);
const atkCapTable = new StatTable('', atkCap);

class ConditionPartyWeaponHymnofTheMaelstrom extends ConditionPartyWeapon {
    getStats(settings) {
        const stats = super.getStats(settings);

        for (let i = 1; i <= this.getMaxNum(); ++i) {
            const level = Math.min(5, this.getLevel(settings, i));
            if (!level) continue;

            const mode = settings[this.getModeParamName(i)] || '-';
            const match = /^(hymn|triumph)_([123])$/.exec(mode);
            if (!match) continue;

            const hp = this.createStatCond(i).getValue(settings);
            const thousandsAboveThreshold = Math.max(0, hp - holderHpThreshold) / 1000;
            const stacks = parseInt(match[2]);
            const modeMultiplier = match[1] === 'triumph' ? reactionBoostMultiplier : 1;
            const atkPerStack = Math.min(
                atkCapTable.getValue(level),
                thousandsAboveThreshold * atkPerThousandTable.getValue(level),
            );
            stats.add('atk_percent', atkPerStack * stacks * modeMultiplier);
        }

        return stats;
    }
}

const partyModes = [
    {title: '-', value: '-', serializeId: 7, conditions: []},
    {title_str: 'talent_name.weapon_hymn_of_the_maelstrom_hymn_1', value: 'hymn_1', serializeId: 1, conditions: []},
    {title_str: 'talent_name.weapon_hymn_of_the_maelstrom_hymn_2', value: 'hymn_2', serializeId: 2, conditions: []},
    {title_str: 'talent_name.weapon_hymn_of_the_maelstrom_hymn_3', value: 'hymn_3', serializeId: 3, conditions: []},
    {title_str: 'talent_name.weapon_hymn_of_the_maelstrom_triumph_1', value: 'triumph_1', serializeId: 4, conditions: []},
    {title_str: 'talent_name.weapon_hymn_of_the_maelstrom_triumph_2', value: 'triumph_2', serializeId: 5, conditions: []},
    {title_str: 'talent_name.weapon_hymn_of_the_maelstrom_triumph_3', value: 'triumph_3', serializeId: 6, conditions: []},
];

export const HymnofTheMaelstromPartyBuff = new ConditionPartyWeaponHymnofTheMaelstrom({
    name: 'weapon_other.weapon_hymn_of_the_maelstrom',
    serializeIds: [74],
    statName: 'weapon_hymn_of_the_maelstrom_holder_hp',
    statSerializeIds: [75],
    statClass: 'inputs-6digit',
    partyStat: 'hp',
    statMax: CHARACTER_MAX_POSSIBLE_HP,
    modeName: 'weapon_other.weapon_hymn_of_the_maelstrom_mode',
    modeSerializeIds: [76],
    modeTitle: 'talent_name.weapon_hymn_of_the_maelstrom_mode',
    modeClass: 'medium-text',
    modeHideEmpty: true,
    modeDefaultValue: '-',
    modeValues: partyModes,
    title: 'weapon_name.hymn_of_the_maelstrom',
    statTitle: 'talent_name.weapon_hymn_of_the_maelstrom_holder_hp',
    description: 'talent_descr.weapon_hymn_of_the_maelstrom_party',
    icon: {
        rarity: 5,
        name: 'sprite-weapon-catalyst weapon-icon-catalyst-hymn-of-the-maelstrom',
    },
    stats: [
        new StatTable('text_percent_hp_hymn', hpPerStack),
        new StatTable('text_percent_atk_per_thousand', atkPerThousand),
        new StatTable('text_percent_atk_cap', atkCap),
    ],
    condition: new ConditionNot([
        new ConditionBooleanValue({
            cond: 'ge',
            value: 1,
            setting: 'weapon_hymn_of_the_maelstrom_stacks',
        }),
    ]),
});
