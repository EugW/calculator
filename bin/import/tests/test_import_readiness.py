import ast
import csv
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LEGACY_IMPORT_DIR = PROJECT_ROOT / 'bin' / 'import'
if str(LEGACY_IMPORT_DIR) not in sys.path:
    sys.path.insert(0, str(LEGACY_IMPORT_DIR))

import source_config
from char_common import (
    format_param,
    normalize_proud_group,
    normalize_proud_param_description,
    passive_block_keys,
    talent_config_links,
    trim_params,
)


PASSIVES_PATH = (
    PROJECT_ROOT
    / 'new_bin'
    / 'lib'
    / 'genshin'
    / 'datafiles'
    / 'passives.py'
)
PASSIVES_SPEC = importlib.util.spec_from_file_location(
    '_import_readiness_passives',
    PASSIVES_PATH,
)
passives = importlib.util.module_from_spec(PASSIVES_SPEC)
PASSIVES_SPEC.loader.exec_module(passives)


def literal_assignment(path, assignment_name):
    tree = ast.parse(path.read_text(encoding='utf-8'))
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(
            isinstance(target, ast.Name) and target.id == assignment_name
            for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f'{assignment_name} not found in {path}')


def csv_rows(path):
    with path.open(encoding='utf-8', newline='') as file:
        return list(csv.DictReader(file, delimiter=';'))


class TemporaryDataCheckout:
    def __init__(self):
        self._temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self._temporary_directory.name)
        (self.root / 'ExcelBinOutput').mkdir()
        (self.root / 'TextMap').mkdir()
        self.write_text_map('TextMapEN.json', {'1': 'base', '2': 'same'})
        self.write_text_map(
            'TextMap_MediumEN.json',
            {
                '2': 'same',
                '3': 'medium',
                '4': 'before{NON_BREAK_SPACE}- after',
            },
        )
        self._git('init', '--quiet')
        self._git('config', 'user.email', 'import-tests@example.invalid')
        self._git('config', 'user.name', 'Importer Tests')
        self._git('add', '.')
        self._git('commit', '--quiet', '-m', 'fixture')
        self.revision = self._git('rev-parse', 'HEAD').strip()

    def _git(self, *args):
        return subprocess.run(
            ['git', '-C', str(self.root), *args],
            check=True,
            capture_output=True,
            text=True,
        ).stdout

    def write_text_map(self, filename, data):
        (self.root / 'TextMap' / filename).write_text(
            json.dumps(data),
            encoding='utf-8',
        )

    def close(self):
        self._temporary_directory.cleanup()


class SourceConfigTests(unittest.TestCase):
    def setUp(self):
        self.checkout = TemporaryDataCheckout()

    def tearDown(self):
        self.checkout.close()

    def test_revision_is_verified_and_text_maps_are_unioned(self):
        source = source_config.resolve_data_source(
            self.checkout.root,
            self.checkout.revision,
        )
        self.assertEqual(source.revision, self.checkout.revision)
        self.assertEqual(
            source_config.load_text_map('EN', source=source),
            {
                '1': 'base',
                '2': 'same',
                '3': 'medium',
                '4': 'before - after',
            },
        )

    def test_wrong_revision_is_rejected(self):
        self.checkout.write_text_map('TextMapRU.json', {'1': 'new commit'})
        self.checkout._git('add', '.')
        self.checkout._git('commit', '--quiet', '-m', 'second fixture commit')
        with self.assertRaisesRegex(source_config.DataSourceError, 'expected'):
            source_config.resolve_data_source(
                self.checkout.root,
                self.checkout.revision,
            )

    def test_dirty_checkout_is_rejected(self):
        self.checkout.write_text_map('TextMapRU.json', {'1': 'uncommitted'})
        with self.assertRaisesRegex(source_config.DataSourceError, 'uncommitted'):
            source_config.resolve_data_source(
                self.checkout.root,
                self.checkout.revision,
            )

    def test_text_map_conflicts_are_rejected(self):
        source = source_config.resolve_data_source(
            self.checkout.root,
            self.checkout.revision,
        )
        self.checkout.write_text_map('TextMap_MediumEN.json', {'2': 'conflict'})
        with self.assertRaisesRegex(source_config.SourceSchemaError, 'hash 2'):
            source_config.load_text_map('EN', source=source)

    def test_required_alias_accepts_known_casing_and_rejects_bad_rows(self):
        self.assertEqual(source_config.required_alias({'level': 1}, 'level', 'Level'), 1)
        self.assertEqual(source_config.required_alias({'Level': 2}, 'level', 'Level'), 2)
        with self.assertRaises(source_config.SourceSchemaError):
            source_config.required_alias({}, 'level', 'Level')
        with self.assertRaises(source_config.SourceSchemaError):
            source_config.required_alias({'level': 1, 'Level': 2}, 'level', 'Level')


class ProudSkillTests(unittest.TestCase):
    def test_trailing_zero_padding_is_trimmed_after_referenced_values(self):
        padded = [1.0, 2.0, 0.0] + [0.0] * 22
        levels = {1: list(padded), 2: list(padded)}
        normalized = normalize_proud_group(
            12345,
            levels,
            ['Damage|{param1:F1P}/{param2:F1P}'],
        )
        self.assertEqual(normalized, {1: [1.0, 2.0], 2: [1.0, 2.0]})

    def test_out_of_bounds_param_reference_fails(self):
        with self.assertRaisesRegex(ValueError, 'param3'):
            normalize_proud_group(12345, {1: [1.0, 2.0]}, ['Damage|{param3:F1P}'])

    def test_vesna_burst_uses_real_param_one_and_two(self):
        source = (
            'Elemental Burst Spirit Blade DMG/Stellar Spirit Blade DMG|'
            '{param4:F1P}/{param5:F1P}'
        )
        self.assertEqual(
            normalize_proud_param_description(14339, source),
            'Elemental Burst Spirit Blade DMG/Stellar Spirit Blade DMG|'
            '{param1:F1P}/{param2:F1P}',
        )


class PassiveParamTests(unittest.TestCase):
    """Raw passive and constellation params of CharTalentTables.js."""

    def test_params_print_as_the_shortest_matching_decimal(self):
        # The Excel tables print 32-bit floats as doubles.
        self.assertEqual(format_param(0.004000000189989805), '0.004')
        self.assertEqual(format_param(1.100000023841858), '1.1')
        self.assertEqual(format_param(-0.15000000596046448), '-0.15')
        self.assertEqual(format_param(2800), '2800')
        self.assertEqual(format_param(30000.0), '30000')
        # '%.4f' would round this ratio per point of ATK to 0.
        self.assertEqual(format_param(3.5000000934815034e-05), '0.000035')
        # A dump that prints the short decimal itself gives the same text.
        self.assertEqual(format_param(3.5e-05), '0.000035')
        self.assertEqual(format_param(5e-06), '0.000005')
        self.assertEqual(format_param(0.15), '0.15')

    def test_only_the_zero_tail_is_trimmed(self):
        self.assertEqual(trim_params([0.5, 0, 0.006, 0, 0]), [0.5, 0, 0.006])
        self.assertEqual(trim_params([0, 0, 0]), [])

    def test_passive_blocks_are_keyed_by_how_they_unlock(self):
        depot = {
            'inherentProudSkillOpens': [
                {'proudSkillGroupId': 9521, 'needAvatarPromoteLevel': 1},
                {'proudSkillGroupId': 9522, 'needAvatarPromoteLevel': 4},
                {'proudSkillGroupId': 9523},
                {'proudSkillGroupId': 9524},
                {},
            ],
            'specialProudSkillOpens': [{'proudSkillGroupId': 9551}, {}],
        }
        self.assertEqual(
            passive_block_keys(depot),
            [('a1', 9521), ('a4', 9522), ('a0', 9523), ('a0_2', 9524), ('sp', 9551)],
        )

    def test_special_passives_are_read_under_an_obfuscated_name(self):
        # The 7.2 release dump: the list and its fields carry other names.
        depot = {
            'id': 3801,
            'inherentProudSkillOpens': [
                {'proudSkillGroupId': 3821, 'needAvatarPromoteLevel': 1},
                {},
            ],
            'skills': [10386, 10387, 0, 0],
            'LHFOOPMJHBN': [
                {
                    'proudSkillGroupId': 3851,
                    'FINHFCNILNN': 'SPECIAL_PROUD_SKILL_OPEN_CONDITION_TYPE_QUEST_FINISH',
                    'HGNPCIHMABD': [1000502],
                },
                {},
            ],
        }
        self.assertEqual(passive_block_keys(depot), [('a1', 3821), ('sp', 3851)])

        # A depot without special passives has the list empty.
        depot['LHFOOPMJHBN'] = [{}, {}]
        self.assertEqual(passive_block_keys(depot), [('a1', 3821)])

        # Two candidate lists cannot be told apart.
        depot['LHFOOPMJHBN'] = [{'proudSkillGroupId': 3851}]
        depot['ABCDEFGHIJK'] = [{'proudSkillGroupId': 3852}]
        with self.assertRaisesRegex(ValueError, '3801'):
            passive_block_keys(depot)

    def test_a_zero_param_ratio_is_the_default(self):
        entries = [
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Avatar_X_Skill',
                'paramDelta': '%1',
                'paramRatio': 0,
                'paramSpecial': 'Rate',
            },
        ]
        self.assertEqual(
            talent_config_links(entries),
            (['Avatar_X_Skill'], {1: [('Avatar_X_Skill', 'Rate', '')]}),
        )

    def test_talent_config_names_the_parameter_each_position_feeds(self):
        entries = [
            {'$type': 'AddAbility', 'abilityName': 'Avatar_X_Talent_6'},
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Avatar_X_Talent_6',
                'paramDelta': '%1',
                'paramSpecial': 'Rate',
            },
            # The same position twice does not repeat.
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Avatar_X_Talent_6',
                'paramDelta': '%1',
                'paramSpecial': 'Rate',
            },
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Avatar_X_Skill',
                'paramDelta': '-%2',
                'paramSpecial': 'cdDelta',
            },
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Avatar_X_Skill',
                'paramDelta': '%3',
                'paramRatio': -0.9900000095367432,
                'paramSpecial': 'MaxCharge',
            },
            # A constant delta takes no position.
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Avatar_X_Skill',
                'paramDelta': 2,
                'paramSpecial': 'MaxCount',
            },
            {'$type': 'AddTalentExtraLevel', 'talentIndex': 2, 'extraLevel': 3},
        ]
        (abilities, targets) = talent_config_links(entries)
        self.assertEqual(abilities, ['Avatar_X_Talent_6', 'Avatar_X_Skill'])
        self.assertEqual(
            targets,
            {
                1: [('Avatar_X_Talent_6', 'Rate', '')],
                2: [('Avatar_X_Skill', 'cdDelta', 'subtracted')],
                3: [('Avatar_X_Skill', 'MaxCharge', 'paramRatio -0.99')],
            },
        )

    def test_obfuscated_talent_config_fields_are_read(self):
        entries = [
            {
                '$type': 'GMOELNAHCOH',
                'IJFENBIJGLJ': '%2',
                'LDACNDBDKBA': 'NormalAttack_02_DamagePercentage',
                'NCCKLDFFDOH': 'Avatar_PlayerBoy_NormalAttack_DamageHandler',
            },
        ]
        self.assertEqual(
            talent_config_links(entries),
            (
                ['Avatar_PlayerBoy_NormalAttack_DamageHandler'],
                {
                    2: [(
                        'Avatar_PlayerBoy_NormalAttack_DamageHandler',
                        'NormalAttack_02_DamagePercentage',
                        '',
                    )],
                },
            ),
        )


class PassiveRoutingTests(unittest.TestCase):
    def test_stellar_combat_groups_without_promote_level_are_included(self):
        for group_id in (823, 14323, 14823, 15023):
            self.assertTrue(
                passives.is_combat_inherent_proud_skill_open(
                    {'proudSkillGroupId': group_id}
                )
            )

    def test_exploration_group_without_promote_level_is_excluded(self):
        self.assertFalse(
            passives.is_combat_inherent_proud_skill_open(
                {'proudSkillGroupId': 14325}
            )
        )

    def test_regular_ascension_passive_is_included(self):
        self.assertTrue(
            passives.is_combat_inherent_proud_skill_open(
                {'proudSkillGroupId': 14321, 'needAvatarPromoteLevel': 1}
            )
        )


class StableGenerationMappingTests(unittest.TestCase):
    EXPECTED_WEAPONS = {
        11101: 'DullBlade',
        12101: 'WasterGreatsword',
        13101: 'BeginnersProtector',
        14101: 'ApprenticesNotes',
        15101: 'HuntersBow',
        11435: 'HereticsMoltenBlade',
        11436: 'Emberwell',
        11437: 'NewBough',
        11438: 'SilverLight',
        11520: 'WhitelakeFrostfeather',
        11521: 'ExaiphanesBlade',
        11522: 'BeyondTheChrysalis',
        12435: 'ForgedByTheGoldenMelody',
        12436: 'BladeOfAtonement',
        12516: 'ATeaspoonOfTranscendence',
        13435: 'Frostbreath',
        13436: 'SongOfTheVigil',
        14435: 'ClashOfKings',
        14436: 'EchoesOfTheHeart',
        14437: 'WintersHeavyHeart',
        14524: 'HymnofTheMaelstrom',
        15435: 'JadeVista',
        15436: 'CovenantOfFrostAndSnow',
        15437: 'BreezeborneRefrain',
    }

    def test_stable_character_mappings(self):
        character_ids = literal_assignment(LEGACY_IMPORT_DIR / 'static.py', 'char_ids')
        self.assertNotIn(505, character_ids)
        self.assertEqual(character_ids[705], 'TravelerCryo')
        self.assertEqual(character_ids[10000148], 'Alyosha')
        self.assertEqual(character_ids[10000150], 'Odette')

    def test_stable_weapon_mappings_match_both_generators(self):
        for filename in ('weapon_stat_scales.py', 'find_missing_weapons.py'):
            weapon_names = literal_assignment(
                LEGACY_IMPORT_DIR / filename,
                'weapon_names',
            )
            for weapon_id, expected_name in self.EXPECTED_WEAPONS.items():
                self.assertEqual(weapon_names[weapon_id], expected_name)

class CharacterGenerationTests(unittest.TestCase):
    GENERATED = PROJECT_ROOT / 'data' / 'strings' / 'generated'

    def test_current_character_names_are_canonical(self):
        rows = csv_rows(self.GENERATED / 'char_names.csv')
        names = {
            row['name']: (row['rus'], row['eng'])
            for row in rows
        }
        self.assertEqual(
            {name: names[name] for name in ('vesna', 'vodyanitsa')},
            {
                'vesna': ('Весна', 'Vesna'),
                'vodyanitsa': ('Водяница', 'Vodyanitsa'),
            },
        )

    def test_current_characters_use_canonical_keys(self):
        rows = (
            csv_rows(self.GENERATED / 'char_skills.csv')
            + csv_rows(self.GENERATED / 'char_talents.csv')
        )
        keys = {(row['category'], row['name']) for row in rows}
        # The Vesna Armed-for-Action link is published upstream since 7.0.51
        # and must stay generated rather than manual.
        self.assertIn(('talent_name', 'n11430001'), keys)
        self.assertIn(('talent_descr', 'n11430001'), keys)
        self.assertIn(('talent_name', 'n11400001'), keys)
        self.assertIn(('talent_descr', 'n11400002'), keys)
        self.assertIn(('talent_name', 'vesna_winters_farewell_feast'), keys)
        self.assertIn(
            ('talent_descr', 'vodyanitsa_neverending_song_of_revelry'),
            keys,
        )
        versioned = set()
        for relative in ('7.1/vesna.csv', '7.1/vodyanitsa.csv'):
            for row in csv_rows(PROJECT_ROOT / 'data' / 'strings' / relative):
                versioned.add((row['category'], row['name']))
        self.assertNotIn(('talent_name', 'n11430001'), versioned)

    def test_generation_exports_element_specific_traveler_names(self):
        rows = csv_rows(self.GENERATED / 'char_names.csv')
        traveler_keys = {
            row['name'] for row in rows if row['name'].startswith('traveler')
        }
        self.assertEqual(
            traveler_keys,
            {
                'traveler_anemo',
                'traveler_cryo',
                'traveler_dendro',
                'traveler_electro',
                'traveler_geo',
                'traveler_hydro',
                'traveler_pyro',
            },
        )


if __name__ == '__main__':
    unittest.main()
