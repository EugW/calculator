import csv
import glob
import json
import os
import re
import sys

dirname = os.path.dirname(__file__)
input_files = os.path.join(dirname, '../data/strings/**/*.csv')
out_dir = os.path.join(dirname, '../src/js/lang/')
langs = ['eng', 'rus']


def is_strict_release_file(filename):
    """Reject new release-localized conflicts while preserving legacy debt."""

    for part in os.path.normpath(filename).split(os.sep):
        match = re.fullmatch(r'(\d+)\.(\d+)', part)
        if match and (int(match.group(1)), int(match.group(2))) >= (7, 0):
            return True
    return False

packs = [
    {
        'name': 'base',
        'input': os.path.join(dirname, '../data/strings/**/*.csv'),
        'output': os.path.join(dirname, '../src/js/lang/%.js'),
    },
    {
        'name': 'casino',
        'input': os.path.join(dirname, '../data/strings_casino/*.csv'),
        'output': os.path.join(dirname, '../src/js/lang/casino_%.js'),
    },
    {
        'name': 'draft',
        'input': os.path.join(dirname, '../data/strings_draft/*.csv'),
        'output': os.path.join(dirname, '../draft/client/js/lang/%.js'),
    },
]

for pack in packs:
    if pack['name'] not in sys.argv:
        continue
    # glob ordering is filesystem-dependent. Compilation order must be stable
    # even while old version directories still contain intentional overrides.
    files = sorted(
        glob.glob(pack['input']),
        key=lambda filename: os.path.normcase(os.path.normpath(filename)),
    )
    items = []
    origins = {}

    for filename in files:
        print(filename)
        with open(filename, encoding='utf-8') as csvfile:
            csv_file = csv.DictReader(
                csvfile,
                escapechar='~',
                quotechar='"',
                delimiter=';',
            )
            for row in csv_file:
                key = (row['category'], row['name'])
                values = tuple(row[lang] for lang in langs)
                previous = origins.get(key)
                if (
                    previous
                    and previous['values'] != values
                    and (
                        is_strict_release_file(filename)
                        or is_strict_release_file(previous['filename'])
                    )
                ):
                    raise ValueError(
                        'Conflicting 7.x string definition for '
                        f'{row["category"]}.{row["name"]}: '
                        f'{previous["filename"]}:{previous["line"]} != '
                        f'{filename}:{csv_file.line_num}'
                    )
                origins[key] = {
                    'filename': filename,
                    'line': csv_file.line_num,
                    'values': values,
                }
                items.append(row)

    result = {}
    for lang in langs:
        result[lang] = {}

    for item in items:
        for lang in langs:
            if not item['category'] in result[lang]:
                result[lang][item['category']] = {}

            result[lang][item['category']][item['name']] = item[lang]

    for lang in langs:
        out_name = pack['output'].replace('%', lang)
        f = open(out_name, 'w', encoding='utf-8')
        f.write('window.lang_name = "' + lang + '";\n')
        f.write('window.lang_strings = ')
        f.write(json.dumps(result[lang], sort_keys=True, indent=1, ensure_ascii=False))
        f.close()
