from ...template import Template, TemplateList


char_traveler_cryo = TemplateList(
    illusory_frostmirror_rus=Template(
        patterns=[
            (
                r'^Когда (путешественник) находится в (.+?), либо на (8 сек\.) после того как (.+?), '
                r'(он) (входит в состояние) (.+?) или (.+?) соответственно\.<br>Когда',
                r'Когда \1 находится в \2, \5 \6 \7.\n'
                r'На \3 после того как \4, \1 \6 \8.\nКогда',
            ),
        ],
        sentences=[
            [],
            ['8:text_duration'],
            ['0.35:text_percent', '100:ignore'],
            ['7:text_percent_max'],
        ],
        results=[
            [0],
            [1],
            [2, 3],
        ],
    ),
    illusory_frostmirror_eng=Template(
        patterns=[
            (
                r'^(The Traveler will enter) (.+?Stellar-Conduct\} state when inside .+?), '
                r'or (the skill\{Radiance: Stellar Swirl\} state for 8s after .*?)\.<br>When',
                r'\1 \2.\n\1 \3.\nWhen',
            ),
        ],
        sentences=[
            [],
            ['8:text_duration'],
            ['0.35:text_percent', '100:ignore'],
            ['7:text_percent_max'],
        ],
        results=[
            [0],
            [1],
            [2, 3],
        ],
    ),
    foreign_permafrost_rus=Template(
        patterns=[
            (r'(skill\{n10050001:усиления\}\.)<br><br>', r'\1<br><br>\n'),
            (
                r'(skill\{Заряженную атаку: Застывающий лёд\}\.)<br><br>',
                r'\1\n<br><br>',
            ),
        ],
        sentences=[
            [],
            [],
            ['1:ignore'],
            ['2:ignore'],
            ['3:ignore'],
            ['3:ignore'],
            ['140:ignore', '2:ignore', '1:ignore', '15:ignore'],
            [],
        ],
        results=[
            [0, 1, 2, 3, 4, 5, 6, 7],
            [2, 3, 4, 5],
        ],
    ),
    foreign_permafrost_eng=Template(
        patterns=[
            (r'(skill\{n10050001:enhancement effect\}\.)<br><br>', r'\1<br><br>\n'),
            (r'(skill\{Charged Attack: Freezing Ice\}\.)<br><br>', r'\1\n<br><br>'),
        ],
        sentences=[
            [],
            ['1:ignore', '1:ignore', '2:ignore', '3:ignore'],
            ['3:ignore'],
            ['140:ignore', '2:ignore', '15:ignore'],
            [],
        ],
        results=[
            [0, 1, 2, 3, 4],
            [1, 2],
        ],
    ),
)
