import requests
import re
import argparse
import os
import sys
from typing import List, Dict

PROPS = {
    'FIGHT_PROP_BASE_HP': 'hp_base',
    'FIGHT_PROP_BASE_ATTACK': 'atk_base',
    'FIGHT_PROP_BASE_DEFENSE': 'def_base',
    'FIGHT_PROP_WIND_ADD_HURT': 'dmg_anemo_base',
    'FIGHT_PROP_FIRE_ADD_HURT': 'dmg_pyro_base',
    'FIGHT_PROP_WATER_ADD_HURT': 'dmg_hydro_base',
    'FIGHT_PROP_ICE_ADD_HURT': 'dmg_cryo_base',
    'FIGHT_PROP_ROCK_ADD_HURT': 'dmg_geo_base',
    'FIGHT_PROP_GRASS_ADD_HURT': 'dmg_dendro_base',
    'FIGHT_PROP_ELEC_ADD_HURT': 'dmg_electro_base',
    'FIGHT_PROP_PHYSICAL_ADD_HURT': 'dmg_phys_base',
    'FIGHT_PROP_CRITICAL': 'crit_rate_base',
    'FIGHT_PROP_CRITICAL_HURT': 'crit_dmg_base',
    'FIGHT_PROP_ATTACK_PERCENT': 'atk_percent',
    'FIGHT_PROP_HP_PERCENT': 'hp_percent',
    'FIGHT_PROP_DEFENSE_PERCENT': 'def_percent',
    'FIGHT_PROP_ELEMENT_MASTERY': 'mastery',
    'FIGHT_PROP_CHARGE_EFFICIENCY': 'recharge_base',
    'FIGHT_PROP_HEAL_ADD': 'heal_bonus_base',
}

CURVES = {
    'GROW_CURVE_ATTACK_S4': 'charScales.s4atk',
    'GROW_CURVE_HP_S4': 'charScales.s4hp',
    'GROW_CURVE_ATTACK_S5': 'charScales.s5atk',
    'GROW_CURVE_HP_S5': 'charScales.s5hp',
}

# Hakushin returns element names directly (e.g., "Hydro"), not internal names
ELEMENTS = {
    'ANEMO': 'anemo',
    'PYRO': 'pyro',
    'CRYO': 'cryo',
    'HYDRO': 'hydro',
    'GEO': 'geo',
    'DENDRO': 'dendro',
    'ELECTRO': 'electro',
}

WEAPON_TYPES = {
    'WEAPON_SWORD_ONE_HAND': 'sword',
    'WEAPON_CLAYMORE': 'claymore',
    'WEAPON_BOW': 'bow',
    'WEAPON_CATALYST': 'catalyst',
    'WEAPON_POLE': 'polearm',
}

RARITY_NAMES = {
    'QUALITY_ORANGE': 5,
    'QUALITY_PURPLE': 4,
}

# Character ID mapping
CHAR_IDS = {
    10000002: 'Ayaka',
    10000003: 'Jean',
    10000006: 'Lisa',
    10000014: 'Barbara',
    10000015: 'Kaeya',
    10000016: 'Diluc',
    10000020: 'Razor',
    10000021: 'Amber',
    10000022: 'Venti',
    10000023: 'Xiangling',
    10000024: 'Beidou',
    10000025: 'Xingqiu',
    10000026: 'Xiao',
    10000027: 'Ningguang',
    10000029: 'Klee',
    10000030: 'Zhongli',
    10000031: 'Fischl',
    10000032: 'Bennett',
    10000033: 'Tartaglia',
    10000034: 'Noelle',
    10000035: 'Qiqi',
    10000036: 'Chongyun',
    10000037: 'Ganyu',
    10000038: 'Albedo',
    10000039: 'Diona',
    10000041: 'Mona',
    10000042: 'Keqing',
    10000043: 'Sucrose',
    10000044: 'Xinyan',
    10000045: 'Rosaria',
    10000046: 'Hutao',
    10000047: 'Kazuha',
    10000048: 'YanFei',
    10000049: 'Yoimiya',
    10000050: 'Thoma',
    10000051: 'Eula',
    10000052: 'RaidenShogun',
    10000053: 'Sayu',
    10000054: 'Kokomi',
    10000055: 'Gorou',
    10000056: 'Sara',
    10000057: 'Itto',
    10000058: 'YaeMiko',
    10000059: 'Heizou',
    10000060: 'Yelan',
    10000061: 'Kirara',
    10000062: 'Aloy',
    10000063: 'Shenhe',
    10000064: 'YunJin',
    10000065: 'Kuki',
    10000066: 'Ayato',
    10000067: 'Collei',
    10000068: 'Dori',
    10000069: 'Tighnari',
    10000070: 'Nilou',
    10000071: 'Cyno',
    10000072: 'Candace',
    10000073: 'Nahida',
    10000074: 'Layla',
    10000075: 'Wanderer',
    10000076: 'Faruzan',
    10000077: 'Yaoyao',
    10000078: 'Alhaitham',
    10000079: 'Dehya',
    10000080: 'Mika',
    10000081: 'Kaveh',
    10000082: 'Baizhu',
    10000083: 'Lynette',
    10000084: 'Lyney',
    10000085: 'Freminet',
    10000086: 'Wriothesley',
    10000087: 'Neuvillette',
    10000088: 'Charlotte',
    10000089: 'Furina',
    10000090: 'Chevreuse',
    10000091: 'Navia',
    10000092: 'Gaming',
    10000093: 'Xianyun',
    10000094: 'Chiori',
    10000095: 'Sigewinne',
    10000096: 'Arlecchino',
    10000097: 'Sethos',
    10000098: 'Clorinde',
    10000099: 'Emilie',
    10000100: 'Kachina',
    10000101: 'Kinich',
    10000102: 'Mualani',
    10000103: 'Xilonen',
    10000104: 'Chasca',
    10000105: 'Ororon',
    10000106: 'Mavuika',
    10000107: 'Citlali',
    10000108: 'LanYan',
    10000109: 'Mizuki',
    10000110: 'Iansan',
    10000111: 'Varesa',
    10000112: 'Escoffier',
    10000113: 'Ifa',
    10000114: 'Skirk',
    10000115: 'Dahlia',
    10000116: 'Ineffa',
    10000119: 'Lauma',
    10000120: 'Flins',
    10000121: 'Aino',
    10000122: 'Nefer',
    10000123: 'Durin',
    10000124: 'Jahoda',
    10000125: 'Columbina',
    10000126: 'Zibai',
}

# Reverse mapping: name -> id
CHAR_NAMES = {v: k for k, v in CHAR_IDS.items()}

# Get project root directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CHAR_TABLES_PATH = os.path.join(PROJECT_ROOT, 'src', 'js', 'db', 'generated', 'CharTables.js')
TALENT_TABLES_PATH = os.path.join(PROJECT_ROOT, 'src', 'js', 'db', 'generated', 'CharTalentTables.js')

API_URL = 'https://api.hakush.in/gi/data/en/character'


def fetch_char_data(char_id: int) -> dict:
    """Fetch character data from Hakushin API."""
    url = f'{API_URL}/{char_id}.json'
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f'Failed to fetch data for character {char_id}: {response.status_code}')
    return response.json()


def parse_char_tables(char_name: str) -> dict:
    """Parse CharTables.js and extract stats for a character."""
    with open(CHAR_TABLES_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the character's section
    pattern = rf'\t{char_name}: \[(.*?)\t\],'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return None

    section = match.group(1)
    stats = {}

    # Stat name normalization
    STAT_ALIASES = {
        'mastery_base': 'mastery',
        'em_base': 'mastery',
        'healing_base': 'heal_bonus_base',
    }

    # Split into individual StatTableAscensionScale entries
    entries = re.split(r'new StatTableAscensionScale\(\{', section)
    for entry in entries[1:]:
        stat_match = re.search(r"stat: '([^']+)'", entry)
        if not stat_match:
            continue
        stat_name = stat_match.group(1)
        stat_name = STAT_ALIASES.get(stat_name, stat_name)

        base_match = re.search(r'base: ([\d.]+)', entry)
        if not base_match:
            continue
        base = float(base_match.group(1))

        ascension = None
        asc_match = re.search(r"ascension: new StatTable\('', \[([^\]]+)\]", entry)
        if asc_match:
            ascension = [float(x.strip()) for x in asc_match.group(1).split(',')]

        stats[stat_name] = {'base': base, 'ascension': ascension}

    return stats


def parse_talent_tables(char_name: str) -> dict:
    """Parse CharTalentTables.js and extract talents for a character."""
    with open(TALENT_TABLES_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = rf'\t{char_name}: \{{(.*?)\n\t\}},'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return None

    section = match.group(1)
    talents = {}

    skill_pattern = r's(\d+): \{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
    for skill_match in re.finditer(skill_pattern, section):
        skill_num = skill_match.group(1)
        skill_content = skill_match.group(2)

        talents[f's{skill_num}'] = {}

        param_pattern = r'p(\d+): \[([^\]]+)\]'
        for param_match in re.finditer(param_pattern, skill_content):
            param_num = param_match.group(1)
            values_str = param_match.group(2)
            values = [float(x.strip()) for x in values_str.split(',')]
            talents[f's{skill_num}'][f'p{param_num}'] = values

    return talents


def get_api_stats(data: dict) -> dict:
    """Extract stats from Hakushin API data in comparable format."""
    stats = {}

    # Base stats directly from root
    stats['hp_base'] = {'base': data.get('BaseHP', 0), 'ascension': None}
    stats['atk_base'] = {'base': data.get('BaseATK', 0), 'ascension': None}
    stats['def_base'] = {'base': data.get('BaseDEF', 0), 'ascension': None}

    # Percent stats that need * 100 when comparing
    PERCENT_STATS = {
        'crit_rate', 'crit_rate_base', 'crit_dmg', 'crit_dmg_base',
        'atk_percent', 'hp_percent', 'def_percent',
        'recharge_base',
        'dmg_pyro_base', 'dmg_hydro_base', 'dmg_electro_base', 'dmg_anemo_base',
        'dmg_cryo_base', 'dmg_geo_base', 'dmg_dendro_base', 'dmg_phys_base',
        'heal_bonus_base',
    }

    # Ascension stats from StatsModifier.Ascension
    if 'StatsModifier' in data and 'Ascension' in data['StatsModifier']:
        ascension_stats = {}
        for level, asc_data in enumerate(data['StatsModifier']['Ascension']):
            for prop, value in asc_data.items():
                if prop not in PROPS:
                    continue
                stat_name = PROPS[prop]
                if stat_name not in ascension_stats:
                    ascension_stats[stat_name] = [0, 0, 0, 0, 0, 0]
                # Convert percentage stats to whole numbers
                if stat_name in PERCENT_STATS:
                    value = value * 100
                ascension_stats[stat_name][level] = value

        for stat_name, values in ascension_stats.items():
            if stat_name not in stats:
                stats[stat_name] = {'base': 0, 'ascension': values}
            else:
                stats[stat_name]['ascension'] = values

    return stats


def get_api_talents(data: dict) -> dict:
    """Extract talent multipliers from Hakushin API data in comparable format."""
    talents = {}

    if 'Skills' not in data:
        return talents

    for index, talent in enumerate(data['Skills']):
        skill_index = index + 1
        skill_key = f's{skill_index}'
        talents[skill_key] = {}

        params2descr = {}
        params_tables = {}

        for level in sorted(talent['Promote'].values(), key=lambda x: x['Level']):
            if not params2descr:
                for descr in level.get('Desc', []):
                    if not descr:
                        continue
                    parts = descr.split('|')
                    if len(parts) < 2:
                        continue
                    params_str = parts[1]
                    params_indices = re.findall(r'param(\d+):(\w+)\b', params_str)
                    for (ind, fmt) in params_indices:
                        ind = int(ind)
                        params2descr[ind] = {'format': fmt}
                        params_tables[ind] = []

            for ind in params2descr.keys():
                if ind - 1 < len(level['Param']):
                    params_tables[ind].append(level['Param'][ind - 1])

        for ind, values in params_tables.items():
            fmt = params2descr[ind]['format']
            is_percent = 'P' in fmt

            formatted = []
            for val in values:
                if is_percent:
                    val *= 100
                formatted.append(round(val, 4))

            # Trim trailing duplicates
            while len(formatted) > 1 and formatted[-1] == formatted[-2]:
                formatted.pop()

            talents[skill_key][f'p{ind}'] = formatted

    return talents


def compare_values(expected, actual, rel_tolerance=0.001, abs_tolerance=0.1) -> bool:
    """Compare two values with relative and absolute tolerance."""
    if expected is None and actual is None:
        return True
    if expected is None or actual is None:
        return False

    def values_match(e, a):
        threshold = max(rel_tolerance * abs(e), abs_tolerance)
        return abs(e - a) <= threshold

    if isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            return False
        return all(values_match(e, a) for e, a in zip(expected, actual))
    return values_match(expected, actual)


def validate_character(char_id: int, char_name: str, stats_only: bool = False) -> list:
    """Validate a character's data against Hakushin API. Returns list of mismatches."""
    mismatches = []

    # Universal stats that every character has but API doesn't report
    UNIVERSAL_STATS = {
        'crit_rate_base': 5,
        'crit_dmg_base': 50,
        'recharge_base': 100,
    }

    try:
        api_data = fetch_char_data(char_id)
    except Exception as e:
        return [f'Failed to fetch API data: {e}']

    # Validate stats
    local_stats = parse_char_tables(char_name)
    if local_stats is None:
        mismatches.append(f'Character {char_name} not found in CharTables.js')
    else:
        api_stats = get_api_stats(api_data)

        for stat_name, api_values in api_stats.items():
            if api_values['base'] == 0 and not api_values['ascension']:
                continue

            if stat_name not in local_stats:
                mismatches.append(f'STAT MISSING: {stat_name} (API: base={api_values["base"]})')
                continue

            local = local_stats[stat_name]

            if stat_name not in UNIVERSAL_STATS:
                if not compare_values(api_values['base'], local['base']):
                    mismatches.append(
                        f'STAT MISMATCH: {stat_name} base - API: {api_values["base"]}, Local: {local["base"]}'
                    )

            if api_values['ascension'] and local['ascension']:
                if not compare_values(api_values['ascension'], local['ascension']):
                    mismatches.append(
                        f'STAT MISMATCH: {stat_name} ascension - API: {api_values["ascension"]}, Local: {local["ascension"]}'
                    )
            elif api_values['ascension'] and not local['ascension']:
                mismatches.append(
                    f'STAT MISSING ASCENSION: {stat_name} - API has ascension: {api_values["ascension"]}'
                )

    # Validate talents (skip if stats_only)
    if not stats_only:
        local_talents = parse_talent_tables(char_name)
        if local_talents is None:
            mismatches.append(f'Character {char_name} not found in CharTalentTables.js')
        else:
            api_talents = get_api_talents(api_data)

            for skill_key, api_params in api_talents.items():
                if skill_key not in local_talents:
                    mismatches.append(f'TALENT MISSING: {skill_key}')
                    continue

                local_params = local_talents[skill_key]

                for param_key, api_values in api_params.items():
                    if param_key not in local_params:
                        mismatches.append(f'TALENT PARAM MISSING: {skill_key}.{param_key}')
                        continue

                    local_values = local_params[param_key]
                    if not compare_values(api_values, local_values):
                        mismatches.append(
                            f'TALENT MISMATCH: {skill_key}.{param_key} - API: {api_values[:3]}..., Local: {local_values[:3]}...'
                        )

    return mismatches


def import_char(char_id: int):
    """Import character data and print code."""
    data = fetch_char_data(char_id)

    if 'Skills' in data:
        import_talents(data["Name"], data['Skills'])
    import_base(data, char_id)


def import_base(data: Dict, char_id: int):
    name = normalize_name(data["Name"])
    element = get_element_by_name(data.get("Element", ""))

    print(f'export const {data["Name"]} = new DbObjectChar({{')
    print(f"    name: 'char_name.{name}',")
    print("    serializeId: ??,")
    print(f"    gameId: {char_id},")
    print(f"    iconClass: 'char-icon-{name}',")
    print(f"    rarity: {RARITY_NAMES[data['Rarity']]},")
    print(f"    element: '{element}',")
    print(f"    weapon: '{get_weapon_type_by_name(data['Weapon'])}',")
    print("    origin: '',")
    print("    talents: Talents,")

    import_base_stats(data)

    print("    features: [],")
    print("    conditions: [],")
    print("    postEffects: [],")
    print("    constellation: new DbObjectConstellation([]),")
    print("    partyData: {},")
    print("});")


def import_talents(name: str, data: List[Dict]):
    char_name = name.replace(' ', '')
    print(f'let charTalentTables = {{\n    {char_name}: {{')

    for index, talent in enumerate(data):
        skill_index = index + 1
        params2descr = {}
        params_tables = {}
        for level in sorted(talent['Promote'].values(), key=lambda x: x['Level']):
            if not params2descr:
                for descr in level['Desc']:
                    if not descr:
                        continue
                    parts = descr.split('|')
                    if len(parts) < 2:
                        continue
                    (desc_name, params_str) = parts[0], parts[1]

                    desc_name = re.sub(r'\#?{LAYOUT_PC#(.*?)\}', '\\g<1>', desc_name)
                    desc_name = re.sub(r'\#?{.*?}', '', desc_name)
                    params_indices = re.findall(r'param(\d+):(\w+)\b', params_str)
                    for (ind, fmt) in params_indices:
                        ind = int(ind)
                        params2descr[ind] = {
                            'name': desc_name,
                            'format': fmt,
                        }
                        params_tables[ind] = []
            for ind in map(int, params2descr.keys()):
                if ind - 1 < len(level['Param']):
                    params_tables[ind].append(level['Param'][ind - 1])
        print(f'        s{skill_index}_id: {talent.get("Id", 0)},\n        s{skill_index}: {{')
        for ind in params2descr.keys():
            print(f"            // {params2descr[ind]['name']},")
            print(f"            p{ind}: [{', '.join(map(str, format_table(params_tables[ind], params2descr[ind]['format'])))}],")
        print('        },')
    print('    }\n};')


def import_base_stats(data: dict):
    rarity = RARITY_NAMES[data['Rarity']]

    base_stats = {
        'burst_energy_cost': {'base': '??'},
        'crit_dmg_base': {'base': 50},
        'crit_rate_base': {'base': 5},
        'recharge_base': {'base': 100},
        'atk_base': {
            'base': data['BaseATK'],
            'curve': get_curve_by_name(f'GROW_CURVE_ATTACK_S{rarity}'),
        },
        'def_base': {
            'base': data['BaseDEF'],
            'curve': get_curve_by_name(f'GROW_CURVE_ATTACK_S{rarity}'),
        },
        'hp_base': {
            'base': data['BaseHP'],
            'curve': get_curve_by_name(f'GROW_CURVE_HP_S{rarity}'),
        },
    }

    ascension_stats = {}
    if 'StatsModifier' in data and 'Ascension' in data['StatsModifier']:
        for level, asc_data in enumerate(data['StatsModifier']['Ascension']):
            for prop, value in asc_data.items():
                if prop not in PROPS:
                    print(f"    // Unknown prop: {prop}", file=sys.stderr)
                    continue
                stat = get_stat_by_name(prop)
                if stat not in ascension_stats:
                    ascension_stats[stat] = [0, 0, 0, 0, 0, 0]
                if re.match(r'^crit_', stat):
                    value = value * 100
                ascension_stats[stat][level] = trim_value(value)

    print('    statTable: [')
    for stat in set(list(base_stats.keys()) + list(ascension_stats.keys())):
        print('        new StatTableAscensionScale({')
        print(f"            stat: '{stat}',")
        print(f"            base: {base_stats.get(stat, {}).get('base', 0)},")
        if stat in ascension_stats:
            print(f"            ascension: new StatTable('', [{', '.join(map(str, ascension_stats[stat]))}]),")
        if stat in base_stats and 'curve' in base_stats[stat]:
            print(f"            scale: {base_stats[stat]['curve']},")
        print('        }),')
    print('    ],')


def get_stat_by_name(name: str) -> str:
    return PROPS[name]


def get_curve_by_name(name: str) -> str:
    return CURVES[name]


def get_element_by_name(name: str) -> str:
    return ELEMENTS.get(name.upper(), name.lower())


def get_weapon_type_by_name(name: str) -> str:
    return WEAPON_TYPES[name]


def normalize_name(name: str) -> str:
    return name.lower().replace(' ', '_')


def format_table(data, fmt):
    isPercent = fmt.find('P') >= 0

    def format_value(val):
        if isPercent:
            val *= 100
        return trim_value(val)

    data = [format_value(x) for x in data]

    return shrink_table(data)


def trim_value(value):
    if not isinstance(value, str):
        value = '%.4f' % (value)
    if value.find('.') >= 0:
        return re.sub(r"\.?0+$", '', value)
    return value


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


def main():
    parser = argparse.ArgumentParser(description='Import or validate Genshin character data from Hakushin API')
    parser.add_argument('character', nargs='?', help='Character ID (number) or name')
    parser.add_argument('--validate', '-v', action='store_true', help='Validate existing data against API')
    parser.add_argument('--stats-only', '-s', action='store_true', help='Only validate stats, skip talents')
    parser.add_argument('--list', '-l', action='store_true', help='List all known characters')

    args = parser.parse_args()

    if args.list:
        print('Known characters:')
        for char_id, name in sorted(CHAR_IDS.items()):
            print(f'  {char_id}: {name}')
        return

    if not args.character:
        parser.print_help()
        return

    # Resolve character ID
    char_id = None
    char_name = None

    if args.character.isdigit():
        char_id = int(args.character)
        char_name = CHAR_IDS.get(char_id)
        if not char_name:
            print(f'Unknown character ID: {char_id} (will try to fetch anyway)')
    else:
        # Try to find by name (case-insensitive)
        for cid, cname in CHAR_IDS.items():
            if cname.lower() == args.character.lower():
                char_id = cid
                char_name = cname
                break
        if not char_id:
            print(f'Unknown character name: {args.character}')
            sys.exit(1)

    if args.validate:
        print(f'Validating {char_name} ({char_id}) against Hakushin API...')
        if args.stats_only:
            print('(stats only, skipping talents)\n')
        else:
            print('(stats and talents)\n')
        mismatches = validate_character(char_id, char_name, stats_only=args.stats_only)
        if mismatches:
            print(f'[FAIL] Found {len(mismatches)} issues:')
            for m in mismatches:
                print(f'   {m}')
            sys.exit(1)
        else:
            print(f'[OK] {char_name} data matches API')
            sys.exit(0)
    else:
        print(f'// Importing {char_name or char_id} from Hakushin API...\n')
        import_char(char_id)


if __name__ == '__main__':
    main()
