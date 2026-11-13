import json
import os
import re
import static

from char_common import (
    format_param,
    parse_constellations,
    parse_depots,
    parse_lang,
    parse_proud_groups,
    parse_scales,
    parse_skills,
    parse_talent_configs,
    passive_block_keys,
    talent_config_links,
    trim_params,
)
from source_config import get_excel_dir

dirname = os.path.dirname(__file__)
data_dir = str(get_excel_dir()) + os.sep
out_dir = os.path.join(dirname, '../../src/js/db/generated/')

names_mapping = {
    '1-Hit DMG': 'normal_hit_1',
    '2-Hit DMG': 'normal_hit_2',
    '3-Hit DMG': 'normal_hit_3',
    '4-Hit DMG': 'normal_hit_4',
    '5-Hit DMG': 'normal_hit_5',
    '6-Hit DMG': 'normal_hit_6',
    'Aimed Shot': 'aimed',
    'Fully-Charged Aimed Shot': 'charged_aimed',
    'Plunge DMG': 'plunge',
    'Low/High Plunge DMG': 'plunge_low/plunge_high',
    'Charged Attack': 'charged_hit',
    'Charged Attack DMG': 'charged_hit',
    'Charged Attack Stamina Cost': 'stamina_cost',
    'Charged Attack Spinning DMG': 'charged_spin',
    'Charged Attack Final DMG': 'charged_final',
    'Max Duration': 'max_duration',
    'CD': 'cd',
    'Duration': 'duration',
    'Energy Cost': 'energy_cost',
    'Elemental Burst DMG': 'burst_dmg',
}


def shrink_table(data):
    last = None
    for index in reversed(range(len(data))):
        val = data[index]

        if last is None:
            last = val
            continue

        if val == last:
            data.pop()
            continue

        break

    return data


def format_table(data, fmt):
    isPercent = fmt.find('P') >= 0

    def foramt_value(val):
        if isPercent:
            val *= 100
        return static.trimValue(val)

    # data = list(map(foramt_value, data))
    data = [foramt_value(x) for x in data]

    return shrink_table(data)


def make_tables(data, group_id):
    """Write the described params of a skill; returns the written indices."""
    params = {}
    processed = {}
    levels = data['levels'].keys()
    for index in range(0, len(data['levels'][1])):
        params[index+1] = []

        for level in levels:
            params[index+1].append(data['levels'][level][index])

    for desc in data['desc']:
        if not desc:
            continue
        if desc.count('|') != 1:
            raise ValueError(
                f'ProudSkill group {group_id} has malformed parameter description: {desc!r}'
            )
        (name, params_str) = desc.split('|', 1)
        params_indices = re.findall(r'param(\d+):(\w+)\b', params_str)

        name = re.sub(r'\#?{LAYOUT_PC#(.*?)\}', r'\g<1>', name)
        name = re.sub(r'\#?{.*?}', '', name)
        # name = names_mapping.get(name, name)

        for (ind, fmt) in params_indices:
            ind = int(ind)

            if ind in processed:
                continue
            if ind not in params:
                raise ValueError(
                    f'ProudSkill group {group_id} references param{ind}, '
                    f'but normalized params only contain 1..{len(params)}'
                )

            processed[ind] = 1

            out.write('\t\t\t// ' + name + '\n\t\t\t')
            out.write('p%d: [%s],\n' % (ind, ', '.join(
                format_table(params.get(ind, []), fmt)
            )))
            del params[ind]

    return sorted(processed)


def collect_param_blocks(depotId, sources):
    """Passive (a*, sp) and constellation (c*) blocks that have params.

    The params are single values without a format code: they are written raw
    (0.15 for 15%), under the name of the ability parameter each one feeds.
    """
    depot = sources['depots'][depotId]
    rows = []
    for (key, group_id) in passive_block_keys(depot):
        row = sources['prouds'].get(group_id)
        if row:
            rows.append((key, row))
    for (index, talent_id) in enumerate(depot.get('talents') or [], start=1):
        row = sources['constellations'].get(talent_id)
        if row:
            rows.append((f'c{index}', row))

    blocks = []
    for (key, row) in rows:
        params = trim_params(row['paramList'])
        if not params:
            continue
        open_config = row.get('openConfig') or ''
        (abilities, targets) = talent_config_links(
            sources['talent_configs'].get(open_config, [])
        )
        out_of_range = [ind for ind in targets if ind > len(row['paramList'])]
        if out_of_range:
            raise ValueError(
                f'Talent config {open_config} passes on param'
                f'{max(out_of_range)}, but the row has only '
                f"{len(row['paramList'])} params"
            )
        blocks.append({
            'key': key,
            'title': sources['lang'].get(str(row.get('nameTextMapHash'))) or '',
            'open_config': open_config,
            'abilities': abilities,
            'params': params,
            'targets': {
                ind: targets[ind] for ind in targets if ind <= len(params)
            },
        })
    return blocks


def write_param_blocks(blocks, skill_blocks, sources):
    # Every block position that feeds the same ability parameter: a
    # constellation often adds to a passive's or a skill's parameter.
    usage = {}
    for (key, group_id, indices) in skill_blocks:
        row = sources['prouds'].get(group_id) or {}
        (_, targets) = talent_config_links(
            sources['talent_configs'].get(row.get('openConfig') or '', [])
        )
        for ind in indices:
            for (ability, special, _) in targets.get(ind, []):
                usage.setdefault((ability, special), []).append(f'{key}.p{ind}')
    for block in blocks:
        for (ind, targets) in block['targets'].items():
            for (ability, special, _) in targets:
                usage.setdefault((ability, special), []).append(
                    f"{block['key']}.p{ind}"
                )

    for block in blocks:
        if block['title']:
            out.write('\t\t// ' + block['title'] + '\n')
        header = block['open_config']
        abilities = block['abilities']
        if abilities and len(header) + sum(len(name) + 2 for name in abilities) <= 110:
            header += ' -> ' + ', '.join(abilities)
            abilities = []
        elif abilities:
            header += ' ->'
        if header:
            out.write('\t\t// ' + header + '\n')
        for ability in abilities:
            out.write('\t\t//     ' + ability + '\n')
        out.write('\t\t' + block['key'] + ': {\n')

        several_abilities = len({
            ability
            for targets in block['targets'].values()
            for (ability, _, _) in targets
        }) > 1
        for (ind, value) in enumerate(block['params'], start=1):
            own = f"{block['key']}.p{ind}"
            for (ability, special, note) in block['targets'].get(ind, []):
                name = f'{ability}.{special}' if several_abilities else special
                if note:
                    name += f' ({note})'
                others = [ref for ref in usage[(ability, special)] if ref != own]
                if others:
                    name += ', also fed by ' + ', '.join(others)
                out.write('\t\t\t// ' + name + '\n')
            out.write('\t\t\tp%d: %s,\n' % (ind, format_param(value)))
        out.write('\t\t},\n')


def twin_param_meta(scale):
    """Map referenced param index -> (name, format) from the primary desc."""
    meta = {}
    for desc in scale['desc']:
        if not desc or desc.count('|') != 1:
            continue
        (name, params_str) = desc.split('|', 1)
        name = re.sub(r'\#?{LAYOUT_PC#(.*?)\}', r'\g<1>', name)
        name = re.sub(r'\#?{.*?}', '', name)
        for (ind, fmt) in re.findall(r'param(\d+):(\w+)\b', params_str):
            meta[int(ind)] = (name, fmt)
    return meta


def diff_twin_params(primary_scale, twin_scale):
    """Return {param_index: [boy values per level]} for params that differ."""
    primary_levels = primary_scale['levels']
    twin_levels = twin_scale['levels']
    if set(primary_levels.keys()) != set(twin_levels.keys()):
        raise ValueError(
            f'Traveler twin NA chains have different level sets '
            f'({sorted(primary_levels)} vs {sorted(twin_levels)})'
        )
    width_primary = max(len(v) for v in primary_levels.values())
    width_twin = max(len(v) for v in twin_levels.values())
    if width_primary != width_twin:
        raise ValueError(
            f'Traveler twin NA chains have different parameter widths '
            f'({width_primary} vs {width_twin})'
        )
    diffs = {}
    for index in range(width_primary):
        values = [
            twin_levels[level][index]
            for level in sorted(primary_levels.keys())
        ]
        if any(
            primary_levels[level][index] != twin_levels[level][index]
            for level in primary_levels
        ):
            diffs[index + 1] = values
    return diffs


def write_twin_block(group_id, twin_group_id, scales):
    """Emit the s1_boy block with Aether-only params, guarding against drift."""
    primary = scales.get(group_id)
    twin = scales.get(twin_group_id)
    if primary is None or twin is None:
        raise ValueError(
            f'Traveler twin groups missing from scales: '
            f'{group_id} / {twin_group_id}'
        )
    diffs = diff_twin_params(primary, twin)
    if not diffs:
        return
    meta = twin_param_meta(primary)
    unknown = [ind for ind in diffs if ind not in meta]
    if unknown:
        raise ValueError(
            f'Traveler twin group {twin_group_id} differs in params '
            f'{sorted(unknown)} that the description does not reference'
        )
    out.write('\t\ts1_boy: {\n')
    for ind in sorted(diffs):
        (name, fmt) = meta[ind]
        out.write('\t\t\t// ' + name + '\n\t\t\t')
        out.write('p%d: [%s],\n' % (ind, ', '.join(
            format_table(list(diffs[ind]), fmt)
        )))
    out.write('\t\t},\n')


def parse_char_skills(charName, scales, skills, depotId, groupmap, sources):
    skillsIds = skills.get(depotId)
    skill_blocks = []

    out.write("\t" + charName + ': {\n')
    for (index, id) in enumerate(sorted(skillsIds)):
        scale = scales.get(id)
        out.write(f'\t\ts{str(index + 1)}_id: {groupmap.get(id) or 0 },\n')
        out.write("\t\ts" + str(index + 1) + ": {\n")
        skill_blocks.append((f's{index + 1}', id, make_tables(scale, id)))
        out.write("\t\t},\n")

        if index == 0:
            twinDepotId = static.traveler_twin_depots.get(depotId)
            if twinDepotId:
                twinSkillsIds = skills.get(twinDepotId)
                if not twinSkillsIds or sorted(twinSkillsIds)[1:] != sorted(skillsIds)[1:]:
                    raise ValueError(
                        f'Traveler twin depots {depotId}/{twinDepotId} diverge '
                        f'beyond the normal-attack chain'
                    )
                twinGroupId = sorted(twinSkillsIds)[0]
                write_twin_block(id, twinGroupId, scales)

    write_param_blocks(collect_param_blocks(depotId, sources), skill_blocks, sources)

    out.write('\t},\n')


def parse_chars():
    file = open(data_dir + 'AvatarExcelConfigData.json', 'r', encoding='utf-8')

    (skills, groupmap) = parse_skills()
    scales = parse_scales()
    sources = {
        'depots': parse_depots(),
        'prouds': parse_proud_groups(),
        'constellations': parse_constellations(),
        'talent_configs': parse_talent_configs(),
        'lang': parse_lang(),
    }
    chars = {}

    for item in json.load(file):
        charId = item['id']
        charName = static.getCharById(charId)

        if not charName:
            continue
        chars[charName] = item

    for charName in sorted(chars.keys()):
        item = chars[charName]

        depotIds = item.get('candSkillDepotIds', [])
        if len(depotIds) > 1:
            for depotId in depotIds:
                charName = static.getCharById(depotId)
                if not charName:
                    continue
                parse_char_skills(charName, scales, skills, depotId, groupmap, sources)
        else:
            parse_char_skills(charName, scales, skills, item.get('skillDepotId'), groupmap, sources)


out = open(out_dir + 'CharTalentTables.js', 'w', encoding='utf-8', newline='\n')
out.write('// This file is autogenerated\n')
out.write('export const charTalentTables = {\n')

parse_chars()

out.write('};\n')
