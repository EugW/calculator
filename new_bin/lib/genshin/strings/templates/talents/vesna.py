from ...template import Template, TemplateList


char_vesna = TemplateList(
    rite_of_springs_procession_rus=Template(
        sentences=[
            ['1:ignore'],
            ['20:ignore', '6:ignore'],
            ['100:ignore', '10:ignore'],
            [],
        ],
        results=[
            [0, 1, 2],
            [3],
        ],
    ),
    rite_of_springs_procession_eng=Template(
        sentences=[
            ['1:ignore', '20:ignore'],
            ['6:ignore', '100:ignore', '10:ignore'],
            [],
        ],
        results=[
            [0, 1],
            [2],
        ],
    ),
    unwavering_ardor_rus=Template(
        patterns=[
            (r'<br>Кроме того', r'\nКроме того'),
        ],
        sentences=[
            ['5:text_duration', '150:text_percent_dmg_1', '200:text_percent_dmg_2'],
            [],
            ['20:text_percent'],
        ],
        results=[
            [0, 1],
            [2],
        ],
    ),
    unwavering_ardor_eng=Template(
        patterns=[
            (r'<br>Additionally', r'\nAdditionally'),
        ],
        sentences=[
            ['5:text_duration', '150:text_percent_dmg_1', '200:text_percent_dmg_2'],
            [],
            ['20:text_percent'],
        ],
        results=[
            [0, 1],
            [2],
        ],
    ),
)
