"""Weapon and artifact set passives of the game data, shared by generators."""

import ast
import json
import os
import re

from char_common import format_scaled_param
from source_config import excel_path


# setId -> calculator name (the export of src/js/db/Artifacts/Set/<name>.js).
# A set that is not listed is named after its English title.
artifact_set_names = {
    10001: 'ResolutionofSojourner',
    10002: 'BraveHeart',
    10003: 'DefendersWill',
    10004: 'TinyMiracle',
    10005: 'Berserker',
    10006: 'MartialArtist',
    10007: 'Instructor',
    10008: 'Gambler',
    10009: 'Exile',
    10010: 'Adventurer',
    10011: 'LuckyDog',
    10012: 'Scholar',
    10013: 'TravelingDoctor',
    14001: 'BlizzardStrayer',
    14002: 'Thundersoother',
    14003: 'Lavawalker',
    14004: 'MaidenBeloved',
    15001: 'GladiatorFinale',
    15002: 'ViridescentVenerer',
    15003: 'WandererTroupe',
    15005: 'ThunderingFury',
    15006: 'CrimsonWitch',
    15007: 'NoblesseOblige',
    15008: 'BloodstainedChivalry',
    15009: 'PrayersForIllumination',
    15010: 'PrayersForDestiny',
    15011: 'PrayersForWisdom',
    15013: 'PrayersForSpringtime',
    15014: 'ArchaicPetra',
    15015: 'RetracingBolide',
    15016: 'HeartofDepth',
    15017: 'TenacityofMillelith',
    15018: 'PaleFlame',
    15019: 'ShimenawasReminiscence',
    15020: 'EmblemofSeveredFate',
    15021: 'HuskofOpulentDreams',
    15022: 'OceanHuedClam',
    15023: 'VermillionHereafter',
    15024: 'EchoesofanOffering',
    15025: 'DeepwoodMemories',
    15026: 'GildedDreams',
    15027: 'DesertPavilionChronicle',
    15028: 'FlowerOfParadiseLost',
    15029: 'NymphsDream',
    15030: 'VourukashasGlow',
    15031: 'MarechausseeHunter',
    15032: 'GoldenTroupe',
    15033: 'SongOfDaysPast',
    15034: 'NighttimeWhispersInTheEchoingWoods',
    15035: 'FragmentOfHarmonicWhimsy',
    15036: 'UnfinishedReverie',
    15037: 'ScrollOfTheEmberedCitysHero',
    15038: 'ObsidianCodex',
    15039: 'LongNightsOath',
    15040: 'FinaleOfTheDeepGalleries',
    15041: 'NightOfTheSkysUnveiling',
    15042: 'SilkenMoonsSerenade',
    15043: 'AubadeOfMorningstarAndMoon',
    15044: 'ADayCarvedFromRisingWinds',
    15045: 'CelestialGift',
    15046: 'DisenchantmentInDeepShadow',
    15047: 'ScarletProof',
    15048: 'HeartOfTheFurnace',
}

# Bonuses a passive's table row gives directly (addProps), without an ability:
# property -> (calculator stat, scale to calculator units). The property says
# what the value is, so a fraction can be turned into percent (0.2 -> 20), as
# static.stat_info does for the stat tables.
ADD_PROP_STATS = {
    'FIGHT_PROP_HP': ('hp', 1),
    'FIGHT_PROP_HP_PERCENT': ('hp_percent', 100),
    'FIGHT_PROP_ATTACK_PERCENT': ('atk_percent', 100),
    'FIGHT_PROP_DEFENSE': ('def', 1),
    'FIGHT_PROP_DEFENSE_PERCENT': ('def_percent', 100),
    'FIGHT_PROP_CRITICAL': ('crit_rate', 100),
    'FIGHT_PROP_CRITICAL_HURT': ('crit_dmg', 100),
    'FIGHT_PROP_ELEMENT_MASTERY': ('mastery', 1),
    'FIGHT_PROP_CHARGE_EFFICIENCY': ('recharge', 100),
    'FIGHT_PROP_HEAL_ADD': ('healing', 100),
    'FIGHT_PROP_HEALED_ADD': ('healing_recv', 100),
    'FIGHT_PROP_SHIELD_COST_MINUS_RATIO': ('shield', 100),
    'FIGHT_PROP_ADD_HURT': ('dmg_all', 100),
    'FIGHT_PROP_PHYSICAL_ADD_HURT': ('dmg_phys', 100),
    'FIGHT_PROP_FIRE_ADD_HURT': ('dmg_pyro', 100),
    'FIGHT_PROP_WATER_ADD_HURT': ('dmg_hydro', 100),
    'FIGHT_PROP_ICE_ADD_HURT': ('dmg_cryo', 100),
    'FIGHT_PROP_ELEC_ADD_HURT': ('dmg_electro', 100),
    'FIGHT_PROP_WIND_ADD_HURT': ('dmg_anemo', 100),
    'FIGHT_PROP_ROCK_ADD_HURT': ('dmg_geo', 100),
    'FIGHT_PROP_GRASS_ADD_HURT': ('dmg_dendro', 100),
    'FIGHT_PROP_FIRE_SUB_HURT': ('res_pyro', 100),
    'FIGHT_PROP_ELEC_SUB_HURT': ('res_electro', 100),
}


def literal_assignment(path, name):
    """A module-level literal of a generator script, without running it."""
    with open(path, encoding='utf-8') as file:
        tree = ast.parse(file.read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == name
            for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise ValueError(f'{name} not found in {path}')


def weapon_names():
    """weapon id -> calculator name, as the weapon stat generator keeps it."""
    return literal_assignment(
        os.path.join(os.path.dirname(__file__), 'weapon_stat_scales.py'),
        'weapon_names',
    )


def load_excel(filename):
    with excel_path(filename).open('r', encoding='utf-8') as file:
        return json.load(file)


def equip_affixes():
    """{affix id: [rows by level]}: refinements of a weapon, 2pc/4pc of a set."""
    result = {}
    for row in load_excel('EquipAffixExcelConfigData.json'):
        result.setdefault(row['id'], []).append(row)
    for rows in result.values():
        rows.sort(key=lambda row: row.get('level') or 0)
    return result


def weapon_affix_rows(item, affixes):
    """The passive's rows of a weapon row, or None when it has no passive."""
    affix_id = next((value for value in item.get('skillAffix') or [] if value), None)
    return affixes.get(affix_id)


def pascal_name(title):
    words = re.findall(r"[A-Za-z0-9']+", title)
    return ''.join(
        word.replace("'", '').capitalize() if word.islower() else word.replace("'", '')
        for word in words
    )


def set_blocks(item, affixes):
    """[(block key, affix row)] of a set row: pc2 and pc4 (pc1 for one-piece sets)."""
    rows = affixes.get(item.get('EquipAffixId', item.get('equipAffixId'))) or []
    need = item.get('setNeedNum') or []
    if not rows:
        # A placeholder set without bonuses.
        return []
    if len(rows) != len(need):
        raise ValueError(
            f"Artifact set {item.get('setId')} has {len(rows)} bonus rows "
            f'for the piece counts {need}'
        )
    return [(f'pc{pieces}', row) for (pieces, row) in zip(need, rows)]


def set_key(item, title):
    return artifact_set_names.get(item['setId']) or pascal_name(title)


def add_prop_stats(row):
    """{calculator stat: value in calculator units, as text} a row gives directly."""
    result = {}
    for prop in row.get('addProps') or []:
        prop_type = prop.get('propType')
        if not prop_type or not prop.get('value'):
            continue
        if prop_type not in ADD_PROP_STATS:
            raise ValueError(
                f"Passive {row.get('id')} gives {prop_type}, which has no "
                'calculator stat in ADD_PROP_STATS'
            )
        (stat, scale) = ADD_PROP_STATS[prop_type]
        result[stat] = format_scaled_param(prop['value'], scale)
    return result
