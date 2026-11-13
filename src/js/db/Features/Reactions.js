import { ConditionBoolean } from "../../classes/Condition/Boolean";
import { ConditionBooleanCharElement } from "../../classes/Condition/Boolean/CharElement";
import { ConditionOr } from "../../classes/Condition/Or";
import { FeatureReactionSwirl } from "../../classes/Feature2/Reaction/Transformative/Swirl";
import { FeatureReactionElectroCharged } from "../../classes/Feature2/Reaction/Transformative/ElectroCharged";
import { FeatureReactionOverloaded } from "../../classes/Feature2/Reaction/Transformative/Overloaded";
import { FeatureReactionSuperConduct } from "../../classes/Feature2/Reaction/Transformative/SuperConduct";
import { FeatureReactionHyperBloom } from "../../classes/Feature2/Reaction/Transformative/HyperBloom";
import { FeatureReactionShattered } from "../../classes/Feature2/Reaction/Transformative/Shattered";
import { FeatureReactionBurning } from "../../classes/Feature2/Reaction/Transformative/Burning";
import { FeatureReactionHyperBurgeon } from "../../classes/Feature2/Reaction/Transformative/Burgeon";
import { FeatureReactionCrystallize } from "../../classes/Feature2/Reaction/Crystallize";
import { FeatureReactionRupture } from "../../classes/Feature2/Reaction/Transformative/Rupture";
import { ConditionAnd } from "../../classes/Condition/And";
import { ConditionNot } from "../../classes/Condition/Not";
import { FeatureReactionLunarCharged } from "../../classes/Feature2/Reaction/Transformative/Lunar/Charged";
import { FeatureReactionLunarCrystallize } from "../../classes/Feature2/Reaction/Transformative/Lunar/Crystallize";
import { FeatureReactionStellarSwirl } from "../../classes/Feature2/Reaction/Transformative/StellarSwirl";
import { FeatureReactionTeam } from "../../classes/Feature2/Reaction/Team";
import { ConditionStellarVortexLevel } from "../../classes/Condition/StellarVortexLevel";

const anemoReactionCond = new ConditionOr([
    new ConditionBooleanCharElement({element: ['anemo']}),
    new ConditionBoolean({name: 'allowed_infusion_anemo'}),
]);

export const stellarswirlCond = new ConditionAnd([
    new ConditionBoolean({name: 'allowed_stellarswirl'}),
    new ConditionOr([
        new ConditionBooleanCharElement({element: ['anemo', 'cryo']}),
        new ConditionBoolean({name: 'allowed_infusion_anemo'}),
        new ConditionBoolean({name: 'allowed_infusion_cryo'}),
    ]),
]);

const stellarswirlVortexLevel1Cond = new ConditionAnd([
    stellarswirlCond,
    new ConditionStellarVortexLevel({level: 1}),
]);

const stellarswirlVortexLevel2Cond = new ConditionAnd([
    stellarswirlCond,
    new ConditionStellarVortexLevel({level: 2}),
]);

export const lunarchargedCond = new ConditionAnd([
    new ConditionBoolean({name: 'allowed_lunarcharged'}),
    new ConditionOr([
        new ConditionBooleanCharElement({element: ['hydro', 'electro', 'anemo']}),
        new ConditionBoolean({name: 'allowed_infusion_hydro'}),
        new ConditionBoolean({name: 'allowed_infusion_anemo'}),
        new ConditionBoolean({name: 'allowed_infusion_electro'}),
    ]),
]);

export const lunarcrystallizeCond = new ConditionAnd([
    new ConditionBoolean({name: 'allowed_lunarcrystallize'}),
    new ConditionOr([
        new ConditionBooleanCharElement({element: ['hydro', 'geo', 'anemo']}),
        new ConditionBoolean({name: 'allowed_infusion_hydro'}),
        new ConditionBoolean({name: 'allowed_infusion_anemo'}),
        new ConditionBoolean({name: 'allowed_infusion_geo'}),
    ]),
]);

/**
 * The reactions a team deals together, each as one member deals it: what the
 * member contributes before the contributions are ranked (FeatureReactionTeam).
 * The rows with a fixed rank weight below are a member's contribution at that
 * rank, kept for saved rotations.
 */
const teamReaction = (name, optOut, unit) => new FeatureReactionTeam({name, optOut, unit});

export const Reactions = [
    new FeatureReactionSwirl({
        name: 'swirl_pyro',
        element: 'pyro',
        tags: ['swirl'],
        condition: anemoReactionCond,
    }),
    new FeatureReactionSwirl({
        name: 'swirl_hydro',
        cannotReact: true,
        element: 'hydro',
        tags: ['swirl'],
        condition: anemoReactionCond,
    }),
    new FeatureReactionSwirl({
        name: 'swirl_electro',
        element: 'electro',
        tags: ['swirl'],
        condition: anemoReactionCond,
    }),
    new FeatureReactionSwirl({
        name: 'swirl_cryo',
        element: 'cryo',
        tags: ['swirl'],
        reactionBonuses: ['dmg_reaction_swirl_cryo'],
        condition: new ConditionAnd([
            anemoReactionCond,
            new ConditionNot([stellarswirlCond]),
        ]),
    }),
    teamReaction('stellarswirl_anemo', 'no_stellarswirl_contribution', new FeatureReactionStellarSwirl({
        name: 'stellarswirl_anemo',
        element: 'anemo',
        reactionRate: 0.75,
        tags: ['stellarswirl_immediate', 'stellarswirl_trigger'],
        condition: stellarswirlCond,
    })),
    teamReaction('stellarswirl_vortex_1', 'no_stellarswirl_contribution', new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_1',
        element: 'cryo',
        reactionRate: 2,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_1'],
        condition: stellarswirlVortexLevel1Cond,
    })),
    teamReaction('stellarswirl_vortex_2', 'no_stellarswirl_contribution', new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_2',
        element: 'cryo',
        reactionRate: 3,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_2'],
        condition: stellarswirlVortexLevel2Cond,
    })),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_anemo_contribution',
        element: 'anemo',
        reactionRate: 0.75,
        penalty: 0.6,
        tags: ['stellarswirl_immediate', 'stellarswirl_trigger'],
        condition: stellarswirlCond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_anemo_contribution_2',
        element: 'anemo',
        reactionRate: 0.75,
        penalty: 0.3,
        tags: ['stellarswirl_immediate', 'stellarswirl_trigger'],
        condition: stellarswirlCond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_anemo_contribution_12',
        element: 'anemo',
        reactionRate: 0.75,
        penalty: 0.05,
        tags: ['stellarswirl_immediate', 'stellarswirl_trigger'],
        condition: stellarswirlCond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_1_contribution',
        element: 'cryo',
        reactionRate: 2,
        penalty: 0.6,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_1'],
        condition: stellarswirlVortexLevel1Cond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_1_contribution_2',
        element: 'cryo',
        reactionRate: 2,
        penalty: 0.3,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_1'],
        condition: stellarswirlVortexLevel1Cond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_1_contribution_12',
        element: 'cryo',
        reactionRate: 2,
        penalty: 0.05,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_1'],
        condition: stellarswirlVortexLevel1Cond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_2_contribution',
        element: 'cryo',
        reactionRate: 3,
        penalty: 0.6,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_2'],
        condition: stellarswirlVortexLevel2Cond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_2_contribution_2',
        element: 'cryo',
        reactionRate: 3,
        penalty: 0.3,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_2'],
        condition: stellarswirlVortexLevel2Cond,
    }),
    new FeatureReactionStellarSwirl({
        name: 'stellarswirl_vortex_2_contribution_12',
        element: 'cryo',
        reactionRate: 3,
        penalty: 0.05,
        tags: ['stellarswirl_vortex', 'stellarswirl_vortex_2'],
        condition: stellarswirlVortexLevel2Cond,
    }),
    new FeatureReactionBurning({
        name: 'burning',
        element: 'pyro',
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['pyro', 'anemo', 'dendro']}),
            new ConditionBoolean({name: 'allowed_infusion_pyro'}),
            new ConditionBoolean({name: 'allowed_infusion_anemo'}),
            new ConditionBoolean({name: 'allowed_infusion_dendro'}),
        ]),
    }),
    new FeatureReactionSuperConduct({
        name: 'superconduct',
        element: 'cryo',
        cannotReact: true,
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['cryo', 'electro', 'anemo']}),
            new ConditionBoolean({name: 'allowed_infusion_cryo'}),
            new ConditionBoolean({name: 'allowed_infusion_anemo'}),
            new ConditionBoolean({name: 'allowed_infusion_electro'}),
        ]),
    }),
    new FeatureReactionElectroCharged({
        name: 'electrocharged',
        element: 'electro',
        cannotReact: true,
        condition: new ConditionNot([lunarchargedCond]),
    }),
    teamReaction('lunarcharged', 'no_lunarcharged_contribution', new FeatureReactionLunarCharged({
        name: 'lunarcharged',
        element: 'electro',
        cannotReact: true,
        condition: lunarchargedCond,
    })),
    new FeatureReactionLunarCharged({
        name: 'lunarcharged_contrubution',
        element: 'electro',
        cannotReact: true,
        penalty: 0.6,
        condition: lunarchargedCond,
    }),
    new FeatureReactionLunarCharged({
        name: 'lunarcharged_contrubution_2',
        element: 'electro',
        cannotReact: true,
        penalty: 0.3,
        condition: lunarchargedCond,
    }),
    new FeatureReactionLunarCharged({
        name: 'lunarcharged_contrubution_12',
        element: 'electro',
        cannotReact: true,
        penalty: 0.05,
        condition: lunarchargedCond,
    }),
    teamReaction('lunarcrystallize', 'no_lunarcrystallize_contribution', new FeatureReactionLunarCrystallize({
        name: 'lunarcrystallize',
        element: 'geo',
        cannotReact: true,
        condition: lunarcrystallizeCond,
    })),
    new FeatureReactionLunarCrystallize({
        name: 'lunarcrystallize_contrubution',
        element: 'geo',
        cannotReact: true,
        penalty: 0.6,
        condition: lunarcrystallizeCond,
    }),
    new FeatureReactionLunarCrystallize({
        name: 'lunarcrystallize_contrubution_2',
        element: 'geo',
        cannotReact: true,
        penalty: 0.3,
        condition: lunarcrystallizeCond,
    }),
    new FeatureReactionLunarCrystallize({
        name: 'lunarcrystallize_contrubution_12',
        element: 'geo',
        cannotReact: true,
        penalty: 0.05,
        condition: lunarcrystallizeCond,
    }),
    new FeatureReactionOverloaded({
        name: 'overloaded',
        element: 'pyro',
        cannotReact: true,
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['pyro', 'electro', 'anemo']}),
            new ConditionBoolean({name: 'allowed_infusion_pyro'}),
            new ConditionBoolean({name: 'allowed_infusion_anemo'}),
            new ConditionBoolean({name: 'allowed_infusion_electro'}),
        ]),
    }),
    new FeatureReactionRupture({
        name: 'rupture',
        element: 'dendro',
        cannotReact: true,
        tags: ['bloom_reaction'],
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['hydro', 'dendro', 'anemo']}),
            new ConditionBoolean({name: 'allowed_infusion_hydro'}),
            new ConditionBoolean({name: 'allowed_infusion_dendro'}),
            new ConditionBoolean({name: 'allowed_infusion_anemo'}),
        ]),
    }),
    new FeatureReactionHyperBurgeon({
        name: 'burgeon',
        element: 'dendro',
        cannotReact: true,
        tags: ['bloom_reaction'],
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['pyro', 'anemo']}),
            new ConditionBoolean({name: 'allowed_infusion_pyro'}),
            new ConditionBoolean({name: 'allowed_infusion_anemo'}),
        ]),
    }),
    new FeatureReactionHyperBloom({
        name: 'hyperbloom',
        element: 'dendro',
        cannotReact: true,
        tags: ['bloom_reaction'],
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['electro', 'anemo']}),
            new ConditionBoolean({name: 'allowed_infusion_anemo'}),
            new ConditionBoolean({name: 'allowed_infusion_electro'}),
        ]),
    }),
    new FeatureReactionCrystallize({
        name: 'crystalize',
        category: 'reaction',
        element: 'shield',
        cannotReact: true,
        condition: new ConditionOr([
            new ConditionBooleanCharElement({element: ['geo']}),
            new ConditionBoolean({name: 'allowed_infusion_geo'}),
        ]),
    }),
    new FeatureReactionShattered({
        name: 'shatter',
        element: 'phys',
        cannotReact: true,
    }),
];
