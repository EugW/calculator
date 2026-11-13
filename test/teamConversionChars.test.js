import { DB } from "../src/js/db/DB";
import { characterConversionTests } from "./support/teamCharacterConversion";

/**
 * Nicole's Grace of Kenosis where it reaches Nicole herself: her own
 * post-effect, not a delivery to another member.
 */
function nicoleOwnGrace(effect) {
    const grace = DB.Chars.get('Nicole').getPostEffects()[0];
    return effect === grace || (effect.effect === grace && effect.slots.read === effect.slots.write);
}

/**
 * Characters whose party data moved into their own effects. Each row
 * replaces the recorded `<receiver>__with_<char>` party scenarios: the
 * character joins the receiver's team and switches on what the recorded
 * party settings switched on. Typed-in teammate stats become the
 * character's real totals (carrierTotals).
 */
const CONVERTED = [
    {
        char: 'Kazuha',
        constellation: 2,
        on: {
            kaedehara_kazuha_poetics_of_fuubutsu: 'cryo;electro;hydro;pyro',
            kaedehara_kazuha_yamaarashi_tailwind: true,
        },
        carrierTotals: {mastery_total: 800},
        ignoreStats: ['kazuha_mastery'],
    },
    {
        char: 'Bennet',
        constellation: 6,
        on: {bennet_fantastic_voyage: true},
        carrierTotals: {atk_base: 900},
        ignoreStats: ['bennet_atk_base', 'bennet_char_skill_burst', 'bonus_bennet_atk'],
        corrections: [
            {
                // C6: "Sword, Claymore, or Polearm-wielding characters inside
                // Fantastic Voyage's radius gain a 15% Pyro DMG Bonus". The old
                // party row gave it to every receiver.
                scenarios: ['Tartaglia__with_Bennet', 'Wanderer__with_Bennet'],
                stats: {dmg_pyro: 0},
            },
        ],
    },
    {
        char: 'Shenhe',
        constellation: 5,
        on: {
            shenhe_icy_quill: true,
            shenhe_spirit_field: true,
            shenhe_talisman_spirit: true,
            shenhe_spirit_seal_press: true,
            shenhe_spirit_seal_hold: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['shenhe_atk_total', 'shenhe_char_skill_elemental', 'shenhe_char_skill_burst'],
    },
    {
        // No party conditions left to record: the scenarios only carry the
        // carrier's burst energy cost.
        char: 'Chasca',
        constellation: 0,
        on: {},
    },
    {
        char: 'Kokomi',
        constellation: 0,
        on: {},
    },
    {
        char: 'Wanderer',
        constellation: 0,
        on: {},
    },
    {
        // Master of Weaponry: "Increases your own party members' Normal Attack
        // Level by 1." The own anonymous condition delivers it to the team.
        char: 'Tartaglia',
        constellation: 0,
        on: {},
    },
    {
        // Tides of Justice is description-only (text_percent_hp); the own C6
        // static already models it.
        char: 'TravelerHydro',
        constellation: 6,
        on: {},
    },
    {
        // More Foes, More Caution: "the active character within the field
        // gains 8%/12%/16%/20% increased DEF". Recorded receivers are on-field.
        char: 'Kachina',
        constellation: 4,
        on: {kachina_more_foes_more_caution: '4'},
    },
    {
        // Well-Versed, Well-Rehearsed: the hit opponent's Pyro RES decreases.
        char: 'Lyney',
        constellation: 4,
        on: {lyney_well_versed_well_rehearsed: true},
    },
    {
        // C4, off-field: "all of your own party members' ATK SPD will be
        // increased by 10%".
        char: 'Wriothesley',
        constellation: 4,
        on: {wriothesley_redemption_for_the_suffering_2: true},
    },
    {
        // Lakelight Top Note: opponents hit lose 30% Dendro RES.
        char: 'Emilie',
        constellation: 2,
        on: {emilie_lakelight_top_note: true},
    },
    {
        // With Drakefalcon's Blood-Pearls Adorned: "the Elemental Mastery of
        // all nearby party members increases by 60".
        char: 'LanYan',
        constellation: 4,
        on: {lanyan_with_drakefalcons_blood_pearls_adorned: true},
    },
    {
        // Static Electricity Field: "Opponents hit by Lightning Rose have
        // their DEF decreased by 15%".
        char: 'Lisa',
        constellation: 0,
        on: {lisa_static_electricity_field: true},
    },
    {
        // The Oathsworn Never Capitulate: the hit opponent's Geo RES drops.
        char: 'Navia',
        constellation: 4,
        on: {navia_the_oathsworn_never_capitulate: true},
    },
    {
        // Beneficent Plumage: "all nearby party members gain 80 Elemental
        // Mastery".
        char: 'Sethos',
        constellation: 4,
        on: {sethos_beneficent_plumage: true},
    },
    {
        // Mutual Weapons Mentorship: "your own party members' Elemental Skill
        // Level is increased by 1" when the team is all Hydro/Cryo with at
        // least one of each. The party check reads the source scope.
        char: 'Skirk',
        constellation: 0,
        on: {skirk_mutual_weapons_mentorship: true},
    },
    {
        // Invincible Stonewall: "Party members within the radius of Wake of
        // Earth have their CRIT Rate increased by 10%".
        char: 'TravelerGeo',
        constellation: 1,
        on: {traveler_invincible_stonewall: true},
    },
    {
        // Rainbow Upon the Azure Sky: opponents hit lose 15% Hydro RES.
        char: 'Xingqiu',
        constellation: 2,
        on: {xingqiu_rainbow_upon_the_azure_sky: true},
    },
    {
        // Adeptus' Tutelage: "active characters within their AoE will gain
        // 15% Dendro DMG Bonus". Recorded receivers are on-field.
        char: 'Yaoyao',
        constellation: 1,
        on: {yaoyao_adeptus_tutelage: true},
    },
    {
        // Penetrative Reasoning: "increases all party members' (excluding
        // Shikanoin Heizou) Elemental Mastery by 80".
        char: 'Heizou',
        constellation: 0,
        on: {shikanoin_heizou_penetrative_reasoning: true},
    },
    {
        // Jailhouse Bread and Butter: "all nearby party members gain 20% DEF
        // and 20% ATK".
        char: 'Itto',
        constellation: 4,
        on: {itto_jailhouse_bread_and_butter: true},
    },
    {
        // Ode to Deep Springs: "your current active character's ATK is
        // increased by 10%", up to 3 stacks. Recorded receivers are on-field.
        char: 'Ororon',
        constellation: 6,
        on: {ororon_ode_to_deep_springs: 3},
    },
    {
        // Wildfire: "Fiery Rain increases all party members' Movement SPD
        // by 15% and ATK by 15%".
        char: 'Amber',
        constellation: 6,
        on: {amber_wildfire: true},
    },
    {
        // Glorious Season: stamina reduction for characters within the Melody
        // Loop; Vitality Burst: "your active character gains a 15% Hydro DMG
        // Bonus". Recorded receivers are on-field.
        char: 'Barbara',
        constellation: 2,
        on: {barbara_glorious_season: true, barbara_vitality_burst: true},
    },
    {
        // Bane of Evil: nearby opponents lose Electro RES; Radiance
        // Stellar-Conduct: nearby opponents lose Cryo RES and "the current
        // active character" gains 200 Mastery. Recorded receivers are
        // on-field.
        char: 'Beidou',
        constellation: 6,
        on: {beidou_bane_of_the_evil: true, beidou_radiance_stellarconduct: true},
    },
    {
        // Steady Breathing: "Sword, Claymore, or Polearm-wielding characters
        // within the field". The old party row gave the ATK SPD to every
        // receiver.
        char: 'Chongyun',
        constellation: 2,
        on: {chongyun_frost_field: true, chongyun_rimechaser_blade: true},
        corrections: [
            {
                // Steady Breathing and Layered Frost affect Sword, Claymore
                // or Polearm wielders only.
                scenarios: ['Tartaglia__with_Chongyun', 'Wanderer__with_Chongyun'],
                stats: {atk_speed_normal: 0},
            },
            {
                // Layered Frost grants infusion only to "Sword, Claymore and
                // Polearm-wielding characters". The old party model infused
                // Tartaglia's physical bow attacks too. With that corrected,
                // his damage matches the recorded uninfused scenario: these
                // attacks receive neither the melee-only speed nor Cryo RES
                // benefits. Every feature is still compared with recorded data.
                scenarios: ['Tartaglia__with_Chongyun'],
                featuresFrom: 'Tartaglia__none',
            },
        ],
    },
    {
        // Cat's Tail Closing Time: Signature Mix's radius and the HP range
        // are assumed by separate toggles; HP itself is not simulated. The
        // low-HP healing mode stays off.
        char: 'Diona',
        constellation: 6,
        on: {
            diona_secret_menu: true,
            diona_cats_tail_mastery: true,
            diona_cats_tail_radiance: true,
            diona_radiance_stellarconduct: true,
        },
    },
    {
        // Icewhirl Brand: opponents' Physical and Cryo RES decrease with
        // the source's own burst level.
        char: 'Eula',
        constellation: 5,
        on: {eula_icewhirl_brand: true},
        ignoreStats: ['eula_char_skill_elemental'],
    },
    {
        // Harmony: Celestial Shower grants Cryo DMG to active members in
        // its AoE (recorded receivers are on-field); Dew-Drinker: Cryo RES
        // shred; Westward Sojourn: opponents take increased DMG.
        char: 'Ganyu',
        constellation: 4,
        on: {
            ganyu_harmony: true,
            ganyu_dew_drinker: true,
            ganyu_westward_sojourn: 5,
        },
    },
    {
        // Strategic Reserve: a character passing through the Jade Screen;
        // Exquisite be the Jade: nearby characters' Elemental RES.
        char: 'Ningguang',
        constellation: 4,
        on: {
            ningguang_strategic_reserve: true,
            ningguang_exquisite_be_the_jade_outshining_all_beneath: true,
        },
    },
    {
        // Shadow Samaritan: CRIT Rate of all nearby party members (except
        // Rosaria herself) by 15% of Rosaria's CRIT Rate; Divine
        // Retribution: opponents lose Physical RES.
        char: 'Rosaria',
        constellation: 6,
        on: {
            rosaria_shadow_samaritan: true,
            rosaria_divine_retribution: true,
        },
        carrierTotals: {crit_rate_total: 60},
        ignoreStats: ['rosaria_crit_rate_total'],
    },
    {
        // Summer Night's Dawn: nearby party members (not including Yoimiya)
        // gain ATK, plus 1% per Tricks of the Trouble-Maker stack.
        char: 'Yoimiya',
        constellation: 0,
        on: {
            yoimiya_summer_nights_dawn: true,
            yoimiya_summer_nights_dawn_stacks: 10,
        },
    },
    {
        // Bloomwater Blades: Normal Attack DMG of characters within the
        // garden; Endless Flow: all nearby party members' Normal Attack
        // SPD. The burst level comes from the source's own talents.
        char: 'Ayato',
        constellation: 5,
        on: {
            ayato_bloomwater_blades: true,
            kamisato_ayato_endless_flow: true,
        },
        ignoreStats: ['ayato_char_skill_burst'],
    },
    {
        // Adapt With Ease: your own active character deals more DMG, up to
        // 50%. Recorded receivers are on-field. Bait-and-Switch: all party
        // members' Max HP.
        char: 'Yelan',
        constellation: 4,
        on: {
            yelan_adapt_with_ease: 15,
            yelan_bait_and_switch: 4,
        },
    },
    {
        // Gift of the Woods: all nearby characters' Elemental Mastery
        // (not including Collei herself).
        char: 'Collei',
        constellation: 4,
        on: {collei_gift_of_the_woods: true},
    },
    {
        // Discretionary Supplement: the Jinni-connected character gains
        // Incoming Healing Bonus (HP below 50%) and Energy Recharge
        // (Energy below 50%) as separate assumed effects.
        char: 'Dori',
        constellation: 4,
        on: {
            dori_discretionary_supplement_1: true,
            dori_discretionary_supplement_2: true,
        },
    },
    {
        // Sophisticated Synergy: all party members' ATK by element count.
        // The level comes from the source's own team composition.
        char: 'Lynette',
        constellation: 0,
        on: {lynette_sophisticated_synergy: true},
    },
    {
        // Burning Heart: DMG of all party members' Normal, Charged, and
        // Plunging Attacks.
        char: 'Thoma',
        constellation: 6,
        on: {thoma_burning_heart: true},
    },
    {
        // Grace/Guidance, C2, C4 and C6 reach the whole team; Arcane
        // Projections are delivered features at Nicole's burst level.
        char: 'Nicole',
        constellation: 6,
        on: {
            nicole_grace_of_kenosis: 'guidance',
            nicole_whether_left_or_right_no_matter_which_way_you_turn: true,
            nicole_witch_homework: true,
        },
        carrierTotals: {atk_total: 2000},
        ignoreStats: ['nicole_atk_total', 'nicole_char_skill_elemental', 'nicole_char_skill_burst'],
        // Nicole's own Grace of Kenosis read a missing stat and gave her 0
        // ATK, so the recorded typed-in total (her saved build's ATK) never
        // included it. Grace on Nicole herself is left out to reproduce that;
        // what she delivers is compared in full. The fix is checked in
        // teamNicoleDelivery.test.js.
        excludePostEffects: nicoleOwnGrace,
        corrections: [
            {
                // C2: Guidance of Theosis "decreases nearby opponents'
                // Elemental RES based on the corresponding character's
                // Elemental Type by 25%". Nicole holds Guidance too, so the
                // enemy's Pyro RES drops for every member. The old party row
                // shred only the receiver's element.
                scenarios: [
                    'Alhaitham__with_Nicole', 'Eula__with_Nicole', 'Itto__with_Nicole',
                    'Keqing__with_Nicole', 'Tartaglia__with_Nicole', 'Wanderer__with_Nicole',
                ],
                stats: {enemy_res_pyro: -0.25},
                // The enemy's (hilichurl) Pyro RES goes from 10% to -15%:
                // the RES multiplier goes from 0.9 to 1 + 0.15 / 2.
                featureFactors: {
                    'reaction.burning': 1.075 / 0.9,
                    'reaction.overloaded': 1.075 / 0.9,
                    'reaction.swirl_pyro': 1.075 / 0.9,
                },
            },
        ],
    },
];

characterConversionTests(CONVERTED);
