import { ArtifactSet } from "../../../classes/ArtifactSet";
import { Condition } from "../../../classes/Condition";
import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanNightSoul } from "../../../classes/Condition/Boolean/NightSoul";
import { ConditionStatic } from "../../../classes/Condition/Static";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { artifactSetTables } from "../../generated/ArtifactSetTables";
import { percent } from "../../Params";

export const ScrollOfTheEmberedCitysHero = new ArtifactSet({
    serializeId: 52,
    goodId: 'ScrollOfTheHeroOfCinderCity',
    gameId: 15037,
	itemIds: [37412, 37413, 37422, 37423, 37432, 37433, 37442, 37443, 37452, 37453, 37513, 37514, 37523, 37524, 37533, 37534, 37543, 37544, 37553, 37554, 23741, 23742, 23743, 23744, 23745, 23746, 23747, 23748, 23749, 23750],
    name: "artifact_set.scroll_of_the_hero_of_cinder_city",
    iconClass: "artifact-icon-scroll-of-the-hero-of-cinder-city",
    minRarity: 4,
    maxRarity: 5,
    setBonus: [
        {},
        {
            conditions: [
                new ConditionStatic({
                    name: 'set.scroll_of_the_hero_of_cinder_city_2',
                    title: 'set_bonus.scroll_of_the_hero_of_cinder_city_2',
                    description: 'set_descr.scroll_of_the_hero_of_cinder_city_2',
                }),
            ],
        },
        {},
        {
            conditions: [
                new ConditionBoolean({
                    name: 'set.scroll_of_the_hero_of_cinder_city_4_1',
                    serializeId: 43,
                    title: 'set_bonus.scroll_of_the_hero_of_cinder_city_4',
                    description: 'set_descr.scroll_of_the_hero_of_cinder_city_4_1',
                    stats: {
                        text_percent: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    },
                }),
                new ConditionBoolean({
                    name: 'set.scroll_of_the_hero_of_cinder_city_4_2',
                    serializeId: 44,
                    title: 'set_bonus.scroll_of_the_hero_of_cinder_city_4',
                    description: 'set_descr.scroll_of_the_hero_of_cinder_city_4_2',
                    stats: {
                        text_percent: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    },
                    subConditions: [
                        new ConditionBooleanNightSoul(),
                    ],
                }),
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    stack: 'scroll_of_the_hero_of_cinder_city_4_1',
                    condition: new ConditionBoolean({name: 'set.scroll_of_the_hero_of_cinder_city_4_1'}),
                    stats: {
                    dmg_anemo: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    dmg_electro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    dmg_pyro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    dmg_cryo: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    dmg_hydro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    dmg_geo: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                    dmg_dendro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p1),
                },
                }),
                new Condition({
                    receivers: RECEIVERS.TEAM,
                    stack: 'scroll_of_the_hero_of_cinder_city_4_2',
                    condition: new ConditionAnd([
                    new ConditionBoolean({name: 'set.scroll_of_the_hero_of_cinder_city_4_2'}),
                    new ConditionBooleanNightSoul(),
                ]),
                    stats: {
                    dmg_anemo: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    dmg_electro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    dmg_pyro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    dmg_cryo: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    dmg_hydro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    dmg_geo: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                    dmg_dendro: percent(artifactSetTables.ScrollOfTheEmberedCitysHero.pc4.p3),
                },
                }),
            ],
        },
    ],
});

