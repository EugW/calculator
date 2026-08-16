import json
import re

from source_config import excel_path, load_text_map


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
