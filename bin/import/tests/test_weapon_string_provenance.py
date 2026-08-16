import ast
import csv
from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
STRINGS = PROJECT_ROOT / 'data' / 'strings'
IMPORTER = PROJECT_ROOT / 'new_bin' / 'import_weapons.py'


def csv_rows(path):
    with path.open(encoding='utf-8', newline='') as file:
        return list(csv.DictReader(file, delimiter=';'))


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


class WeaponStringProvenanceTests(unittest.TestCase):
    STABLE_WEAPON_IDS = {
        'a_teaspoon_of_transcendence',
        'morning_hibernation',
        'astral_vultures_crimson_plumage',
        'emberwell',
        'whitelake_frostfeather',
        'blade_of_atonement',
        'frostbreath',
        'song_of_the_vigil',
        'clash_of_kings',
        'echoes_of_the_heart',
        'covenant_of_frost_and_snow',
        'heretics_molten_blade',
        'exaiphanes_blade',
        'forged_by_the_golden_melody',
        'jade_vista',
    }
    VERSION_71_IDS = {
        'spiked_stake',
        'fajian',
        'samosvist',
        'frost_scepter',
        'bludnye',
        'windtalker',
    }

    def test_source_identity_gaps_are_exactly_allowlisted(self):
        overrides = literal_assignment(IMPORTER, 'SOURCE_IDENTITY_OVERRIDES')
        self.assertEqual(
            {game_id: values[0] for game_id, values in overrides.items()},
            {
                11437: 'spiked_stake',
                11438: 'fajian',
                11522: 'samosvist',
                14437: 'frost_scepter',
                14524: 'bludnye',
                15437: 'windtalker',
            },
        )

    def test_common_generated_file_contains_71_descriptions_only(self):
        names = csv_rows(STRINGS / 'generated' / 'weapon_names.csv')
        self.assertTrue(
            self.VERSION_71_IDS.isdisjoint({row['name'] for row in names})
        )

        rows = csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        expected_descriptions = {
            ('talent_descr', f'weapon_{name}')
            for name in self.VERSION_71_IDS - {'windtalker'}
        } | {
            ('talent_descr', 'weapon_windtalker_base'),
            ('talent_descr', 'weapon_windtalker_party'),
        }
        version_rows = [
            row for row in rows
            if (row['category'], row['name']) in expected_descriptions
        ]
        self.assertEqual(
            {(row['category'], row['name']) for row in version_rows},
            expected_descriptions,
        )
        for row in version_rows:
            for language in ('rus', 'eng'):
                text = row[language].strip()
                self.assertTrue(text)
                self.assertNotIn('<color=', text)
                self.assertNotIn('Weapon:', text)

    def test_71_manual_file_is_fallbacks_and_calculator_controls_only(self):
        rows = csv_rows(STRINGS / '7.1' / 'weapons.csv')
        keys = {(row['category'], row['name']) for row in rows}
        for weapon_id in self.VERSION_71_IDS:
            self.assertIn(('weapon_name', weapon_id), keys)
            self.assertIn(('talent_name', f'weapon_{weapon_id}'), keys)
            self.assertNotIn(('talent_descr', f'weapon_{weapon_id}'), keys)

        source_owned_categories = {'weapon_name', 'talent_name', 'talent_descr'}
        fallbacks = [
            row for row in rows
            if row['category'] in source_owned_categories
            and (
                row['category'] == 'weapon_name'
                or row['name'] in {
                    f'weapon_{name}' for name in self.VERSION_71_IDS
                }
            )
        ]
        self.assertEqual(len(fallbacks), 12)
        expected_labels = {
            'spiked_stake': 'SpikedStake',
            'fajian': 'Fajian',
            'samosvist': 'Samosvist',
            'frost_scepter': 'FrostScepter',
            'bludnye': 'Bludnye',
            'windtalker': 'Windtalker',
        }
        for row in fallbacks:
            weapon_id = row['name'].removeprefix('weapon_')
            self.assertEqual(row['rus'], expected_labels[weapon_id])
            self.assertEqual(row['eng'], expected_labels[weapon_id])

    def test_frost_scepter_radiance_uses_mastery_in_both_languages(self):
        rows = csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        frost_scepter = next(
            row for row in rows if row['name'] == 'weapon_frost_scepter'
        )
        for language in ('rus', 'eng'):
            self.assertIn('%{text_mastery_radiance}', frost_scepter[language])
        self.assertIn('name{мастерство стихий}', frost_scepter['rus'])
        self.assertIn('name{Elemental Mastery}', frost_scepter['eng'])
        self.assertNotIn('4,2%', frost_scepter['rus'])

    def test_stable_generated_files_own_the_release_source_rows(self):
        names = csv_rows(STRINGS / 'generated' / 'weapon_names.csv')
        name_keys = {row['name'] for row in names}
        self.assertTrue(self.STABLE_WEAPON_IDS <= name_keys)

        talents = csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        talent_keys = {(row['category'], row['name']) for row in talents}
        expected_titles = {
            ('talent_name', 'weapon_a_teaspoon_of_transcendence'),
            ('talent_name', 'weapon_sunny_morning_sleep_in'),
            ('talent_name', 'weapon_astral_vultures_crimson_plumage'),
        } | {
            ('talent_name', f'weapon_{name}')
            for name in self.STABLE_WEAPON_IDS
            if name not in {
                'a_teaspoon_of_transcendence',
                'morning_hibernation',
                'astral_vultures_crimson_plumage',
            }
        }
        self.assertTrue(expected_titles <= talent_keys)
        for row in talents:
            if (row['category'], row['name']) not in expected_titles \
                    and row['category'] != 'talent_descr':
                continue
            self.assertTrue(row['rus'].strip())
            self.assertTrue(row['eng'].strip())

    def test_release_manual_file_contains_calculator_controls_only(self):
        rows = csv_rows(STRINGS / '7.0' / 'weapons.csv')
        self.assertEqual(
            {(row['category'], row['name']) for row in rows},
            {
                ('talent_name', 'weapon_heretics_molten_blade_distance'),
                ('talent_name', 'weapon_exaiphanes_blade_resonated_elements'),
                ('talent_name', 'weapon_forged_by_the_golden_melody_active'),
                ('talent_name', 'weapon_forged_by_the_golden_melody_copied'),
                ('talent_name', 'weapon_forged_by_the_golden_melody_atk'),
                ('talent_name', 'weapon_forged_by_the_golden_melody_mastery'),
                ('talent_name', 'weapon_forged_by_the_golden_melody_stellarglimmer'),
                ('talent_descr', 'weapon_forged_by_the_golden_melody_active'),
                ('talent_descr', 'weapon_forged_by_the_golden_melody_copied'),
            },
        )


if __name__ == '__main__':
    unittest.main()
