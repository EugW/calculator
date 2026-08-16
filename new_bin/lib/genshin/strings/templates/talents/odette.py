from ...template import Template, TemplateList


char_odette = TemplateList(
    dance_of_aurore_rus=Template(
        patterns=[
            (
                r'^Когда (Одетта) пребывает в (.+?) или на (8 сек\.) после того как (.+?), '
                r'(она) (входит в состояние) (.+?) или (.+?) соответственно\.<br>Когда',
                r'Когда \1 пребывает в \2, \5 \6 \7.\n'
                r'На \3 после того как \4, \1 \6 \8.\nКогда',
            ),
        ],
        sentences=[
            [],
            ['8:text_duration'],
            ['0.7:text_percent', '100:ignore'],
            ['14:text_percent_max'],
        ],
        results=[
            [0],
            [1],
            [2, 3],
        ],
    ),
    dance_of_aurore_eng=Template(
        patterns=[
            (
                r'^(Odette will enter) (.+?Stellar-Conduct\} state when she is inside .+?), '
                r'or (the skill\{Radiance: Stellar Swirl\} state for 8s after .*?)\.<br>When',
                r'\1 \2.\n\1 \3.\nWhen',
            ),
        ],
        sentences=[
            [],
            ['8:text_duration'],
            ['0.7:text_percent', '100:ignore'],
            ['14:text_percent_max'],
        ],
        results=[
            [0],
            [1],
            [2, 3],
        ],
    ),
    on_this_danceless_morn_she_gazes_at_her_reflection_rus=Template(
        patterns=[
            (r'<br><br>Кроме того', r'\nКроме того'),
        ],
        sentences=[
            [],
            ['300:text_percent_dmg_1', '450:text_percent_dmg_2'],
            ['2:text_value'],
            ['2:ignore'],
        ],
        results=[
            [0, 1],
            [2, 3],
        ],
    ),
    on_this_danceless_morn_she_gazes_at_her_reflection_eng=Template(
        patterns=[
            (r'<br><br>Additionally', r'\nAdditionally'),
        ],
        sentences=[
            ['300:text_percent_dmg_1', '450:text_percent_dmg_2'],
            ['2:text_value'],
            ['2:ignore'],
        ],
        results=[
            [0],
            [1, 2],
        ],
    ),
    put_out_my_hand_and_touched_the_face_of_the_divine_rus=Template(
        patterns=[
            (r'<br>Кроме того, наносимый', r'\nНаносимый'),
            (
                r', а урон реакций Звёздного блеска Одетты',
                r'.\nУрон реакций Звёздного блеска Одетты',
            ),
        ],
        sentences=[
            [],
            ['25:text_percent'],
            ['20:text_percent'],
        ],
        results=[
            [0],
            [1],
            [2],
        ],
    ),
    put_out_my_hand_and_touched_the_face_of_the_divine_eng=Template(
        patterns=[
            (r'<br>Additionally, characters', r'\nCharacters'),
            (
                r', and Stellar Glimmer reaction DMG dealt by Odette',
                r'.\nStellar Glimmer reaction DMG dealt by Odette',
            ),
        ],
        sentences=[
            [],
            ['25:text_percent'],
            ['20:text_percent'],
        ],
        results=[
            [0],
            [1],
            [2],
        ],
    ),
)
