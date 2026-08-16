from ...template import Template, TemplateList


char_vesna = TemplateList(
    unruffled_rus=Template(
        patterns=[
            (r'активируетskill', r'активирует skill'),
            (r'<br>Каждый уровень', r'\nКаждый уровень'),
        ],
        sentences=[
            ['1:ignore'],
            ['20:ignore', '6:ignore'],
            [],
            ['10:ignore', '160:ignore'],
        ],
        results=[
            [0, 1, 3],
            [2],
        ],
    ),
    unruffled_eng=Template(
        patterns=[
            (r'<br>Each stack', r'\nEach stack'),
        ],
        sentences=[
            ['1:ignore', '20:ignore'],
            ['6:ignore'],
            [],
            ['10:ignore', '160:ignore'],
        ],
        results=[
            [0, 1, 3],
            [2],
        ],
    ),
    c6_rus=Template(
        patterns=[
            (r'<br><br>Вдобавок', r'\nВдобавок'),
        ],
        sentences=[
            [
                '5:text_duration',
                '150:text_percent_dmg_1',
                '200:text_percent_dmg_2',
                '1:ignore',
            ],
            ['20:text_percent'],
        ],
        results=[
            [0],
            [1],
        ],
    ),
    c6_eng=Template(
        patterns=[
            (r'<br><br>Additionally', r'\nAdditionally'),
            (r'%。', r'%.'),
        ],
        sentences=[
            ['5:text_duration', '150:text_percent_dmg_1', '200:text_percent_dmg_2'],
            ['1:ignore'],
            ['20:text_percent'],
        ],
        results=[
            [0, 1],
            [2],
        ],
    ),
)
