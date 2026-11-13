from pathlib import Path
import struct
import sys
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LEGACY_IMPORT_DIR = PROJECT_ROOT / 'bin' / 'import'
if str(LEGACY_IMPORT_DIR) not in sys.path:
    sys.path.insert(0, str(LEGACY_IMPORT_DIR))

import equip_common
from equip_param_tables import passive_entries


def f32(value):
    """The value as the game data stores it: a 32-bit float."""
    return struct.unpack('<f', struct.pack('<f', value))[0]


def affix(level, params, open_config='Weapon_X', add_props=None):
    return {
        'id': 111,
        'level': level,
        'openConfig': open_config,
        'paramList': params + [0, 0, 0],
        'addProps': add_props or [{}, {}],
    }


class EquipCommonTests(unittest.TestCase):
    def test_set_blocks_are_keyed_by_piece_count(self):
        rows = [affix(None, [0.18], 'Relic_A'), affix(1, [0.35], 'Relic_B')]
        item = {'setId': 15001, 'EquipAffixId': 215001, 'setNeedNum': [2, 4]}
        blocks = equip_common.set_blocks(item, {215001: rows})
        self.assertEqual([key for (key, _) in blocks], ['pc2', 'pc4'])
        self.assertIs(blocks[1][1], rows[1])

    def test_a_set_without_bonus_rows_is_skipped(self):
        item = {'setId': 15000, 'EquipAffixId': 1, 'setNeedNum': [3, 5]}
        self.assertEqual(equip_common.set_blocks(item, {}), [])

    def test_bonus_rows_must_match_the_piece_counts(self):
        item = {'setId': 15001, 'EquipAffixId': 215001, 'setNeedNum': [2, 4]}
        with self.assertRaisesRegex(ValueError, '15001'):
            equip_common.set_blocks(item, {215001: [affix(None, [0.18])]})

    def test_sets_keep_the_calculator_name_and_new_ones_use_the_title(self):
        self.assertEqual(
            equip_common.set_key({'setId': 15001}, "Gladiator's Finale"),
            'GladiatorFinale',
        )
        self.assertEqual(
            equip_common.set_key({'setId': 99999}, "Gladiator's Finale"),
            'GladiatorsFinale',
        )
        self.assertEqual(
            equip_common.pascal_name('Scroll of the Hero of Cinder City'),
            'ScrollOfTheHeroOfCinderCity',
        )

    def test_table_bonuses_are_in_calculator_stats_and_units(self):
        # The property says what the value is: a fraction becomes percent,
        # Elemental Mastery stays as it is. Values are 32-bit floats.
        row = affix(None, [], add_props=[
            {'propType': 'FIGHT_PROP_HP_PERCENT', 'value': 0.20000000298023224},
            {'propType': 'FIGHT_PROP_CRITICAL', 'value': 0.11999999731779099},
            {'propType': 'FIGHT_PROP_ELEMENT_MASTERY', 'value': 80},
            {},
        ])
        self.assertEqual(
            equip_common.add_prop_stats(row),
            {'hp_percent': '20', 'crit_rate': '12', 'mastery': '80'},
        )

    def test_an_unmapped_table_bonus_fails(self):
        row = affix(None, [], add_props=[{'propType': 'FIGHT_PROP_NEW', 'value': 1}])
        with self.assertRaisesRegex(ValueError, 'FIGHT_PROP_NEW'):
            equip_common.add_prop_stats(row)


class PassiveEntryTests(unittest.TestCase):
    CONFIGS = {
        'Weapon_X': [
            {'$type': 'AddAbility', 'abilityName': 'Weapon_X'},
            {
                '$type': 'ModifyAbility',
                'abilityName': 'Weapon_X',
                'paramDelta': '%2',
                'paramSpecial': 'Factor',
            },
        ],
    }

    def test_a_weapon_has_one_value_per_refinement(self):
        rows = [
            affix(index, [12, f32(0.008 + 0.002 * index)], add_props=[
                {'propType': 'FIGHT_PROP_HP_PERCENT', 'value': f32(0.2 + 0.05 * index)},
            ])
            for index in range(5)
        ]
        (abilities, entries) = passive_entries(rows, self.CONFIGS)
        self.assertEqual(abilities, ['Weapon_X'])
        self.assertEqual([key for (key, _, _) in entries], ['hp_percent', 'p1', 'p2'])
        # The named bonus is in calculator units, the params are raw.
        self.assertEqual(
            entries[0][1:],
            (['given by the passive itself'], ['20', '25', '30', '35', '40']),
        )
        # p1 feeds no ability parameter: no comment.
        self.assertEqual(entries[1][1:], ([], ['12', '12', '12', '12', '12']))
        self.assertEqual(
            entries[2][1:],
            (['Factor'], ['0.008', '0.01', '0.012', '0.014', '0.016']),
        )

    def test_a_passive_without_values_has_no_entries(self):
        self.assertEqual(passive_entries([affix(None, [], 'Unknown')], self.CONFIGS), ([], []))

    def test_a_value_no_refinement_changes_is_still_listed_per_refinement(self):
        rows = [affix(index, [12]) for index in range(5)]
        (_, entries) = passive_entries(rows, self.CONFIGS)
        self.assertEqual(entries[0][2], ['12', '12', '12', '12', '12'])


if __name__ == '__main__':
    unittest.main()
