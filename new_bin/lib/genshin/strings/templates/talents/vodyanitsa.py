from ...template import Template, TemplateList


char_vodyanitsa = TemplateList(
    melancholic_voice_upon_the_gentle_waters_rus=Template(
        patterns=[
            (r'<br>\s*·\s*', r'\n'),
        ],
        # The second bullet splits at the period inside "макс. HP"; the
        # fragment join restores the original spacing.
        sentences=[
            [],
            ['40:ignore', '50:text_percent_healing'],
            ['40:ignore'],
            ['20:hp_percent', '6:ignore'],
            ['3:ignore'],
        ],
        results=[
            [1],
            [2, 3, 4],
        ],
    ),
    melancholic_voice_upon_the_gentle_waters_eng=Template(
        patterns=[
            (r'<br>\s*·\s*', r'\n'),
            (r';\n', r'.\n'),
        ],
        sentences=[
            [],
            ['40:ignore', '50:text_percent_healing'],
            ['40:ignore', '20:hp_percent', '6:ignore'],
            ['3:ignore'],
        ],
        results=[
            [1],
            [2, 3],
        ],
    ),
)
