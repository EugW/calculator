from ..template import Template


# These mappings are consumed by import_weapons.py.  Descriptive suffixes keep
# calculator condition keys stable when one source passive is split into
# several independently displayed effects.
description_names = {
    'exaiphanes_blade': ['hit', 'resonated_elements'],
    'jade_vista': ['static', 'same', 'other'],
    'hymn_of_the_maelstrom': ['base', 'party'],
    'breezeborne_refrain': ['base', 'party'],
}

# The calculator predates the final English release name for this weapon.
# Emit a second, source-backed weapon-name key for saved-build compatibility;
# passive keys continue to follow the source name.
weapon_name_aliases = {
    'sunny_morning_sleep_in': ['morning_hibernation'],
}

# Exaiphanes Blade changes qualitatively at R2.  The ordinary R1 source row
# supplies the hit effect; the R2 row is the authoritative source for the
# resonated-elements effect.
supplemental_refinement_levels = {
    'exaiphanes_blade': [1],
}


a_teaspoon_of_transcendence_eng = Template(
    patterns=[
        (r'<br>Additionally', '\nAdditionally'),
        (r'Stellar anemo\{Swirl\}', 'Stellar Swirl'),
    ],
    sentences=[
        ['28:atk_percent|28'],
        ['16:dmg_stellarglimmer|16', '5:ignore'],
        ['0.2:ignore', '3:ignore'],
    ],
    results=[[0], [1, 2]],
)

a_teaspoon_of_transcendence_rus = Template(
    patterns=[(r'<br>Также', '\nТакже')],
    sentences=[
        ['28:atk_percent|28'],
        ['16:dmg_stellarglimmer|16', '5:ignore'],
        ['3:ignore', '0.2:ignore'],
    ],
    results=[[0], [1, 2]],
)

sunny_morning_sleep_in_eng = Template(
    patterns=[
        (r'\. name\{Elemental Mastery\}', '.\nname{Elemental Mastery}'),
        (r'Stellar anemo\{Swirl\}', 'Stellar Swirl'),
    ],
    sentences=[
        ['120:mastery', '6:ignore'],
        ['96:mastery', '9:ignore'],
        ['32:mastery', '30:ignore'],
    ],
    results=[[0], [1], [2]],
)

sunny_morning_sleep_in_rus = Template(
    sentences=[
        ['6:ignore', '120:mastery'],
        ['9:ignore', '96:mastery'],
        ['30:ignore', '32:mastery'],
    ],
    results=[[0], [1], [2]],
)

astral_vultures_crimson_plumage_eng = Template(
    patterns=[(r'Stellar anemo\{Swirl\}', 'Stellar Swirl')],
    sentences=[
        ['12:ignore', '24:atk_percent'],
        [
            '1:ignore', '2:ignore',
            '20:text_percent_1', '48:text_percent_2',
            '10:text_percent_3', '24:text_percent_4',
        ],
    ],
    results=[[0], [1]],
)

astral_vultures_crimson_plumage_rus = Template(
    sentences=[
        ['24:atk_percent', '12:ignore'],
        [
            '1:ignore', '2:ignore',
            '20:text_percent_1', '48:text_percent_2',
            '10:text_percent_3', '24:text_percent_4',
        ],
    ],
    results=[[0], [1]],
)


emberwell_eng = Template(
    sentences=[
        ['16:atk_percent', '12:ignore'],
        ['16:dmg_stellarglimmer', '12:ignore'],
        [],
    ],
    results=[[0, 2], [1, 2]],
)

emberwell_rus = Template(
    sentences=[
        ['12:ignore', '16:atk_percent'],
        ['12:ignore', '16:dmg_stellarglimmer'],
        [],
    ],
    results=[[0, 2], [1, 2]],
)

whitelake_frostfeather_eng = Template(
    sentences=[
        ['8:atk_percent', '8:ignore'],
        ['0.1:ignore'],
        ['3:ignore'],
        ['3:ignore', '50:crit_dmg_stellarglimmer', '4:text_number_energy'],
        ['3.5:ignore'],
        [],
    ],
    results=[[0, 1, 2], [3, 4, 5]],
)

whitelake_frostfeather_rus = Template(
    sentences=[
        ['8:atk_percent', '8:ignore'],
        ['3:ignore', '0.1:ignore'],
        [],
        ['3:ignore', '50:crit_dmg_stellarglimmer', '4:text_number_energy'],
        ['3.5:ignore'],
        [],
    ],
    results=[[0, 1, 2], [3, 4, 5]],
)

blade_of_atonement_eng = Template(
    patterns=[(r', while triggering', '. Triggering')],
    sentences=[
        ['64:mastery', '12:ignore'],
        ['16:atk_percent', '12:ignore'],
        [],
    ],
    results=[[0, 2], [1, 2]],
)

blade_of_atonement_rus = Template(
    sentences=[
        ['12:ignore', '64:mastery'],
        ['12:ignore', '16:atk_percent'],
        [],
    ],
    results=[[0, 2], [1, 2]],
)

frostbreath_eng = Template(
    sentences=[
        ['20:atk_percent', '15:ignore', '6:text_number_energy'],
        ['16:ignore'],
    ],
)

frostbreath_rus = Template(
    sentences=[
        ['15:ignore', '20:atk_percent', '6:text_number_energy'],
        ['16:ignore'],
    ],
)

song_of_the_vigil_eng = Template(
    sentences=[
        ['4:text_number_energy'],
        ['9:ignore'],
        ['20:atk_percent', '12:ignore'],
        [],
    ],
    results=[[0, 1, 3], [2, 3]],
)

song_of_the_vigil_rus = Template(
    sentences=[
        ['4:text_number_energy'],
        ['9:ignore'],
        ['12:ignore', '20:atk_percent'],
        [],
    ],
    results=[[0, 1, 3], [2, 3]],
)

clash_of_kings_eng = Template(
    sentences=[
        ['20:atk_percent', '100:mastery'],
        ['6:ignore', '12:ignore'],
        [],
        ['6:ignore'],
        ['6:ignore'],
    ],
)

clash_of_kings_rus = Template(
    sentences=[
        ['6:ignore', '20:atk_percent', '100:mastery'],
        ['12:ignore'],
        ['6:ignore'],
        ['6:ignore'],
    ],
)

echoes_of_the_heart_eng = Template(
    patterns=[(r', while triggering', '. Triggering')],
    sentences=[
        ['60:mastery', '12:ignore'],
        ['16:dmg_stellarglimmer', '12:ignore'],
        [],
    ],
    results=[[0, 2], [1, 2]],
)

echoes_of_the_heart_rus = Template(
    sentences=[
        ['12:ignore', '60:mastery'],
        ['12:ignore', '16:dmg_stellarglimmer'],
        [],
    ],
    results=[[0, 2], [1, 2]],
)

covenant_of_frost_and_snow_eng = Template(
    sentences=[['12:ignore', '120:mastery']],
)

covenant_of_frost_and_snow_rus = Template(
    sentences=[['120:mastery', '12:ignore']],
)

heretics_molten_blade_eng = Template(
    sentences=[
        [],
        ['18:text_percent_min', '36:text_percent_max'],
        ['14:ignore', '14:ignore'],
    ],
)

heretics_molten_blade_rus = Template(
    sentences=[
        ['18:text_percent_min', '36:text_percent_max'],
        ['14:ignore', '14:ignore'],
    ],
)

exaiphanes_blade_eng = Template(
    sentences=[
        ['16:atk_percent', '8:ignore'],
        ['3:text_number_energy'],
        ['5:ignore'],
        [],
    ],
)

exaiphanes_blade_rus = Template(
    sentences=[
        ['16:atk_percent', '8:ignore', '3:text_number_energy'],
        ['5:ignore'],
    ],
)

exaiphanes_blade_refinement_1_eng = Template(
    sentences=[
        ['6:crit_dmg'],
        ['20:ignore', '8:ignore', '3:ignore'],
        ['5:ignore'],
        [],
    ],
    results=[[0]],
)

exaiphanes_blade_refinement_1_rus = Template(
    sentences=[
        ['6:crit_dmg'],
        ['20:ignore', '8:ignore', '3:ignore'],
        ['5:ignore'],
    ],
    results=[[0]],
)

forged_by_the_golden_melody_eng = Template(
    sentences=[
        [
            '10:ignore', '18:text_percent_1', '120:text_number_2',
            '28:text_percent_3',
        ],
        ['10:ignore'],
        ['12:ignore'],
        ['12:ignore'],
    ],
)

forged_by_the_golden_melody_rus = Template(
    sentences=[
        [
            '10:ignore', '18:text_percent_1', '120:text_number_2',
            '28:text_percent_3',
        ],
        ['10:ignore', '12:ignore'],
        ['12:ignore'],
    ],
)

jade_vista_eng = Template(
    patterns=[
        (r': · Who is of the same', ':\nWho is of the same'),
        (r'; · Who is not of the same', '.\nWho is not of the same'),
    ],
    sentences=[
        [],
        ['64:text_mastery'],
        ['12:text_atk_percent'],
        ['3:ignore'],
    ],
    results=[[3], [1], [2]],
)

jade_vista_rus = Template(
    patterns=[
        (r': · Если тип элемента совпадает', ':\nЕсли тип элемента совпадает'),
        (r'ед\. · Если тип элемента отличается', 'ед.\nЕсли тип элемента отличается'),
    ],
    sentences=[
        [],
        ['64:text_mastery'],
        ['12:text_atk_percent'],
        ['3:ignore'],
        [],
    ],
    results=[[3, 4], [1], [2]],
)


# Per-weapon localization fitting for the imported affix prose. Tokens mirror
# the calculator stat names consumed by each weapon module.
new_bough_eng = Template(
    sentences=[
        [
            '12:ignore', '4:text_percent_normal_atk',
            '20:text_number_normal_mastery',
        ],
        ['6:ignore'],
        ['3:ignore'],
        ['6:text_percent_radiance_atk', '8:text_percent_radiance_dmg'],
    ],
)

new_bough_rus = Template(
    sentences=[
        [
            '12:ignore', '4:text_percent_normal_atk',
            '20:text_number_normal_mastery',
        ],
        [
            '6:ignore', '3:ignore', '1:ignore', '1:ignore',
            '6:text_percent_radiance_atk', '8:text_percent_radiance_dmg',
        ],
    ],
)

silver_light_eng = Template(
    sentences=[['52:mastery', '12:ignore'], ['2:ignore']],
)

silver_light_rus = Template(
    sentences=[['12:ignore', '52:mastery'], ['2:ignore'], []],
)

beyond_the_chrysalis_eng = Template(
    patterns=[(r'Stellar anemo\{Swirl\}', 'Stellar Swirl')],
    sentences=[
        [
            '56:text_percent_blazing', '10:ignore',
            '36:text_percent_dazzling', '10:ignore',
            '5:text_number_radiant',
        ],
        ['5:ignore', '4:ignore'],
    ],
)

beyond_the_chrysalis_rus = Template(
    sentences=[
        [
            '56:text_percent_blazing', '10:ignore',
            '36:text_percent_dazzling', '10:ignore',
            '5:text_number_radiant',
        ],
        ['5:ignore', '4:ignore'],
    ],
)

winters_heavy_heart_eng = Template(
    sentences=[
        ['24:text_mastery_cryo'],
        ['4.8:text_atk_electro'],
        [
            '4:ignore', '20:text_mastery_radiance',
            '6:text_dmg_radiance',
        ],
    ],
)

winters_heavy_heart_rus = Template(
    sentences=[
        ['24:text_mastery_cryo', '4.8:text_atk_electro'],
        [
            '4:ignore', '20:text_mastery_radiance',
            '6:text_dmg_radiance',
        ],
    ],
)

hymn_of_the_maelstrom_eng = Template(
    patterns=[
        (r'Stellar anemo\{Swirl\}', 'Stellar Swirl'),
        (r'<br>', '<br>\n'),
    ],
    sentences=[
        ['4:healing|4'],
        [
            '4:text_percent_hp_hymn|4',
            '0.4:text_percent_atk_per_thousand|0.4',
            '1000:ignore', '40000:ignore',
        ],
        ['8:text_percent_atk_cap|8'],
        ['10:ignore', '3:ignore'],
        ['75:ignore', '5:ignore'],
        [],
    ],
    results=[[0, 1, 2, 3, 4, 5], [1, 2, 3, 4, 5]],
)

hymn_of_the_maelstrom_rus = Template(
    patterns=[(r'<br>', '<br>\n')],
    sentences=[
        ['4:healing|4'],
        [],
        [
            '4:text_percent_hp_hymn|4',
            '0.4:text_percent_atk_per_thousand|0.4',
            '8:text_percent_atk_cap|8',
            '1000:ignore', '40:ignore', '000:ignore',
        ],
        [],
        ['10:ignore', '3:ignore'],
        ['5:ignore'],
        ['75:ignore'],
        [],
    ],
    results=[[0, 1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7]],
)

breezeborne_refrain_eng = Template(
    patterns=[(r', and at 3 stacks,', '.\nAt 3 stacks,')],
    sentences=[
        ['20:recharge'],
        ['0.03:ignore', '3:ignore'],
        ['3:ignore'],
        ['24:dmg_stellarswirl|24', '12:ignore'],
        [],
    ],
    results=[[0, 1], [2, 3, 4]],
)

breezeborne_refrain_rus = Template(
    sentences=[
        ['20:recharge'],
        ['1:ignore'],
        ['3:ignore', '0.03:ignore'],
        ['3:ignore', '24:dmg_stellarswirl|24', '12:ignore'],
        [],
        [],
    ],
    results=[[0, 1, 2], [3, 4, 5]],
)

mountain_bracing_bolt = Template(
    sentences=[
        ['15:ignore', '12:dmg_skill'],
        ['12:dmg_skill', '8:ignore'],
    ],
    results=[
        [0],
        [1],
    ],
)

sturdy_bone = Template(
    sentences=[
        ['15:ignore'],
        ['16:normal_base_atk_percent'],
        ['18:ignore', '7:ignore'],
    ],
)

fruitful_hook = Template(
    patterns=[
        ('; After', '. After'),
    ],
    sentences=[
        ['16:crit_rate_plunge'],
        ['16:dmg_normal', '10:ignore'],
    ],
    results=[
        [0],
        [1],
    ],
)

peak_patrol_song_rus = Template(
    names=['защиту', 'защиты'],
    sentences=[
        ['8:def_percent', '10:dmg_pyro'],
        ['6:ignore', '2:ignore', '0.1:ignore'],
        ['1000:ignore', '8:text_percent|8', '15:ignore'],
        ['25.6:text_percent_max|25.6'],
    ],
    results=[
        [0, 1],
        [2, 3],
    ],
)

peak_patrol_song_eng = Template(
    sentences=[
        ['8:def_percent', '10:dmg_pyro', '6:ignore'],
        ['2:ignore'],
        ['0.1:ignore'],
        ['2:ignore', '2:ignore', '8:text_percent|8', '1000:ignore', '25.6:text_percent_max|25.6', '15:ignore'],
    ],
    results=[
        [0, 1, 2],
        [3],
    ],
)

# Starsealed Edict: permanent CRIT DMG, Crystal Compounding, Law of Combustion
# stacks and the Radiance: Stellar-Conduct per-stack CRIT DMG are separate
# calculator conditions, so every source line becomes its own description.
starsealed_edict_eng = Template(
    patterns=[(r'<br>', '\n')],
    sentences=[
        ['24:crit_dmg'],
        ['48:mastery', '20:ignore'],
        [],
        ['24:mastery'],
        ['3:ignore'],
        [],
        ['12:text_percent_stellarconduct_crit_dmg'],
        [],
    ],
    results=[
        [0],
        [1, 7],
        [2, 3, 4, 5],
        [6, 7],
    ],
)

starsealed_edict_rus = Template(
    patterns=[(r'<br>', '\n')],
    sentences=[
        ['24:crit_dmg'],
        ['48:mastery', '20:ignore'],
        ['24:mastery'],
        ['3:ignore'],
        ['12:text_percent_stellarconduct_crit_dmg'],
        [],
    ],
    results=[
        [0],
        [1, 5],
        [2, 3],
        [4, 5],
    ],
)

# Reliquary of Truth: permanent CRIT Rate, Secret of Lies (Skill EM), Moon of
# Truth (Lunar-Bloom CRIT DMG) and the 50% boost while both are active are
# separate calculator conditions. Both languages split into the same sentences.
reliquary_of_truth = Template(
    sentences=[
        ['8:crit_rate'],
        ['80:mastery', '12:ignore'],
        ['24:crit_dmg', '4:ignore'],
        ['50:ignore'],
    ],
    results=[
        [0],
        [1],
        [2],
        [3],
    ],
)

# 6.0 weapons. Every source line becomes the description of the calculator
# condition that models it. "Moonsign: Ascendant Gleam" bonuses get their own
# description because they need two Moonsign characters in the party.
# Descriptions shown by party weapon buffs (Athame Artis, Nightweaver's Looking
# Glass) carry R1 fallbacks: those panels render before a refinement is picked.
athame_artis_eng = Template(
    sentences=[
        ['16:crit_dmg_burst'],
        ['20:text_percent_atk|20'],
        ['16:text_percent_atk_party|16', '3:ignore', '75:ignore'],
        [],
    ],
    results=[
        [0],
        [1, 2, 3],
    ],
)

athame_artis_rus = Template(
    sentences=[
        ['16:crit_dmg_burst'],
        ['20:text_percent_atk|20', '16:text_percent_atk_party|16', '3:ignore', '75:ignore'],
        [],
    ],
    results=[
        [0],
        [1, 2],
    ],
)

serenitys_call_eng = Template(
    sentences=[
        ['16:hp_percent', '12:ignore'],
        ['16:hp_percent'],
        [],
    ],
    results=[
        [0, 2],
        [1],
    ],
)

# "макс. HP" splits the Russian sentences in two; results glue them back.
serenitys_call_rus = Template(
    sentences=[
        ['12:ignore'],
        ['16:hp_percent'],
        [],
        ['16:hp_percent'],
        [],
    ],
    results=[
        [0, 1, 4],
        [2, 3],
    ],
)

moonweavers_dawn = Template(
    sentences=[
        ['20:dmg_burst'],
        ['60:ignore', '40:ignore', '16:text_percent_energy_60', '28:text_percent_energy_40'],
    ],
    results=[
        [0],
        [1],
    ],
)

the_daybreak_chronicles_eng = Template(
    sentences=[
        ['3:ignore', '60:text_percent_max'],
        ['10:text_percent_decay', '0:ignore'],
        ['10:dmg_normal', '60:text_percent_max'],
        ['0.1:ignore'],
        ['20:text_percent_hexerei'],
    ],
)

the_daybreak_chronicles_rus = Template(
    sentences=[
        ['3:ignore', '60:text_percent_max'],
        ['10:text_percent_decay', '0:ignore'],
        ['10:dmg_normal', '60:text_percent_max'],
        ['0.1:ignore', '20:text_percent_hexerei'],
    ],
)

snare_hook_eng = Template(
    sentences=[
        ['60:mastery', '12:ignore'],
        ['60:mastery'],
        [],
    ],
    results=[
        [0, 2],
        [1],
    ],
)

snare_hook_rus = Template(
    sentences=[
        ['12:ignore', '60:mastery'],
        ['60:mastery'],
        [],
    ],
    results=[
        [0, 2],
        [1],
    ],
)

# Master Key shares Snare Hook's passive text.
master_key_eng = snare_hook_eng
master_key_rus = snare_hook_rus

rainbow_serpents_rain_bow_eng = Template(
    sentences=[
        ['28:atk_percent', '8:ignore'],
    ],
)

rainbow_serpents_rain_bow_rus = Template(
    sentences=[
        ['8:ignore', '28:atk_percent'],
    ],
)

nightweavers_looking_glass = Template(
    sentences=[
        ['60:mastery', '4.5:ignore'],
        ['60:mastery', '10:ignore'],
        ['120:dmg_reaction_bloom|120', '80:dmg_reaction_hyperbloom|80', '40:dmg_reaction_lunarbloom|40'],
        [],
        [],
    ],
    results=[
        [0],
        [1],
        [2, 3, 4],
    ],
)

etherlight_spindlelute_eng = Template(
    sentences=[
        ['20:ignore', '100:mastery'],
    ],
)

etherlight_spindlelute_rus = Template(
    sentences=[
        ['100:mastery', '20:ignore'],
    ],
)

blackmarrow_lantern = Template(
    sentences=[
        ['48:dmg_reaction_bloom', '12:dmg_reaction_lunarbloom'],
        ['12:dmg_reaction_lunarbloom'],
    ],
    results=[
        [0],
        [1],
    ],
)

dawning_frost = Template(
    sentences=[
        ['10:ignore', '72:mastery'],
        ['10:ignore', '48:mastery'],
    ],
    results=[
        [0],
        [1],
    ],
)

bloodsoaked_ruins_eng = Template(
    sentences=[
        ['3.5:ignore', '36:dmg_reaction_lunarcharged'],
        ['28:crit_dmg', '6:ignore'],
        ['12:text_energy', '14:ignore'],
    ],
    results=[
        [0],
        [1, 2],
    ],
)

bloodsoaked_ruins_rus = Template(
    sentences=[
        ['36:dmg_reaction_lunarcharged', '3.5:ignore'],
        ['28:crit_dmg', '6:ignore', '12:text_energy'],
        ['14:ignore'],
    ],
    results=[
        [0],
        [1, 2],
    ],
)

prospectors_shovel = Template(
    sentences=[
        ['48:dmg_reaction_electrocharged', '12:dmg_reaction_lunarcharged'],
        ['12:dmg_reaction_lunarcharged'],
    ],
    results=[
        [0],
        [1],
    ],
)

sacrificers_staff_eng = Template(
    sentences=[
        ['6:ignore', '8:atk_percent', '6:recharge'],
        ['3:ignore'],
        [],
    ],
)

sacrificers_staff_rus = Template(
    sentences=[
        ['6:ignore', '8:atk_percent', '6:recharge'],
        ['3:ignore'],
    ],
)
