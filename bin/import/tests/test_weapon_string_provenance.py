import csv
from pathlib import Path
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
STRINGS = PROJECT_ROOT / 'data' / 'strings'
IMPORTER = PROJECT_ROOT / 'new_bin' / 'import_weapons.py'


def csv_rows(path):
    with path.open(encoding='utf-8', newline='') as file:
        return list(csv.DictReader(file, delimiter=';'))


class WeaponStringProvenanceTests(unittest.TestCase):
    ONE_STAR_WEAPON_NAMES = {
        'dull_blade': ('Тупой меч', 'Dull Blade'),
        'waster_greatsword': ('Двуручный меч богатыря', 'Waster Greatsword'),
        'beginners_protector': ('Копьё новичка', "Beginner's Protector"),
        'apprentices_notes': ('Записи ученика', "Apprentice's Notes"),
        'hunters_bow': ('Лук охотника', "Hunter's Bow"),
    }
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
        'new_bough',
        'silver_light',
        'beyond_the_chrysalis',
        'winters_heavy_heart',
        'hymn_of_the_maelstrom',
        'breezeborne_refrain',
    }

    def test_one_star_names_are_generated_without_passive_rows(self):
        names = {
            row['name']: (row['rus'], row['eng'])
            for row in csv_rows(STRINGS / 'generated' / 'weapon_names.csv')
        }
        self.assertEqual(
            {name: names[name] for name in self.ONE_STAR_WEAPON_NAMES},
            self.ONE_STAR_WEAPON_NAMES,
        )

        talent_names = {
            row['name']
            for row in csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        }
        for weapon_id in self.ONE_STAR_WEAPON_NAMES:
            self.assertNotIn(f'weapon_{weapon_id}', talent_names)

    def test_source_identity_gaps_are_resolved_upstream(self):
        # 7.0.52 published real names/titles; the codename override table and
        # its assertion branch were removed from the importer.
        importer_text = IMPORTER.read_text(encoding='utf-8')
        self.assertNotIn('SOURCE_IDENTITY_OVERRIDES', importer_text)
        self.assertNotIn('source_gap_', importer_text)
        rows = csv_rows(STRINGS / 'generated' / 'weapon_names.csv')
        by_name = {row['name']: row for row in rows}
        expected_names = {
            11437: ('Новая ветвь', 'New Bough'),
            11438: ('Серебряный свет', 'Silver Light'),
            11522: ('За пределами кокона', 'Beyond the Chrysalis'),
            14437: ('Застывшее сердце зимы', "Winter's Heavy Heart"),
            14524: ('Ода водоворота', 'Hymn of the Maelstrom'),
            15437: ('Напевы нежного ветра', 'Breezeborne Refrain'),
        }
        for game_id, (rus, eng) in expected_names.items():
            weapon_id = self.GAME_ID_TO_WEAPON_ID[game_id]
            self.assertIn(weapon_id, by_name)
            self.assertEqual(by_name[weapon_id]['rus'], rus)
            self.assertEqual(by_name[weapon_id]['eng'], eng)

    GAME_ID_TO_WEAPON_ID = {
        11437: 'new_bough',
        11438: 'silver_light',
        11522: 'beyond_the_chrysalis',
        14437: 'winters_heavy_heart',
        14524: 'hymn_of_the_maelstrom',
        15437: 'breezeborne_refrain',
    }
    def test_common_generated_file_contains_71_source_rows(self):
        names = csv_rows(STRINGS / 'generated' / 'weapon_names.csv')
        self.assertTrue(
            self.VERSION_71_IDS.issubset({row['name'] for row in names})
        )

        rows = csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        expected_titles = {
            ('talent_name', f'weapon_{name}')
            for name in self.VERSION_71_IDS
        }
        expected_descriptions = {
            ('talent_descr', f'weapon_{name}')
            for name in self.VERSION_71_IDS - {
                'hymn_of_the_maelstrom',
                'breezeborne_refrain',
            }
        } | {
            ('talent_descr', 'weapon_hymn_of_the_maelstrom_base'),
            ('talent_descr', 'weapon_hymn_of_the_maelstrom_party'),
            ('talent_descr', 'weapon_breezeborne_refrain_base'),
            ('talent_descr', 'weapon_breezeborne_refrain_party'),
        }
        expected_source_rows = expected_titles | expected_descriptions
        version_rows = [
            row for row in rows
            if (row['category'], row['name']) in expected_source_rows
        ]
        self.assertEqual(
            {(row['category'], row['name']) for row in version_rows},
            expected_source_rows,
        )
        for row in version_rows:
            for language in ('rus', 'eng'):
                text = row[language].strip()
                self.assertTrue(text)
                self.assertNotIn('<color=', text)
                self.assertNotIn('Weapon:', text)

        title_rows = {
            row['name']: (row['rus'], row['eng'])
            for row in version_rows
            if row['category'] == 'talent_name'
        }
        self.assertEqual(title_rows, {
            'weapon_new_bough': ('Дикая поросль', 'Wildgrowth'),
            'weapon_silver_light': ('Отблески на воде', 'Radiance on the Water'),
            'weapon_beyond_the_chrysalis': (
                'Танец освобождённых крыльев',
                'Dance of Wings Unbound',
            ),
            'weapon_winters_heavy_heart': ('Тайна мороза', 'Secrets of Frost'),
            'weapon_hymn_of_the_maelstrom': ('Рондо крепкого сна', 'Rondo of Slumber'),
            'weapon_breezeborne_refrain': ('Баллада гадюки', "Viper's Ballad"),
        })

    def test_71_split_descriptions_keep_official_terms_and_r1_fallbacks(self):
        rows = csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        descriptions = {
            row['name']: row
            for row in rows
            if row['category'] == 'talent_descr'
        }

        hymn_base = descriptions['weapon_hymn_of_the_maelstrom_base']
        hymn_party = descriptions['weapon_hymn_of_the_maelstrom_party']
        for language in ('rus', 'eng'):
            self.assertIn('%{healing|4}', hymn_base[language])
            self.assertIn('%{text_percent_hp_hymn|4}', hymn_base[language])
            self.assertIn(
                '%{text_percent_atk_per_thousand|0.4}',
                hymn_party[language],
            )
            self.assertIn('%{text_percent_atk_cap|8}', hymn_party[language])
            self.assertIn('75%', hymn_party[language])
            self.assertNotIn('%{healing|4}', hymn_party[language])
        self.assertIn('Вещий мёд Уацамонги', hymn_base['rus'])
        self.assertIn('Вещий мёд Уацамонги', hymn_party['rus'])
        self.assertIn('"Vatsamonga\'s Vatic Vintage"', hymn_base['eng'])
        self.assertIn('"Vatsamonga\'s Vatic Vintage"', hymn_party['eng'])
        self.assertIn(
            'name{макс. HP} экипированного персонажа',
            hymn_party['rus'],
        )
        self.assertIn(
            'the equipping character has over 40,000',
            hymn_party['eng'],
        )

        refrain_base = descriptions['weapon_breezeborne_refrain_base']
        refrain_party = descriptions['weapon_breezeborne_refrain_party']
        for language in ('rus', 'eng'):
            self.assertIn('%{recharge}', refrain_base[language])
            self.assertNotIn('%{dmg_stellarswirl|24}', refrain_base[language])
            self.assertIn('%{dmg_stellarswirl|24}', refrain_party[language])
        self.assertIn('Гимна непорочных', refrain_base['rus'])
        self.assertIn('Смертельный яд змеи', refrain_party['rus'])
        self.assertIn('Hymn of the Pure', refrain_base['eng'])
        self.assertIn('Thus Lied the Viper', refrain_party['eng'])
        self.assertTrue(refrain_party['eng'].startswith('At 3 stacks'))
        self.assertTrue(refrain_party['rus'].startswith('При получении 3 уровней'))

    def test_71_manual_file_is_calculator_controls_only(self):
        rows = csv_rows(STRINGS / '7.1' / 'weapons.csv')
        for row in rows:
            self.assertNotEqual(row['category'], 'weapon_name')
            self.assertFalse(
                row['name'] in {f'weapon_{name}' for name in self.VERSION_71_IDS}
            )

        self.assertEqual(
            {(row['category'], row['name']) for row in rows},
            {
                ('talent_name', 'weapon_new_bough_mode'),
                ('talent_name', 'weapon_new_bough_normal'),
                ('talent_name', 'weapon_new_bough_stacks'),
                ('talent_descr', 'weapon_new_bough_stacks'),
                ('talent_name', 'weapon_beyond_the_chrysalis_winds_of_devotion'),
                ('talent_name', 'weapon_beyond_the_chrysalis_winds_of_defiance'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_mode'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_hymn'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_triumph'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_stacks'),
                ('talent_descr', 'weapon_hymn_of_the_maelstrom_stacks'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_holder_hp'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_hymn_1'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_hymn_2'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_hymn_3'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_triumph_1'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_triumph_2'),
                ('talent_name', 'weapon_hymn_of_the_maelstrom_triumph_3'),
                ('talent_name', 'weapon_breezeborne_refrain_points'),
                ('talent_descr', 'weapon_breezeborne_refrain_points'),
            },
        )

    def test_71_manual_controls_use_official_effect_names(self):
        rows = csv_rows(STRINGS / '7.1' / 'weapons.csv')
        by_name = {row['name']: row for row in rows}

        official_terms = {
            'weapon_new_bough_normal': ('Заросли', 'Verdant'),
            'weapon_beyond_the_chrysalis_winds_of_devotion': (
                'Ветер искренности',
                'Winds of Devotion',
            ),
            'weapon_beyond_the_chrysalis_winds_of_defiance': (
                'Ветер мятежа',
                'Winds of Defiance',
            ),
            'weapon_hymn_of_the_maelstrom_hymn': (
                'Вещий мёд Уацамонги',
                "Vatsamonga's Vatic Vintage",
            ),
            'weapon_hymn_of_the_maelstrom_triumph': (
                'Вещий мёд Уацамонги',
                "Vatsamonga's Vatic Vintage",
            ),
            'weapon_breezeborne_refrain_points': (
                'Гимн непорочных',
                'Hymn of the Pure',
            ),
        }
        for name, (rus, eng) in official_terms.items():
            self.assertIn(rus, by_name[name]['rus'])
            self.assertIn(eng, by_name[name]['eng'])

        for suffix in ('triumph', 'triumph_1', 'triumph_2', 'triumph_3'):
            row = by_name[f'weapon_hymn_of_the_maelstrom_{suffix}']
            self.assertIn('75%', row['rus'])
            self.assertIn('75%', row['eng'])

        manual_text = '\n'.join(
            f"{row['rus']}\n{row['eng']}"
            for row in rows
        )
        self.assertNotIn('Триумф', manual_text)
        self.assertNotIn('Triumph', manual_text)
        self.assertIn('Смертельный яд змеи', by_name[
            'weapon_breezeborne_refrain_points'
        ]['rus'])
        self.assertIn('Thus Lied the Viper', by_name[
            'weapon_breezeborne_refrain_points'
        ]['eng'])

    def test_winters_heavy_heart_radiance_uses_mastery_in_both_languages(self):
        rows = csv_rows(STRINGS / 'generated' / 'weapon_talents.csv')
        winters_heavy_heart = next(
            row for row in rows
            if row['name'] == 'weapon_winters_heavy_heart'
            and row['category'] == 'talent_descr'
        )
        for language in ('rus', 'eng'):
            self.assertIn(
                '%{text_mastery_radiance}',
                winters_heavy_heart[language],
            )
        self.assertIn('name{мастерство стихий}', winters_heavy_heart['rus'])
        self.assertIn('name{Elemental Mastery}', winters_heavy_heart['eng'])
        self.assertNotIn('4,2%', winters_heavy_heart['rus'])

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
