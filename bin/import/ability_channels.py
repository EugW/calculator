"""Stat channels of every talent, weapon and artifact set effect.

Writes data/raw/ability_channels.txt: for each character, weapon and artifact
set, the effects of its abilities with the stats they read and write and the
channel of each (see channel_scan.py). The params are positions of the game's
paramList: a1.p1 is charTalentTables.<character>.a1.p1, p1 of a weapon is
weaponPassiveTables.<weapon>.p1, pc4.p1 of a set is
artifactSetTables.<set>.pc4.p1.

    python ability_channels.py --data-root <checkout> --expected-data-revision <rev>
"""

import json
import os
import re

import static
from channel_scan import scan_unit
from char_common import (
    PARAM_REFERENCE_RE,
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
from equip_common import (
    equip_affixes,
    load_excel,
    set_blocks,
    set_key,
    weapon_affix_rows,
    weapon_names,
)
from source_config import bin_output_path

dirname = os.path.dirname(__file__)
out_dir = os.path.join(dirname, '../../data/raw/')

ABILITY_FOLDERS = ('AvatarAbilities', 'EquipAbilities', 'TeamAbilities')
TEAM_FILES = ('ConfigAbility_Team.json',)
# Ability files shared by every character: their abilities are listed only
# when a talent names them.
SHARED_FILE_RE = re.compile(r'_(Common|AllDefault)\.json$')


def load_abilities():
    """({ability name: config}, {ability name: file name})."""
    abilities = {}
    files = {}
    root = bin_output_path('Ability', 'Temp')
    paths = []
    for folder in ABILITY_FOLDERS:
        paths += sorted(path for path in (root / folder).glob('*.json') if path.is_file())
    paths += [root / name for name in TEAM_FILES]
    for path in paths:
        with path.open('r', encoding='utf-8') as file:
            data = json.load(file)
        for item in data if isinstance(data, list) else [data]:
            ability = item.get('Default', item) if isinstance(item, dict) else None
            name = ability.get('abilityName') if isinstance(ability, dict) else None
            if not name:
                continue
            if name in abilities:
                raise ValueError(f'Ability {name} is defined twice ({files[name]}, {path.name})')
            abilities[name] = ability
            files[name] = path.name
    return (abilities, files)


def build_unit(blocks, configs, abilities, files, own_files=False):
    """Scan the abilities of one owner.

    blocks: [(key, title, openConfig, positions)] in display order, positions
    being the paramList positions the generated table has for the block.
    own_files adds the abilities that share a file with the linked ones (a
    character's file).
    """
    block_records = []
    ability_blocks = {}
    param_refs = {}
    for (key, title, open_config, positions) in blocks:
        (linked, targets) = talent_config_links(configs.get(open_config) or [])
        linked = [name for name in linked if name in abilities]
        block_records.append({
            'key': key,
            'title': title,
            'config': open_config,
            'abilities': linked,
        })
        for name in linked:
            ability_blocks.setdefault(name, []).append(key)
        for (index, index_targets) in sorted(targets.items()):
            # A position the generated table leaves out (the zero tail of a
            # list, a skill param no description names) is not cited: its
            # ability parameter then shows as one no talent feeds.
            if index not in positions:
                continue
            for (ability, special, _) in index_targets:
                ref = f'{key}.p{index}' if key else f'p{index}'
                refs = param_refs.setdefault((ability, special), [])
                if ref not in refs:
                    refs.append(ref)

    unit_abilities = {name: abilities[name] for name in ability_blocks}
    if own_files:
        unit_files = {
            files[name] for name in ability_blocks
            if not SHARED_FILE_RE.search(files[name])
        }
        for name in sorted(abilities):
            if files[name] in unit_files:
                unit_abilities.setdefault(name, abilities[name])

    return {
        'blocks': block_records,
        'abilities': ability_records(unit_abilities, abilities, ability_blocks, param_refs),
    }


def ability_records(unit_abilities, abilities, ability_blocks, param_refs):
    """Scan results with their params named.

    A param a talent feeds becomes its position (a1.p1); one that no talent
    feeds is a constant of the ability and keeps its name and default. An
    effect belongs to the block of its first param, else to the first block
    that names its ability.
    """
    records = {}
    for (name, scan) in scan_unit(unit_abilities).items():
        effects = []
        for effect in scan['effects']:
            params = []
            specials = []
            for (ability, special) in effect.pop('specials'):
                refs = param_refs.get((ability, special))
                for ref in refs or []:
                    if ref not in params:
                        params.append(ref)
                default = (abilities[ability].get('abilitySpecials') or {}).get(special)
                # Without a default it is a cache the ability fills itself.
                if not refs and isinstance(default, (int, float)) and default:
                    text = special + '=' + format_param(default)
                    if text not in specials:
                        specials.append(text)
            effect['params'] = params
            effect['specials'] = specials
            blocks = ability_blocks.get(name, [])
            if params and '.' in params[0]:
                effect['block'] = params[0].split('.')[0]
            else:
                effect['block'] = blocks[0] if blocks else None
            effects.append(effect)
        records[name] = {
            'blocks': ability_blocks.get(name, []),
            'effects': effects,
            'unattributed': scan['unattributed'],
        }
    return records


def param_positions(rows):
    """The paramList positions the generated tables keep: all but the zero tail."""
    width = max(len(trim_params(row['paramList'])) for row in rows)
    return set(range(1, width + 1))


def title_of(row, lang):
    return lang.get(str(row.get('nameTextMapHash'))) or ''


def character_units(abilities, files, lang):
    (skills, _) = parse_skills()
    scales = parse_scales()
    skill_rows = {
        row['proudSkillGroupId']: row
        for row in load_excel('AvatarSkillExcelConfigData.json')
        if row.get('proudSkillGroupId')
    }
    depots = parse_depots()
    prouds = parse_proud_groups()
    constellations = parse_constellations()
    configs = parse_talent_configs('AvatarTalents')

    depot_names = {}
    for item in load_excel('AvatarExcelConfigData.json'):
        if not static.getCharById(item['id']):
            continue
        depot_ids = item.get('candSkillDepotIds') or []
        if len(depot_ids) > 1:
            for depot_id in depot_ids:
                if static.getCharById(depot_id):
                    depot_names[static.getCharById(depot_id)] = depot_id
        else:
            depot_names[static.getCharById(item['id'])] = item.get('skillDepotId')

    result = {}
    for name in sorted(depot_names):
        depot_id = depot_names[name]
        depot = depots[depot_id]
        blocks = []
        for (index, group_id) in enumerate(sorted(skills.get(depot_id) or []), start=1):
            row = prouds.get(group_id) or {}
            title = title_of(skill_rows.get(group_id) or {}, lang)
            # A skill block lists the params its descriptions name.
            described = {
                int(position)
                for description in (scales.get(group_id) or {}).get('desc') or []
                if description
                for position in PARAM_REFERENCE_RE.findall(description)
            }
            blocks.append((f's{index}', title, row.get('openConfig') or '', described))
        for (key, group_id) in passive_block_keys(depot):
            row = prouds.get(group_id)
            if row:
                blocks.append((
                    key, title_of(row, lang), row.get('openConfig') or '',
                    param_positions([row]),
                ))
        for (index, talent_id) in enumerate(depot.get('talents') or [], start=1):
            row = constellations.get(talent_id)
            if row:
                blocks.append((
                    f'c{index}', title_of(row, lang), row.get('openConfig') or '',
                    param_positions([row]),
                ))
        result[name] = build_unit(blocks, configs, abilities, files, own_files=True)
    return result


def weapon_units(abilities, files, lang, affixes):
    names = weapon_names()
    configs = parse_talent_configs('EquipTalents')
    result = {}
    for item in load_excel('WeaponExcelConfigData.json'):
        name = names.get(item['id'])
        rows = weapon_affix_rows(item, affixes)
        if not name or not rows:
            continue
        # A refinement only changes the params, not the config.
        row = rows[0]
        unit = build_unit(
            [('', title_of(row, lang), row.get('openConfig') or '', param_positions(rows))],
            configs, abilities, files,
        )
        unit['id'] = item['id']
        unit['title'] = title_of(item, lang)
        result[name] = unit
    return dict(sorted(result.items()))


def set_units(abilities, files, lang, affixes):
    configs = parse_talent_configs('RelicTalents')
    result = {}
    for item in load_excel('ReliquarySetExcelConfigData.json'):
        rows = set_blocks(item, affixes)
        title = title_of(rows[0][1], lang) if rows else ''
        if not title:
            continue
        blocks = [
            (key, '', row.get('openConfig') or '', param_positions([row]))
            for (key, row) in rows
        ]
        unit = build_unit(blocks, configs, abilities, files)
        unit['id'] = item['setId']
        unit['title'] = title
        key = set_key(item, title)
        if key in result:
            raise ValueError(f'Two artifact sets are named {title!r}')
        result[key] = unit
    return dict(sorted(result.items()))


def team_unit(abilities, files):
    """Elemental Resonance, Moonsign and the other team abilities."""
    team_files = set(TEAM_FILES)
    root = bin_output_path('Ability', 'Temp', 'TeamAbilities')
    team_files.update(path.name for path in root.glob('*.json'))
    names = [name for name in sorted(abilities) if files[name] in team_files]
    unit_abilities = {name: abilities[name] for name in names}
    return {
        'blocks': [],
        'abilities': ability_records(unit_abilities, abilities, {}, {}),
    }


# --- text


def effect_line(effect):
    target = effect['target']
    if effect['kind'] == 'stat':
        target += f" [write {effect['write']}]" if effect['write'] else ' [no channel]'
    elif effect['kind'] == 'enemy':
        target += ' [on the opponent]'
    if effect.get('tags'):
        target += ' (' + ', '.join(effect['tags']) + ')'
    if effect['reads']:
        source = ' <- ' + ', '.join(
            f"{read['stat']} {read['channel']}" for read in effect['reads']
        )
    else:
        source = ', flat'
    names = ', '.join(effect['params'])
    if effect['specials']:
        names += ('; ' if names else '') + ', '.join(effect['specials'])
    where = (effect['where'] + ': ') if effect['where'] else ''
    return where + target + source + (' | ' + names if names else '')


def unit_lines(unit):
    lines = []

    def block_lines(key):
        """Effects of one block (None: abilities no talent names)."""
        result = []
        for (name, record) in unit['abilities'].items():
            primary = record['blocks'][0] if record['blocks'] else None
            effects = [effect for effect in record['effects'] if effect['block'] == key]
            unused = record['unattributed'] if primary == key else []
            if not effects and not unused:
                continue
            result.append('  ' + name)
            conditions = []
            for effect in effects:
                if effect['kind'] == 'condition':
                    for read in effect['reads']:
                        text = f"{read['stat']} {read['channel']}"
                        if text not in conditions:
                            conditions.append(text)
                    continue
                result.append('    ' + effect_line(effect))
            if conditions:
                result.append('    conditions read: ' + ', '.join(conditions))
            for read in unused:
                result.append(f"    unused read: {read['stat']} {read['channel']} ({read['prop']})")
        return result

    for block in unit['blocks']:
        body = block_lines(block['key'])
        if not body:
            continue
        header = block['key']
        if block['title']:
            header += ('  ' if header else '') + block['title']
        if block['config']:
            header += ('  ' if header else '') + f"({block['config']})"
        lines.append(header)
        lines += body
    rest = block_lines(None)
    if rest:
        if unit['blocks']:
            lines.append('other abilities')
        lines += rest
    return lines


HEADER = '''\
# Stat channels of talent, weapon and artifact set effects, from the game's
# ability configs. Generated by bin/import/ability_channels.py; do not edit.
#
#   <modifier>: <what is written> <- <stats read> | <params>
#
# read:   premod = the stat without "extra" bonuses (FIGHT_PROP_NONEXTRA_*)
#         total  = the final stat (FIGHT_PROP_CUR_*, MAX_HP, plain names)
#         base   = FIGHT_PROP_BASE_*
#         no marker = the game names the stat only (reaction base bonuses)
# write:  [write extra]  = Actor_*ExtraDelta: premod reads do not see it
#         [write premod] = Actor_*Delta / *Ratio of a stat with an extra lane
#         [no channel]   = the stat has no extra lane
#         [on the opponent] = CRIT against that opponent, not the member's stat
#         no bracket     = a bonus of the hits, a heal or a shield, not a stat
# flat:   the value reads no stat.
# params: a1.p1 is charTalentTables.<character>.a1.p1, p1 of a weapon is
#         weaponPassiveTables.<weapon>.p1, pc4.p1 of a set is
#         artifactSetTables.<set>.pc4.p1; a bare name is an ability parameter
#         no talent feeds, with its default.
# "conditions read": stats the ability compares in its conditions.
# "unused read": the ability stores a stat that no listed effect uses.
'''


def write_text(data, path):
    with open(path, 'w', encoding='utf-8', newline='\n') as out:
        out.write(HEADER)
        for (section, title) in (
            ('chars', 'Characters'), ('weapons', 'Weapons'),
            ('sets', 'Artifact sets'), ('team', 'Team'),
        ):
            out.write(f'\n\n######## {title} ########\n')
            for (name, unit) in data[section].items():
                lines = unit_lines(unit)
                if not lines:
                    continue
                label = name
                if unit.get('title') and unit['title'] != name:
                    label += f"  ({unit['title']})"
                out.write(f'\n=== {label} ===\n')
                out.write('\n'.join(lines) + '\n')


def main():
    lang = parse_lang()
    (abilities, files) = load_abilities()
    affixes = equip_affixes()
    data = {
        'chars': character_units(abilities, files, lang),
        'weapons': weapon_units(abilities, files, lang, affixes),
        'sets': set_units(abilities, files, lang, affixes),
        'team': {'Team': team_unit(abilities, files)},
    }
    write_text(data, out_dir + 'ability_channels.txt')


if __name__ == '__main__':
    main()
