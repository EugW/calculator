import functools
import json
import re
import struct
from decimal import Decimal

from source_config import bin_output_path, excel_path, load_text_map


@functools.lru_cache(maxsize=None)
def parse_lang():
    return load_text_map('EN')


PARAM_REFERENCE_RE = re.compile(r'param(\d+):')
PROUD_PARAM_DESCRIPTION_OVERRIDES = {
    (
        14339,
        'Elemental Burst Spirit Blade DMG/Stellar Spirit Blade DMG|'
        '{param4:F1P}/{param5:F1P}',
    ): (
        'Elemental Burst Spirit Blade DMG/Stellar Spirit Blade DMG|'
        '{param1:F1P}/{param2:F1P}'
    ),
}


def normalize_proud_param_description(group_id, description):
    if not description:
        return description
    return PROUD_PARAM_DESCRIPTION_OVERRIDES.get(
        (group_id, description),
        description,
    )


def normalize_proud_group(group_id, levels, descriptions):
    """Validate referenced params and remove only all-zero tail padding."""
    referenced = {
        int(index)
        for description in descriptions
        if description
        for index in PARAM_REFERENCE_RE.findall(description)
    }
    highest_reference = max(referenced, default=0)

    for level, params in levels.items():
        if highest_reference > len(params):
            raise ValueError(
                f'ProudSkill group {group_id} level {level} references '
                f'param{highest_reference}, but has only {len(params)} params'
            )

    retained_width = highest_reference
    for params in levels.values():
        for index, value in enumerate(params, start=1):
            if value != 0:
                retained_width = max(retained_width, index)

    normalized = {}
    for level, params in levels.items():
        normalized[level] = params[:retained_width]
    return normalized


def parse_scales():
    lang = parse_lang()
    result = {}

    with excel_path('ProudSkillExcelConfigData.json').open('r', encoding='utf-8') as file:
        rows = json.load(file)

    for item in rows:
        skillId = item['proudSkillGroupId']
        skillLevel = item['level']

        if skillId not in result:
            result[skillId] = {
                'levels': {},
                'desc': [],
            }

        if skillLevel == 1:
            for desc in item['paramDescList']:
                description = lang.get(str(desc))
                result[skillId]['desc'].append(
                    normalize_proud_param_description(skillId, description)
                )

        result[skillId]['levels'][skillLevel] = list(item['paramList'])

    for skill_id, skill in result.items():
        skill['levels'] = normalize_proud_group(
            skill_id,
            skill['levels'],
            skill['desc'],
        )

    return result


def parse_skills():
    result = {}
    skills = {}
    gr_to_id = {}

    with excel_path('AvatarSkillExcelConfigData.json').open('r', encoding='utf-8') as file:
        skill_rows = json.load(file)
    with excel_path('AvatarSkillDepotExcelConfigData.json').open('r', encoding='utf-8') as file:
        depot_rows = json.load(file)

    for item in skill_rows:
        gr = item.get('proudSkillGroupId')
        if not gr:
            continue

        skills[item['id']] = gr
        gr_to_id[gr] = item['id']

    for item in depot_rows:
        ids = []

        id = skills.get(item.get('energySkill'))
        if id:
            ids.append(id)

        for id in item.get("skills", []):
            id = skills.get(id)
            if id:
                ids.append(id)

        result[item['id']] = ids

    return (result, gr_to_id)


def format_param(value):
    """Shortest decimal that reads back as the same 32-bit float.

    The Excel tables print 32-bit params as doubles (0.004000000189989805 for
    0.004). Passive and constellation params have no format code, so they are
    written raw and must keep small fractions (0.00007) that '%.4f' drops.
    """
    if value == int(value):
        return str(int(value))
    packed = struct.pack('<f', value)
    if struct.unpack('<f', packed)[0] != value:
        # Not a 32-bit float printed as a double: a dump that already
        # prints the short decimal (3.5e-05 in the 7.2 release).
        return format(Decimal(repr(value)), 'f')
    for digits in range(1, 10):
        text = '%.*g' % (digits, value)
        if struct.pack('<f', float(text)) == packed:
            break
    return format(Decimal(text), 'f')


def format_scaled_param(value, scale):
    """format_param of value x scale, without the float noise of multiplying.

    0.2 is stored as 0.20000000298...; scaled by 100 it must print as 20.
    """
    scaled = Decimal(format_param(value)) * scale
    return format(scaled.normalize(), 'f')


def trim_params(params):
    """Drop the all-zero tail padding of a paramList."""
    width = 0
    for index, value in enumerate(params, start=1):
        if value != 0:
            width = index
    return list(params[:width])


def passive_block_keys(depot):
    """[(block key, proudSkillGroupId)] for a depot's passive talents.

    a1 / a4 are the ascension passives, a0 the ones open from the start and sp
    the specially unlocked ones (Hexerei and quest passives). A second passive
    of the same kind gets a _2 suffix.
    """
    result = []
    counts = {}

    def add(prefix, group_id):
        counts[prefix] = counts.get(prefix, 0) + 1
        suffix = '' if counts[prefix] == 1 else f'_{counts[prefix]}'
        result.append((prefix + suffix, group_id))

    for skill_open in depot.get('inherentProudSkillOpens') or []:
        group_id = skill_open.get('proudSkillGroupId')
        if group_id:
            add(f"a{skill_open.get('needAvatarPromoteLevel', 0)}", group_id)
    for skill_open in special_proud_skill_opens(depot):
        group_id = skill_open.get('proudSkillGroupId')
        if group_id:
            add('sp', group_id)
    return result


def special_proud_skill_opens(depot):
    """A depot's specially unlocked passives.

    Some dumps still carry the field under an obfuscated name (LHFOOPMJHBN in
    the 7.2 release), and the name changes with the dump: there it is the
    depot's other list of proudSkillGroupId entries.
    """
    if 'specialProudSkillOpens' in depot:
        return depot.get('specialProudSkillOpens') or []

    found = [
        value for (key, value) in depot.items()
        if key != 'inherentProudSkillOpens' and isinstance(value, list)
        and any(isinstance(entry, dict) and 'proudSkillGroupId' in entry for entry in value)
    ]
    if len(found) > 1:
        raise ValueError(
            f"Skill depot {depot.get('id')} has several lists of passives besides "
            'inherentProudSkillOpens: which one is specialProudSkillOpens is not known'
        )
    return [entry for entry in (found[0] if found else []) if isinstance(entry, dict)]


# Talent config entries name the ability parameter each paramList position
# feeds. Some configs in the dump still carry obfuscated field names.
TALENT_ENTRY_FIELDS = {
    'ability': ('abilityName', 'NCCKLDFFDOH'),
    'special': ('paramSpecial', 'LDACNDBDKBA'),
    'delta': ('paramDelta', 'IJFENBIJGLJ'),
}
PARAM_DELTA_RE = re.compile(r'^(-?)%(\d+)$')


def _talent_entry_field(entry, name):
    for key in TALENT_ENTRY_FIELDS[name]:
        if key in entry:
            return entry[key]
    return None


def talent_config_links(entries):
    """Abilities and param targets of one talent config (an openConfig).

    Returns (abilities, targets): the ability names the config touches, in
    order, and {param index: [(ability, special, note)]} for the positions it
    passes on ('%2' is paramList position 2, '-%2' subtracts it).
    """
    abilities = []
    targets = {}
    for entry in entries:
        ability = _talent_entry_field(entry, 'ability')
        if not isinstance(ability, str) or not ability:
            continue
        if ability not in abilities:
            abilities.append(ability)
        special = _talent_entry_field(entry, 'special')
        delta = _talent_entry_field(entry, 'delta')
        match = PARAM_DELTA_RE.match(delta) if isinstance(delta, str) else None
        if not match or not special:
            continue
        notes = []
        if match.group(1):
            notes.append('subtracted')
        # Zero is the field's default: some dumps leave it out, others write it.
        if entry.get('paramRatio'):
            notes.append(f"paramRatio {format_param(entry['paramRatio'])}")
        target = (ability, special, ', '.join(notes))
        index_targets = targets.setdefault(int(match.group(2)), [])
        if target not in index_targets:
            index_targets.append(target)
    return (abilities, targets)


def parse_talent_configs(folder='AvatarTalents'):
    """{openConfig: entries} of one BinOutput/Talent folder."""
    result = {}
    directory = bin_output_path('Talent', folder)
    for path in sorted(directory.glob('*.json')):
        with path.open('r', encoding='utf-8') as file:
            data = json.load(file)
        if not isinstance(data, dict):
            continue
        for open_config, entries in data.items():
            if not isinstance(entries, list):
                continue
            if open_config in result and result[open_config] != entries:
                raise ValueError(
                    f'Talent config {open_config} is defined twice with '
                    f'different entries ({path.name})'
                )
            result[open_config] = entries
    return result


def parse_depots():
    with excel_path('AvatarSkillDepotExcelConfigData.json').open('r', encoding='utf-8') as file:
        return {item['id']: item for item in json.load(file)}


def parse_proud_groups():
    """{proudSkillGroupId: its level 1 row} (name, openConfig, paramList)."""
    with excel_path('ProudSkillExcelConfigData.json').open('r', encoding='utf-8') as file:
        return {
            item['proudSkillGroupId']: item
            for item in json.load(file)
            if item['level'] == 1
        }


def parse_constellations():
    """{talentId: row} of the constellation table."""
    with excel_path('AvatarTalentExcelConfigData.json').open('r', encoding='utf-8') as file:
        return {item['talentId']: item for item in json.load(file)}
