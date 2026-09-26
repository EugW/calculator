import { Condition } from "../../classes/Condition";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionArchaic } from "../../classes/Condition/Archaic";
import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionBooleanDropdownValue } from "../../classes/Condition/Boolean/DropdownValue";
import { ConditionBooleanNightSoul } from "../../classes/Condition/Boolean/NightSoul";
import { ConditionBooleanPiecesCount } from "../../classes/Condition/Boolean/PiecesCount";
import { ConditionDropdownElement } from "../../classes/Condition/Dropdown/Element";
import { ConditionHexereiResonance } from "../../classes/Condition/HexereiResonance";
import { ConditionNot } from "../../classes/Condition/Not";
import { ConditionNumber } from "../../classes/Condition/Number";
import { ConditionOr } from "../../classes/Condition/Or";
import { ConditionStaticLevel } from "../../classes/Condition/Static/Level";
import { ConditionWitchHomework } from "../../classes/Condition/WitchHomework";
import { DbObjectBuff } from "../../classes/DbObject/Buff";
import { FeatureMultiplier } from "../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../classes/StatTable";
import { ValueTable } from "../../classes/ValueTable";

const CELESTIAL_GIFT_ELEMENTS = [
    {value: 'cryo', serializeId: 1},
    {value: 'electro', serializeId: 2},
    {value: 'hydro', serializeId: 3},
    {value: 'pyro', serializeId: 4},
    {value: 'geo', serializeId: 5},
    {value: 'anemo', serializeId: 6},
    {value: 'dendro', serializeId: 7},
];

const celestialGiftSelfElementActive = (element) => new ConditionAnd([
    new ConditionBoolean({name: 'set.celestial_gift_4'}),
    new ConditionBooleanPiecesCount({
        setName: 'CelestialGift',
        count: 4,
    }),
    new ConditionWitchHomework({}),
    new ConditionBooleanCharElement({element: [element]}),
]);

const celestialGiftElementValues = (bonus) => CELESTIAL_GIFT_ELEMENTS.map((item) => ({
    ...item,
    conditions: [
        new Condition({
            stats: {
                ['dmg_' + item.value]: bonus,
            },
            condition: new ConditionNot([
                celestialGiftSelfElementActive(item.value),
            ]),
        }),
    ],
}));

export const Artifacts = new DbObjectBuff({
    name: 'artifacts',
    conditions: [
        new ConditionBoolean({
            name: 'set_other.noblesse_oblige_4',
            serializeId: 7,
            rotation: 'buffs',
            title: 'set_bonus.noblesse_oblige_4',
            description: 'set_descr.noblesse_oblige_4',
            stats: {
                text_percent: 20,
            },
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-noblesse-oblige flower',
            },
        }),
        new Condition({
            stats: {
                atk_percent: 20,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.noblesse_oblige_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'NoblesseOblige',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.noblesse_oblige_4'}),
            ]),
        }),
        new ConditionDropdownElement({
            name: 'set_other.viridescent_venerer_4',
            serializeId: 8,
            rotation: 'buffs',
            multiple: true,
            hideEmpty: true,
            dropdownClass: 'select-element-multiple',
            title: 'set_bonus.viridescent_venerer_4',
            description: 'set_descr.viridescent_venerer_4_2',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-viridescent-venerer flower',
            },
            values: [
                {
                    value: 'cryo',
                    serializeId: 1,
                },
                {
                    value: 'electro',
                    serializeId: 2,
                },
                {
                    value: 'hydro',
                    serializeId: 3,
                },
                {
                    value: 'pyro',
                    serializeId: 4,
                },
            ],
        }),
        new ConditionBoolean({
            // Read the old checkbox so saved builds can migrate it to Cryo.
            name: 'set_other.viridescent_venerer_4_stellarswirl',
            serializeId: 72,
            isHidden: true,
        }),
        ...['pyro', 'hydro', 'electro', 'cryo'].map((elem) => {
            return new Condition({
                stats: {
                    ['enemy_res_'+ elem]: -40,
                },
                condition: new ConditionOr([
                    new ConditionAnd([
                        new ConditionBooleanDropdownValue({name: 'set.viridescent_venerer_4', value: elem}),
                        new ConditionBooleanCharElement({element: ['anemo']}),
                        new ConditionBooleanPiecesCount({
                            setName: 'ViridescentVenerer',
                            count: 4,
                        }),
                    ]),
                    new ConditionBooleanDropdownValue({name: 'set_other.viridescent_venerer_4', value: elem}),
                ]),
            });
        }),

        new ConditionDropdownElement({
            name: 'set_other.archaic_petra_4',
            serializeId: 9,
            rotation: 'buffs',
            title: 'set_bonus.archaic_petra_4',
            description: 'set_descr.archaic_petra_4',
            dropdownClass: 'select-element',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-archaic-petra flower',
            },
            values: [
                {
                    value: 'cryo',
                    serializeId: 1,
                },
                {
                    value: 'electro',
                    serializeId: 2,
                },
                {
                    value: 'hydro',
                    serializeId: 3,
                },
                {
                    value: 'pyro',
                    serializeId: 4,
                },
            ],
        }),
        new ConditionArchaic({
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set_bonus.archaic_petra_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'ArchaicPetra',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.archaic_petra_4'}),
            ]),
        }),
        new ConditionBoolean({
            name: 'set_other.instructor_4',
            serializeId: 10,
            rotation: 'buffs',
            title: 'set_bonus.instructor_4',
            description: 'set_descr.instructor_4',
            stats: {
                text_value: 120,
            },
            icon: {
                rarity: 4,
                name: 'sprite-artifact artifact-icon-instructor flower',
            },
        }),
        new Condition({
            stats: {
                mastery: 120,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.instructor_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'Instructor',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.instructor_4'}),
            ]),
        }),
        new ConditionBoolean({
            name: 'set_other.maiden_beloved_4',
            serializeId: 11,
            rotation: 'buffs',
            title: 'set_bonus.maiden_beloved_4',
            description: 'set_descr.maiden_beloved_4',
            stats: {
                text_percent: 20,
            },
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-maiden-beloved flower',
            },
        }),
        new Condition({
            stats: {
                healing_recv: 20,
                // healing_recv_party: 20,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.maiden_beloved_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'MaidenBeloved',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.maiden_beloved_4'}),
            ]),
        }),
        new ConditionBoolean({
            name: 'set_other.tenacity_of_the_millelith_4',
            serializeId: 12,
            rotation: 'buffs',
            title: 'set_bonus.tenacity_of_the_millelith_4',
            description: 'set_descr.tenacity_of_the_millelith_4',
            stats: {
                text_percent: 30,
                text_percent2: 20,
            },
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-tenacity-of-the-millelith flower',
            },
        }),
        new Condition({
            stats: {
                shield: 30,
                atk_percent: 20,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.tenacity_of_the_millelith_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'TenacityofMillelith',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.tenacity_of_the_millelith_4'}),
            ]),
        }),
        new ConditionBoolean({
            name: 'set_other.deepwood_memories_4',
            serializeId: 21,
            rotation: 'buffs',
            title: 'set_bonus.deepwood_memories_4',
            description: 'set_descr.deepwood_memories_4',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-deepwood-memories flower',
            },
            stats: {
                text_percent: 30,
            },
        }),
        new Condition({
            stats: {
                enemy_res_dendro: -30,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.deepwood_memories_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'DeepwoodMemories',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.deepwood_memories_4'}),
            ]),
        }),
        new ConditionNumber({
            name: 'party_days_past_healing_recorded',
            serializeId: 50,
            title: 'set_bonus.song_of_days_past_4_stack',
            class: "gi-inputs-5digit",
            rotation: 'buffs',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-song-of-days-past flower',
            },
            max: 15000,
        }),
        new ConditionBoolean({
            name: 'set_other.song_of_days_past_4',
            serializeId: 51,
            title: 'set_bonus.song_of_days_past_4',
            description: 'set_descr.song_of_days_past_4',
            rotation: 'buffs',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-song-of-days-past flower',
            },
            stats: {
                text_percent_dmg: 8,
                text_value_hp: 15000,
            },
        }),
        new ConditionBoolean({
            name: 'set_other.scroll_of_the_hero_of_cinder_city_4_1',
            serializeId: 53,
            title: 'set_bonus.scroll_of_the_hero_of_cinder_city_4',
            description: 'set_descr.scroll_of_the_hero_of_cinder_city_4_1',
            rotation: 'buffs',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-scroll-of-the-hero-of-cinder-city flower',
            },
            stats: {
                text_percent: 12,
            },
        }),
        new ConditionBoolean({
            name: 'set_other.scroll_of_the_hero_of_cinder_city_4_2',
            serializeId: 54,
            title: 'set_bonus.scroll_of_the_hero_of_cinder_city_4',
            description: 'set_descr.scroll_of_the_hero_of_cinder_city_4_2',
            rotation: 'buffs',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-scroll-of-the-hero-of-cinder-city flower',
            },
            stats: {
                text_percent: 28,
            },
        }),
        new Condition({
            stats: {
                dmg_anemo: 12,
                dmg_electro: 12,
                dmg_pyro: 12,
                dmg_cryo: 12,
                dmg_hydro: 12,
                dmg_geo: 12,
                dmg_dendro: 12,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.scroll_of_the_hero_of_cinder_city_4_1'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'ScrollOfTheEmberedCitysHero',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.scroll_of_the_hero_of_cinder_city_4_1'}),
            ]),
        }),
        new Condition({
            stats: {
                dmg_anemo: 28,
                dmg_electro: 28,
                dmg_pyro: 28,
                dmg_cryo: 28,
                dmg_hydro: 28,
                dmg_geo: 28,
                dmg_dendro: 28,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.scroll_of_the_hero_of_cinder_city_4_2'}),
                    new ConditionBooleanNightSoul(),
                    new ConditionBooleanPiecesCount({
                        setName: 'ScrollOfTheEmberedCitysHero',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.scroll_of_the_hero_of_cinder_city_4_2'}),
            ]),
        }),
        // Silken Moon's Serenade 4-piece: Gleaming Moon: Devotion (party EM buff + Lunar Reaction DMG)
        // EM scales with Moonsign level (60/120), Lunar DMG is always 10%
        new ConditionBoolean({
            name: 'set_other.silken_moons_serenade_4',
            serializeId: 60,
            rotation: 'buffs',
            title: 'set_bonus.silken_moons_serenade_4',
            description: 'set_descr.silken_moons_serenade_4_combined',
            stats: {
                text_em_nascent: 60,
                text_em_ascendant: 120,
                text_percent_lunar: 10,
            },
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-silken-moons-serenade flower',
            },
        }),
        // EM bonus based on Moonsign level (hidden from UI)
        new ConditionStaticLevel({
            isHidden: true,
            levelSetting: 'party_moonsign',
            fromZero: true,
            stats: [
                new StatTable('mastery', [0, 60, 120]),
            ],
            subConditions: [
                new ConditionOr([
                    new ConditionAnd([
                        new ConditionBoolean({name: 'set.silken_moons_serenade_4'}),
                        new ConditionBooleanPiecesCount({
                            setName: 'SilkenMoonsSerenade',
                            count: 4,
                        }),
                    ]),
                    new ConditionBoolean({name: 'set_other.silken_moons_serenade_4'}),
                ]),
            ],
        }),
        // Fixed 10% Lunar Reaction DMG bonus
        new Condition({
            stats: {
                dmg_reaction_lunar: 10,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.silken_moons_serenade_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'SilkenMoonsSerenade',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.silken_moons_serenade_4'}),
            ]),
        }),
        // Night of the Sky's Unveiling 4-piece: Gleaming Moon: Intent (party Lunar Reaction DMG)
        new ConditionBoolean({
            name: 'set_other.night_of_the_skys_unveiling_4',
            serializeId: 64,
            rotation: 'buffs',
            title: 'set_bonus.night_of_the_skys_unveiling_4',
            description: 'set_descr.night_of_the_skys_unveiling_4_party',
            stats: {
                text_percent_lunar: 10,
            },
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-night-of-the-skys-unveiling flower',
            },
        }),
        new Condition({
            stats: {
                dmg_reaction_lunar: 10,
            },
            condition: new ConditionOr([
                new ConditionAnd([
                    new ConditionBoolean({name: 'set.night_of_the_skys_unveiling_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'NightOfTheSkysUnveiling',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.night_of_the_skys_unveiling_4'}),
            ]),
        }),
        new ConditionDropdownElement({
            name: 'set_other.celestial_gift_4',
            serializeId: 68,
            rotation: 'buffs',
            title: 'set_bonus.celestial_gift_4',
            description: 'set_descr.celestial_gift_4_1',
            dropdownClass: 'select-element',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-celestial-gift flower',
            },
            values: celestialGiftElementValues(20),
            valueAliases: ['set_other.celestial_gift_4_hexerei'],
            linkedSettings: [
                {name: 'set_other.celestial_gift_4_hexerei'},
            ],
            condition: new ConditionNot([
                new ConditionHexereiResonance({}),
            ]),
            hideCondition: [
                new ConditionHexereiResonance({}),
            ],
        }),
        new ConditionDropdownElement({
            name: 'set_other.celestial_gift_4_hexerei',
            serializeId: 69,
            rotation: 'buffs',
            multiple: true,
            limit: 2,
            hideEmpty: true,
            dropdownClass: 'select-element-multiple',
            title: 'set_bonus.celestial_gift_4',
            description: 'set_descr.celestial_gift_4_2',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-celestial-gift flower',
            },
            values: celestialGiftElementValues(40),
            valueAliases: ['set_other.celestial_gift_4'],
            linkedSettings: [
                {name: 'set_other.celestial_gift_4', limit: 1},
            ],
            condition: new ConditionHexereiResonance({}),
            hideCondition: [
                new ConditionNot([
                    new ConditionHexereiResonance({}),
                ]),
            ],
        }),
        new ConditionBoolean({
            name: 'set_other.heart_of_the_furnace_4',
            serializeId: 73,
            rotation: 'buffs',
            title: 'set_bonus.heart_of_the_furnace_4',
            description: 'set_descr.heart_of_the_furnace_4',
            icon: {
                rarity: 5,
                name: 'sprite-artifact artifact-icon-heart-of-the-furnace flower',
            },
            stats: {
                dmg_stellarglimmer: 50,
            },
            subConditions: [
                new ConditionNot([
                    new ConditionBoolean({name: 'set.heart_of_the_furnace_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'HeartOfTheFurnace',
                        count: 4,
                    }),
                ]),
            ],
        }),
    ],
    postEffects: [],
    multipliers: [
        new FeatureMultiplier({
            source: 'artifacts',
            scaling: 'party_days_past_healing_recorded',
            values: new ValueTable([8]),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal', 'charged', 'plunge', 'skill', 'burst'],
            }),
            condition: new ConditionAnd([
                new ConditionNot([
                    new ConditionBoolean({name: 'set_bonus.song_of_days_past_4'}),
                    new ConditionBooleanPiecesCount({
                        setName: 'SongOfDaysPast',
                        count: 4,
                    }),
                ]),
                new ConditionBoolean({name: 'set_other.song_of_days_past_4'}),
            ]),
        }),
    ],
});
