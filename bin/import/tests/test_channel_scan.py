from pathlib import Path
import sys
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LEGACY_IMPORT_DIR = PROJECT_ROOT / 'bin' / 'import'
if str(LEGACY_IMPORT_DIR) not in sys.path:
    sys.path.insert(0, str(LEGACY_IMPORT_DIR))

from channel_scan import read_stat, scan_unit, write_stat


def effects_of(abilities, name):
    return scan_unit(abilities)[name]['effects']


def summary(effect):
    """(target, write, [(stat, channel)], [specials]) of an effect."""
    return (
        effect['target'],
        effect['write'],
        [(read['stat'], read['channel']) for read in effect['reads']],
        [special for (_, special) in effect['specials']],
    )


class ChannelNameTests(unittest.TestCase):
    def test_read_channel_comes_from_the_property_prefix(self):
        self.assertEqual(read_stat('FIGHT_PROP_NONEXTRA_ATTACK'), ('atk', 'premod'))
        self.assertEqual(read_stat('FIGHT_PROP_CUR_ATTACK'), ('atk', 'total'))
        self.assertEqual(read_stat('FIGHT_PROP_BASE_ATTACK'), ('atk', 'base'))
        self.assertEqual(read_stat('FIGHT_PROP_MAX_HP'), ('hp', 'total'))
        self.assertEqual(read_stat('FIGHT_PROP_ELEMENT_MASTERY'), ('mastery', 'total'))
        self.assertEqual(read_stat('FIGHT_PROP_NONEXTRA_CRITICAL'), ('crit_rate', 'premod'))
        self.assertEqual(read_stat('FIGHT_PROP_NONEXTRA_WATER_ADD_HURT'), ('dmg_hydro', 'premod'))

    def test_current_values_are_not_stats(self):
        self.assertEqual(read_stat('FIGHT_PROP_CUR_HP')[1], None)
        self.assertEqual(read_stat('FIGHT_PROP_CUR_HP_DEBTS')[1], None)
        self.assertEqual(read_stat('FIGHT_PROP_MAX_FIRE_ENERGY')[1], None)

    def test_write_channel_comes_from_the_property_name(self):
        self.assertEqual(write_stat('Actor_AttackExtraDelta'), ('atk', 'extra'))
        self.assertEqual(write_stat('Actor_AttackDelta'), ('atk', 'premod'))
        self.assertEqual(write_stat('Actor_AttackRatio'), ('atk_percent', 'premod'))
        self.assertEqual(write_stat('Actor_MaxHPRatio'), ('hp_percent', 'premod'))
        self.assertEqual(write_stat('Actor_ElemMasteryExtraDelta'), ('mastery', 'extra'))
        self.assertEqual(write_stat('Actor_CriticalExtraDelta'), ('crit_rate', 'extra'))
        self.assertEqual(write_stat('Actor_WaterAddHurtExtraDelta'), ('dmg_hydro', 'extra'))

    def test_stats_without_an_extra_lane_have_no_channel(self):
        self.assertEqual(write_stat('Actor_WaterSubHurtDelta'), ('Actor_WaterSubHurtDelta', None))
        self.assertEqual(write_stat('Actor_AddHurtDelta'), ('Actor_AddHurtDelta', None))
        self.assertEqual(write_stat('Animator_AttackSpeedRatio'), ('Animator_AttackSpeedRatio', None))


class EffectScanTests(unittest.TestCase):
    def test_stat_write_is_traced_to_the_read_through_the_override_map(self):
        # Sucrose's A4 shape: EM for others from her own non-extra EM.
        ability = {
            'abilityName': 'Share',
            'abilitySpecials': {'Factor': 0},
            'onAdded': [{
                '$type': 'SetOverrideMapValue',
                'overrideMapKey': 'Cache',
                'value': ['FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY', 'Factor', 'MUL'],
            }],
            'modifiers': {
                'Buff': {'properties': {'Actor_ElemMasteryExtraDelta': 'Cache'}},
            },
        }
        effects = effects_of({'Share': ability}, 'Share')
        self.assertEqual(len(effects), 1)
        self.assertEqual(effects[0]['where'], 'Buff')
        self.assertEqual(effects[0]['kind'], 'stat')
        self.assertEqual(
            summary(effects[0]),
            ('mastery', 'extra', [('mastery', 'premod')], ['Factor']),
        )

    def test_a_global_value_carries_a_read_between_abilities(self):
        # Bennett's burst shape: the cast stores Base ATK, the field uses it.
        cast = {
            'abilityName': 'Cast',
            'onAbilityStart': [{
                '$type': 'AddGlobalValue',
                'key': '_BaseAttack',
                'value': 1,
                'minValue': 'FIGHT_PROP_BASE_ATTACK',
                'maxValue': 'FIGHT_PROP_BASE_ATTACK',
            }],
        }
        field = {
            'abilityName': 'Field',
            'abilitySpecials': {'Ratio': 0},
            'onAdded': [{
                '$type': 'SetGlobalValueToOverrideMap',
                'overrideMapKey': 'BaseAttack',
                'globalValueKey': '_BaseAttack',
            }],
            'modifiers': {
                'AttackUp': {
                    'properties': {'Actor_AttackExtraDelta': ['Ratio', 'BaseAttack', 'MUL']},
                },
            },
        }
        result = scan_unit({'Cast': cast, 'Field': field})
        self.assertNotIn('Cast', result)
        self.assertEqual(
            summary(result['Field']['effects'][0]),
            ('atk', 'extra', [('atk', 'base')], ['Ratio']),
        )
        self.assertEqual(result['Field']['unattributed'], [])

    def test_per_hit_crit_is_not_a_stat_and_is_listed_even_when_flat(self):
        ability = {
            'abilityName': 'Crit',
            'abilitySpecials': {'Rate': 0, 'Flat': 0},
            'onAdded': [{
                '$type': 'SetOverrideMapValue',
                'overrideMapKey': 'RateCache',
                'value': ['FIGHT_PROP_MAX_HP', 'Rate', 'MUL'],
            }],
            'modifiers': {
                'Buff': {
                    'modifierMixins': [{
                        '$type': 'ModifyDamageMixin',
                        'bonusCritical': 'RateCache',
                        'bonusCriticalHurt': 'Flat',
                        'attackTags': ['Elemental_Burst'],
                    }],
                },
            },
        }
        effects = {effect['target']: effect for effect in effects_of({'Crit': ability}, 'Crit')}
        rate = effects['CRIT Rate of hits']
        self.assertEqual(rate['kind'], 'value')
        self.assertEqual(rate['tags'], ['Elemental_Burst'])
        self.assertEqual(summary(rate), ('CRIT Rate of hits', None, [('hp', 'total')], ['Rate']))
        self.assertEqual(summary(effects['CRIT DMG of hits']), ('CRIT DMG of hits', None, [], ['Flat']))

    def test_flat_writes_are_listed_only_where_a_channel_exists(self):
        ability = {
            'abilityName': 'Flat',
            'abilitySpecials': {'Value': 0},
            'modifiers': {
                'Buff': {
                    'properties': {
                        'Actor_AttackRatio': 'Value',
                        'Actor_WaterAddHurtExtraDelta': 'Value',
                        'Actor_WaterSubHurtDelta': 'Value',
                        'Actor_AntiCriticalDelta': 'Value',
                    },
                },
            },
        }
        effects = effects_of({'Flat': ability}, 'Flat')
        # In the order of the property names (see the next test).
        self.assertEqual(
            [(effect['kind'], effect['target'], effect['write']) for effect in effects],
            [
                # CRIT against the opponent: no channel, but never dropped.
                ('enemy', 'crit_rate_enemy', None),
                ('stat', 'atk_percent', 'premod'),
                ('stat', 'dmg_hydro', 'extra'),
            ],
        )

    def test_the_order_of_a_configs_fields_does_not_change_the_scan(self):
        # One dump writes the fields of an object sorted and another as the
        # game has them; the release dump of 7.2 differs from the earlier one.
        def ability(reverse):
            def ordered(fields):
                return dict(sorted(fields.items(), reverse=reverse))

            return ordered({
                'abilityName': 'Order',
                'abilitySpecials': ordered({'Ratio': 0, 'Other': 0}),
                'onAdded': [ordered({
                    '$type': 'SetOverrideMapValue',
                    'overrideMapKey': 'Cache',
                    'value': ['FIGHT_PROP_NONEXTRA_ELEMENT_MASTERY', 'Ratio', 'MUL'],
                })],
                'modifiers': ordered({
                    'Second': ordered({'properties': ordered({'Actor_ElemMasteryExtraDelta': 'Cache'})}),
                    'First': ordered({'properties': ordered({
                        'Actor_AttackRatio': 'Other',
                        'Actor_WaterAddHurtExtraDelta': 'Other',
                    })}),
                }),
            })

        forward = effects_of({'Order': ability(False)}, 'Order')
        backward = effects_of({'Order': ability(True)}, 'Order')
        self.assertEqual(forward, backward)
        self.assertEqual(
            [(effect['where'], effect['target']) for effect in forward],
            [('First', 'atk_percent'), ('First', 'dmg_hydro'), ('Second', 'mastery')],
        )

    def test_a_stat_without_a_channel_is_listed_when_it_reads_a_stat(self):
        ability = {
            'abilityName': 'Reaction',
            'modifiers': {
                'Buff': {
                    'properties': {
                        'Actor_ElemReactMoonShockDelta': ['FIGHT_PROP_NONEXTRA_ATTACK', 0.01, 'MUL'],
                    },
                },
            },
        }
        effects = effects_of({'Reaction': ability}, 'Reaction')
        self.assertEqual(
            summary(effects[0]),
            ('Actor_ElemReactMoonShockDelta', None, [('atk', 'premod')], []),
        )

    def test_a_stored_read_nothing_uses_is_reported(self):
        ability = {
            'abilityName': 'Cache',
            'onAdded': [{
                '$type': 'SetGlobalValue',
                'key': '_MaxHP_Cache',
                'value': 'FIGHT_PROP_MAX_HP',
            }],
        }
        result = scan_unit({'Cache': ability})
        self.assertEqual(result['Cache']['effects'], [])
        self.assertEqual(
            result['Cache']['unattributed'],
            [{'stat': 'hp', 'channel': 'total', 'prop': 'FIGHT_PROP_MAX_HP'}],
        )

    def test_a_compared_stat_is_a_condition(self):
        ability = {
            'abilityName': 'Check',
            'onAdded': [{
                '$type': 'Predicated',
                'targetPredicates': [{
                    '$type': 'ByTargetGlobalValue',
                    'key': '_Limit',
                    'value': 'FIGHT_PROP_ELEMENT_MASTERY',
                    'compareType': 'MoreThan',
                }],
            }],
        }
        effects = effects_of({'Check': ability}, 'Check')
        self.assertEqual(effects[0]['kind'], 'condition')
        self.assertEqual(effects[0]['reads'][0]['stat'], 'mastery')

    def test_reaction_base_bonus_has_no_channel_marker(self):
        ability = {
            'abilityName': 'Benediction',
            'abilitySpecials': {'Ratio': 0, 'Max': 0},
            'onAdded': [{
                '$type': 'SetNewElementReactionBaseDamageRatioParam',
                'propType': 'MaxHp',
                'HJCMIKFGKPK': 'Max',
                'NEECAAIOALI': ['Ratio', 0.01, 'MUL'],
            }],
        }
        effect = effects_of({'Benediction': ability}, 'Benediction')[0]
        self.assertEqual(effect['kind'], 'reaction base')
        self.assertEqual(
            summary(effect),
            ('reaction base DMG', None, [('hp', 'no marker')], ['Max', 'Ratio']),
        )

    def test_an_ability_without_stat_effects_is_left_out(self):
        ability = {
            'abilityName': 'Plain',
            'modifiers': {'Buff': {'properties': {'Actor_WaterSubHurtDelta': 0.2}}},
        }
        self.assertEqual(scan_unit({'Plain': ability}), {})


if __name__ == '__main__':
    unittest.main()
