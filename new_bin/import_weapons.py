import argparse
from collections import OrderedDict

from lib.genshin.datafiles.lang import LangData
from lib.genshin.datafiles.weapons import IGNORED_WEAPONS, WeaponData, WeaponSkillData
from lib.genshin.utils import convert_id
from lib.genshin.strings.templates import weapons as weapons_tpl
from lib.genshin.strings.templates.talents import templates as common_tpl
from lib.genshin.strings.templates.names import (
    color_patterns,
    keywords_eng,
    keywords_rus,
    names_eng,
    names_rus,
)
from lib.genshin.strings.csv import CsvDumper


# These source rows do not yet expose usable localized identities. Keep the
# mapping exact and fail when the source gaps change so the manual name/title
# fallbacks can be removed. Their localized descriptions still use the normal
# generated output.
SOURCE_IDENTITY_OVERRIDES = {
    11437: ('spiked_stake', 'Weapon: Sword', None),
    11438: ('fajian', 'Weapon: Sword', None),
    11522: ('samosvist', 'Weapon: Sword', 'Weapon Affix'),
    14437: ('frost_scepter', 'Weapon: Catalyst', None),
    14524: ('bludnye', 'Weapon: Catalyst', '7.1 Promo Weapon'),
    15437: ('windtalker', 'Weapon: Bow', None),
}


def language_data():
    return {
        'rus': {
            'lang': LangData('RU'),
            'patterns': color_patterns,
            'names': names_rus,
            'keywords': keywords_rus,
        },
        'eng': {
            'lang': LangData('EN'),
            'patterns': color_patterns,
            'names': names_eng,
            'keywords': keywords_eng,
        },
    }


def get_template(weapon_id, lang_name, refinement_level=None):
    suffix = ''
    if refinement_level is not None:
        suffix = f'_refinement_{refinement_level}'
    return (
        getattr(weapons_tpl, f'{weapon_id}{suffix}_{lang_name}', None)
        or getattr(weapons_tpl, f'{weapon_id}{suffix}', None)
    )


def process_description(source_text, lang_config, template):
    result = lang_config['keywords'].process(source_text)
    result = lang_config['names'].process(result)
    result = common_tpl.process(result)
    result = template.process(result)
    if not isinstance(result, list):
        result = [result]
    if not result or any(not item.strip() for item in result):
        raise ValueError('Weapon template produced a blank description')
    return result


def source_affix_rows(weapon_skill_data, affix_id):
    return [
        item for item in weapon_skill_data.get_list()
        if item.get('id') == affix_id
    ]


def source_affix_row(weapon_skill_data, affix_id, refinement_level=None):
    rows = source_affix_rows(weapon_skill_data, affix_id)
    if refinement_level is None:
        for row in rows:
            if row.get('level') is None:
                return row
    else:
        for row in rows:
            if row.get('level') == refinement_level:
                return row
    raise ValueError(
        f'Weapon affix {affix_id} has no source row for refinement level '
        f'{refinement_level!r}'
    )


def append_descriptions(result, talent_name, descriptions, description_names=None):
    lengths = {len(items) for items in descriptions.values()}
    if len(lengths) != 1:
        raise ValueError(f'Localized description count mismatch for {talent_name}')
    count = lengths.pop()
    if description_names is not None and len(description_names) != count:
        raise ValueError(f'Description-name count mismatch for {talent_name}')

    for index in range(count):
        name = talent_name
        if description_names is not None:
            name = f'{talent_name}_{description_names[index]}'
        elif count > 1:
            name = f'{talent_name}_{index + 1}'
        result.append(OrderedDict(
            category='talent_descr',
            name=name,
            rus=descriptions['rus'][index],
            eng=descriptions['eng'][index],
        ))


def collect_weapon_strings():
    weapon_data = WeaponData()
    weapon_skill_data = WeaponSkillData()
    languages = language_data()
    lang_eng = languages['eng']['lang']

    result_names = []
    result_talents = []
    existed_talents = set()
    weapons = {}
    texts = {}

    for weapon in weapon_data.get_list():
        if weapon['id'] in IGNORED_WEAPONS:
            continue
        if weapon.get('rankLevel', 0) < 3:
            continue

        source_name = lang_eng.get(weapon['nameTextMapHash'])
        identity_override = SOURCE_IDENTITY_OVERRIDES.get(weapon['id'])
        if identity_override is None:
            weapon_id = convert_id(source_name)
        else:
            weapon_id, expected_name, _ = identity_override
            if source_name != expected_name:
                raise ValueError(
                    f'Weapon {weapon["id"]} source name changed from the '
                    f'expected placeholder {expected_name!r} to {source_name!r}'
                )
        weapons[weapon_id] = {
            'game_id': weapon['id'],
            'nameTextMapHash': weapon['nameTextMapHash'],
            'skillAffix': weapon['skillAffix'],
            'identity_override': identity_override,
        }

    for weapon_id, weapon in sorted(weapons.items()):
        identity_override = weapon['identity_override']
        if identity_override is None:
            item = OrderedDict(category='weapon_name', name=weapon_id)
            for lang_name, lang_config in languages.items():
                item[lang_name] = lang_config['lang'].get(weapon['nameTextMapHash'])
            result_names.append(item)
            for alias in weapons_tpl.weapon_name_aliases.get(weapon_id, []):
                alias_item = item.copy()
                alias_item['name'] = alias
                result_names.append(alias_item)
        texts[weapon_id] = []

        affix_ids = [affix_id for affix_id in weapon['skillAffix'] if affix_id]
        if identity_override is not None and len(affix_ids) != 1:
            raise ValueError(
                f'Weapon {weapon["game_id"]} has unexpected affixes {affix_ids}'
            )

        for affix_id in affix_ids:
            skill = source_affix_row(weapon_skill_data, affix_id)
            source_skill_name = lang_eng.get(skill['nameTextMapHash'])
            if identity_override is None:
                skill_id = convert_id(source_skill_name)
            else:
                _, _, expected_title = identity_override
                if source_skill_name != expected_title:
                    raise ValueError(
                        f'Weapon {weapon["game_id"]} source title changed from '
                        f'the expected placeholder {expected_title!r} to '
                        f'{source_skill_name!r}'
                    )
                skill_id = f'source_gap_{weapon_id}'
            if skill_id in existed_talents:
                continue
            existed_talents.add(skill_id)

            templates = {
                lang_name: get_template(weapon_id, lang_name)
                for lang_name in languages
            }
            if not any(templates.values()):
                for lang_name, lang_config in languages.items():
                    texts[weapon_id].append(
                        lang_config['lang'].get(skill['nameTextMapHash'])
                    )
                    texts[weapon_id].append(
                        lang_config['lang'].get(skill['descTextMapHash']) + '\n'
                    )
                continue
            if not all(templates.values()):
                raise ValueError(f'Incomplete localized template for {weapon_id}')

            talent_name = f'weapon_{weapon_id}'
            item_name = OrderedDict(category='talent_name', name=talent_name)
            descriptions = {lang_name: [] for lang_name in languages}
            for lang_name, lang_config in languages.items():
                lang = lang_config['lang']
                source_name = lang.get(skill['nameTextMapHash'])
                source_description = lang.get(skill['descTextMapHash'])
                item_name[lang_name] = source_name
                texts[weapon_id].extend([source_name or '', source_description + '\n'])
                descriptions[lang_name].extend(process_description(
                    source_description,
                    lang_config,
                    templates[lang_name],
                ))

            for refinement_level in weapons_tpl.supplemental_refinement_levels.get(
                weapon_id,
                [],
            ):
                supplemental = source_affix_row(
                    weapon_skill_data,
                    affix_id,
                    refinement_level,
                )
                for lang_name, lang_config in languages.items():
                    template = get_template(
                        weapon_id,
                        lang_name,
                        refinement_level,
                    )
                    if template is None:
                        raise ValueError(
                            f'Missing refinement template for {weapon_id} '
                            f'level {refinement_level} ({lang_name})'
                        )
                    descriptions[lang_name].extend(process_description(
                        lang_config['lang'].get(supplemental['descTextMapHash']),
                        lang_config,
                        template,
                    ))

            if identity_override is None:
                result_talents.append(item_name)
            append_descriptions(
                result_talents,
                talent_name,
                descriptions,
                weapons_tpl.description_names.get(weapon_id),
            )

    result_names.sort(key=lambda item: item['name'])
    return result_names, result_talents, texts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--dump-raw-text',
        action='store_true',
        help='Also refresh data/raw/weapon_texts.txt.',
    )
    args = parser.parse_args()

    result_names, result_talents, texts = collect_weapon_strings()
    CsvDumper().dump(result_names, 'weapon_names.csv')
    CsvDumper().dump(result_names, '../../strings_casino/weapon_names.csv')
    CsvDumper().dump(result_talents, 'weapon_talents.csv')
    if args.dump_raw_text:
        from lib.genshin.strings.text import TextDumper
        TextDumper().dump(texts, 'weapon_texts.txt')


if __name__ == '__main__':
    main()
