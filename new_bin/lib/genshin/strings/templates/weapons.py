from ..template import Template


# These mappings are consumed by import_weapons.py.  Descriptive suffixes keep
# calculator condition keys stable when one source passive is split into
# several independently displayed effects.
description_names = {
    'exaiphanes_blade': ['hit', 'resonated_elements'],
    'jade_vista': ['static', 'same', 'other'],
    'windtalker': ['base', 'party'],
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


# These templates use the calculator identifiers assigned to source rows whose
# localized names or passive titles are still generic or missing. The localized
# descriptions remain the authoritative prose.
spiked_stake_eng = Template(
    patterns=[
        (r'Stellar anemo\{Swirl\}', 'Stellar Swirl'),
        (r'8%Stellar', '8% Stellar'),
    ],
    sentences=[
        [
            '12:ignore', '4:text_percent_normal_atk',
            '20:text_number_normal_mastery', '6:ignore',
        ],
        ['3:ignore'],
        ['6:text_percent_radiance_atk', '8:text_percent_radiance_dmg'],
    ],
)

spiked_stake_rus = Template(
    sentences=[
        ['12:ignore', '4:text_percent_normal_atk', '20:text_number_normal_mastery'],
        ['6:ignore', '1:ignore', '1:ignore', '3:ignore'],
        ['6:text_percent_radiance_atk', '8:text_percent_radiance_dmg'],
    ],
)

fajian_eng = Template(
    sentences=[['52:mastery', '12:ignore'], ['2:ignore']],
)

fajian_rus = Template(
    sentences=[['52:mastery', '12:ignore'], ['2:ignore'], []],
)

samosvist_eng = Template(
    patterns=[(r'Stellar anemo\{Swirl\}', 'Stellar Swirl')],
    sentences=[[
        '48:text_percent_blazing', '10:ignore',
        '28:text_percent_dazzling', '10:ignore',
        '3:text_number_radiant',
    ]],
)

samosvist_rus = Template(
    sentences=[[
        '10:ignore', '48:text_percent_blazing',
        '10:ignore', '28:text_percent_dazzling',
        '3:text_number_radiant',
    ]],
)

frost_scepter_eng = Template(
    patterns=[(r'Stellar anemo\{Swirl\}', 'Stellar Swirl')],
    sentences=[
        ['24:text_mastery_cryo'],
        ['4.8:text_atk_electro'],
        ['20:text_mastery_radiance', '6:text_dmg_radiance'],
        ['4:ignore'],
    ],
)

frost_scepter_rus = Template(
    # The RU TextMap has a stale 4.2% ATK clause here. EN and the affix
    # parameters agree that Radiance grants 20 Elemental Mastery instead.
    patterns=[(
        r'увеличивает name\{силу атаки\} на 4,2%',
        'увеличивает name{мастерство стихий} на 20 ед.',
    )],
    sentences=[
        ['24:text_mastery_cryo'],
        ['4.8:text_atk_electro'],
        [],
        ['20:text_mastery_radiance', '6:text_dmg_radiance'],
        ['4:ignore'],
    ],
)

bludnye_eng = Template(
    patterns=[(r'Stellar anemo\{Swirl\}', 'Stellar Swirl')],
    sentences=[
        ['8:healing', '1:ignore', '5:text_hp_hymn'],
        [
            '1000:ignore', '40000:ignore',
            '0.25:text_atk_per_thousand', '5:text_atk_cap',
            '8:ignore', '3:ignore',
        ],
        ['5:ignore', '75:ignore'],
    ],
)

bludnye_rus = Template(
    sentences=[
        ['8:healing', '1:ignore'],
        [
            '5:text_hp_hymn', '0.25:text_atk_per_thousand',
            '5:text_atk_cap', '1000:ignore', '40:ignore', '000:ignore',
        ],
        ['8:ignore', '3:ignore'],
        ['5:ignore'],
        [],
        ['75:ignore'],
    ],
)

windtalker_eng = Template(
    patterns=[
        (r'Stellar anemo\{Swirl\}', 'Stellar Swirl'),
        (r', and when the character reaches', '. When the character reaches'),
    ],
    sentences=[
        ['20:recharge', '1:ignore'],
        ['0.03:ignore'],
        ['3:ignore', '24:dmg_stellarswirl', '12:ignore'],
        ['12:ignore'],
        [],
    ],
    results=[[0, 1, 4], [2, 3, 4]],
)

windtalker_rus = Template(
    sentences=[
        ['20:recharge'],
        ['1:ignore'],
        ['0.03:ignore'],
        ['3:ignore', '24:dmg_stellarswirl', '12:ignore'],
        ['12:ignore'],
        [],
    ],
    results=[[0, 1, 2, 5], [3, 4, 5]],
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
