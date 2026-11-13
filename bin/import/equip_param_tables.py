"""Passive params of weapons and artifact sets.

Writes src/js/db/generated/WeaponPassiveTables.js (one value per refinement)
and ArtifactSetTables.js (pc2 / pc4 blocks).

A named stat (hp_percent) is a bonus the passive's table row gives directly.
The row says which property it is, so it is in calculator units (20 for 20%).
pN is a position of the passive's paramList, with the ability parameter it
feeds in the comment above. Like the passive and constellation blocks of
CharTalentTables.js it is raw (0.2 for 20%): the game data has no format code
for it.

    python equip_param_tables.py --data-root <checkout> --expected-data-revision <rev>
"""

import os

from char_common import (
    format_param,
    parse_lang,
    parse_talent_configs,
    talent_config_links,
    trim_params,
)
from equip_common import (
    add_prop_stats,
    equip_affixes,
    load_excel,
    set_blocks,
    set_key,
    weapon_affix_rows,
    weapon_names,
)

dirname = os.path.dirname(__file__)
out_dir = os.path.join(dirname, '../../src/js/db/generated/')


def passive_entries(rows, configs):
    """(abilities, [(key, comment lines, values per row as text)]) of a passive.

    rows are the refinements of a weapon, or the single row of a set bonus.
    """
    (abilities, targets) = talent_config_links(configs.get(rows[0].get('openConfig') or '') or [])
    entries = []

    stats = [add_prop_stats(row) for row in rows]
    for stat in stats[0]:
        if any(stat not in row_stats for row_stats in stats):
            raise ValueError(
                f"Passive {rows[0].get('id')} gives {stat} at some levels only"
            )
        entries.append((stat, ['given by the passive itself'], [row_stats[stat] for row_stats in stats]))

    width = max(len(trim_params(row['paramList'])) for row in rows)
    out_of_range = [index for index in targets if index > len(rows[0]['paramList'])]
    if out_of_range:
        raise ValueError(
            f"Talent config {rows[0].get('openConfig')} passes on param"
            f"{max(out_of_range)}, but the row has only "
            f"{len(rows[0]['paramList'])} params"
        )
    several_abilities = len({
        ability
        for (index, index_targets) in targets.items() if index <= width
        for (ability, _, _) in index_targets
    }) > 1
    for index in range(1, width + 1):
        comments = []
        for (ability, special, note) in targets.get(index, []):
            name = f'{ability}.{special}' if several_abilities else special
            if note:
                name += f' ({note})'
            comments.append(name)
        entries.append((
            f'p{index}', comments,
            [format_param(row['paramList'][index - 1]) for row in rows],
        ))
    return (abilities, entries)


def header_lines(title, open_config, abilities, indent):
    lines = []
    if title:
        lines.append(f'{indent}// {title}')
    header = open_config
    if abilities and len(header) + sum(len(name) + 2 for name in abilities) <= 110:
        header += ' -> ' + ', '.join(abilities)
        abilities = []
    elif abilities:
        header += ' ->'
    if header:
        lines.append(f'{indent}// {header}')
    lines += [f'{indent}//     {ability}' for ability in abilities]
    return lines


def write_entries(out, entries, indent, as_list):
    for (key, comments, values) in entries:
        for comment in comments:
            out.write(f'{indent}// {comment}\n')
        if as_list:
            # Always one value per refinement, also where they are equal: the
            # list replaces a hand-typed five-value table one for one.
            text = '[' + ', '.join(values) + ']'
        else:
            text = values[0]
        out.write(f'{indent}{key}: {text},\n')


def write_weapons(lang, affixes):
    names = weapon_names()
    configs = parse_talent_configs('EquipTalents')
    weapons = {}
    for item in load_excel('WeaponExcelConfigData.json'):
        name = names.get(item['id'])
        rows = weapon_affix_rows(item, affixes)
        if name and rows:
            weapons[name] = rows

    with open(out_dir + 'WeaponPassiveTables.js', 'w', encoding='utf-8', newline='\n') as out:
        out.write('// This file is auto generated\n')
        out.write('export const weaponPassiveTables = {\n')
        for name in sorted(weapons):
            rows = weapons[name]
            (abilities, entries) = passive_entries(rows, configs)
            if not entries:
                continue
            title = lang.get(str(rows[0].get('nameTextMapHash'))) or ''
            for line in header_lines(title, rows[0].get('openConfig') or '', abilities, '\t'):
                out.write(line + '\n')
            out.write(f'\t{name}: {{\n')
            write_entries(out, entries, '\t\t', as_list=True)
            out.write('\t},\n')
        out.write('};\n')


def write_sets(lang, affixes):
    configs = parse_talent_configs('RelicTalents')
    sets = {}
    for item in load_excel('ReliquarySetExcelConfigData.json'):
        blocks = set_blocks(item, affixes)
        title = lang.get(str(blocks[0][1].get('nameTextMapHash'))) if blocks else ''
        if not title:
            continue
        key = set_key(item, title)
        if key in sets:
            raise ValueError(f'Two artifact sets are named {key}')
        sets[key] = (title, blocks)

    with open(out_dir + 'ArtifactSetTables.js', 'w', encoding='utf-8', newline='\n') as out:
        out.write('// This file is auto generated\n')
        out.write('export const artifactSetTables = {\n')
        for key in sorted(sets):
            (title, blocks) = sets[key]
            written = []
            for (block_key, row) in blocks:
                (abilities, entries) = passive_entries([row], configs)
                if entries:
                    written.append((block_key, row, abilities, entries))
            if not written:
                continue
            out.write(f'\t// {title}\n')
            out.write(f'\t{key}: {{\n')
            for (block_key, row, abilities, entries) in written:
                for line in header_lines('', row.get('openConfig') or '', abilities, '\t\t'):
                    out.write(line + '\n')
                out.write(f'\t\t{block_key}: {{\n')
                write_entries(out, entries, '\t\t\t', as_list=False)
                out.write('\t\t},\n')
            out.write('\t},\n')
        out.write('};\n')


def main():
    lang = parse_lang()
    affixes = equip_affixes()
    write_weapons(lang, affixes)
    write_sets(lang, affixes)


if __name__ == '__main__':
    main()
