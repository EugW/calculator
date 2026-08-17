from ...template import Template, TemplateList


char_yumemizuki_mizuki = TemplateList(
    default_rus=Template(
        names=[
            'Юмэмидзуки Мидзуки', 'Мидзуки',
            'Парящей по сновидениям', 'Двадцать три ночи ожидания', 'Двадцать три ночи',
            'Закуску в стиле юмэми',
        ],
        skills={
            'skill': ['Парящей по сновидениям'],
            'burst': ['Терапия тайных источников анраку'],
        },
    ),
    default_eng=Template(
        names=[
            'Yumemizuki Mizuki', 'Mizuki',
            'Dreamdrifter', 'Twenty-Three Nights\' Awaiting',
        ],
        skills={
            'skill': [],
            'burst': ['Anraku Secret Spring Therapy'],
        },
    ),
    bright_moons_restless_voice=Template(
        sentences=[
            ['2.5:ignore'],
            ['0.3:ignore', '2:ignore'],
        ],
    ),
    thoughts_by_day_bring_dreams_by_night=Template(
        sentences=[
            ['100:mastery', '4:ignore'],
        ],
    ),
    vast_be_the_dream_rus=Template(
        patterns=[
            (r'<br>skill\{Сияние - Звёздное рассеивание\}:', r'\nskill{Сияние - Звёздное рассеивание}:'),
            (r'<br><br>Кроме того,', r'\nКроме того,'),
            (r'<br>На 8 сек\. после того как', r'\nНа 8 сек. после того как'),
        ],
        sentences=[
            ['1000:ignore'],
            ['2.5:ignore'],
            ['1000:ignore'],
            [],
            ['10:ignore'],
            ['8:ignore'],
        ],
        results=[
            [0, 1],
            [2, 3, 5],
            [4],
        ],
    ),
    vast_be_the_dream_eng=Template(
        patterns=[
            (r'<br>skill\{Radiance: Stellar Swirl\}:', r'\nskill{Radiance: Stellar Swirl}:'),
            (r'<br><br>Additionally,', r'\nAdditionally,'),
            (r'<br>name\{Yumemizuki Mizuki\} will also enter', r'\nname{Yumemizuki Mizuki} will also enter'),
        ],
        sentences=[
            ['1000:ignore'],
            ['2.5:ignore'],
            ['1000:ignore'],
            [],
            ['10:ignore'],
            ['8:ignore'],
        ],
        results=[
            [0, 1],
            [2, 3, 5],
            [4],
        ],
    ),
    in_mist_like_waters=Template(
        sentences=[
            ['3:ignore', '3.5:ignore'],
            ['1100:text_percent_dmg', '550:ignore'],
        ],
    ),
    your_echo_i_meet_in_dreams=Template(
        sentences=[
            ['0.04:text_percent_dmg'],
        ],
    ),
    buds_warm_lucid_springs_rus=Template(
        sentences=[
            ['5:ignore'],
            ['4:ignore'],
        ],
    ),
    buds_warm_lucid_springs_eng=Template(
        sentences=[
            ['5:ignore', '4:ignore'],
        ],
    ),
    the_heart_lingers_long_rus=Template(
        sentences=[
            [
                '30:crit_rate_swirl', '100:crit_dmg_swirl',
                '10:ignore', '20:ignore',
            ],
        ],
    ),
    the_heart_lingers_long_eng=Template(
        sentences=[
            ['30:crit_rate_swirl', '100:crit_dmg_swirl'],
            ['10:ignore', '20:ignore'],
        ],
    ),
)
