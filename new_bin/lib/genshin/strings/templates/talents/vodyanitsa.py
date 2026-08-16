from ...template import Template, TemplateList


char_vodyanitsa = TemplateList(
    c4_rus=Template(
        patterns=[
            (r'<br>\s*·\s*', r'\n'),
        ],
        sentences=[
            [],
            ['40:ignore', '50:healing'],
            ['40:ignore', '20:hp_percent', '6:ignore'],
            ['3:ignore'],
        ],
        results=[
            [1],
            [2, 3],
        ],
    ),
    c4_eng=Template(
        patterns=[
            (r'<br>\s*·\s*', r'\n'),
            (r';\n', r'.\n'),
        ],
        sentences=[
            [],
            ['40:ignore', '50:healing'],
            ['40:ignore', '20:hp_percent', '6:ignore'],
            ['3:ignore'],
        ],
        results=[
            [1],
            [2, 3],
        ],
    ),
)
