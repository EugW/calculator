import json
import os
import re
import static

from char_common import parse_scales, parse_skills
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


def parse_char_skills(charName, scales, skills, depotId, groupmap):
    skillsIds = skills.get(depotId)

    out.write("\t" + charName + ': {\n')
    for (index, id) in enumerate(sorted(skillsIds)):
        scale = scales.get(id)
        out.write(f'\t\ts{str(index + 1)}_id: {groupmap.get(id) or 0 },\n')
        out.write("\t\ts" + str(index + 1) + ": {\n")
        make_tables(scale, id)
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

    out.write('\t},\n')


def parse_chars():
    file = open(data_dir + 'AvatarExcelConfigData.json', 'r', encoding='utf-8')

    (skills, groupmap) = parse_skills()
    scales = parse_scales()
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
                parse_char_skills(charName, scales, skills, depotId, groupmap)
        else:
            parse_char_skills(charName, scales, skills, item.get('skillDepotId'), groupmap)


out = open(out_dir + 'CharTalentTables.js', 'w', encoding='utf-8', newline='\n')
out.write('// This file is autogenerated\n')
out.write('export const charTalentTables = {\n')

parse_chars()

out.write('};\n')
