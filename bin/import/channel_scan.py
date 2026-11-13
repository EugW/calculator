"""Stat channels of ability effects, read from the game's ability configs.

An effect is one place where an ability puts a value somewhere: a modifier
property (a stat bonus), a bonus added to hits, a heal, a shield. scan_unit()
follows each of them back through the ability's override map and the owner's
global values to the stats it is computed from, and labels both ends:

    read   premod  FIGHT_PROP_NONEXTRA_*  (the stat without "extra" bonuses)
           total   FIGHT_PROP_CUR_*, FIGHT_PROP_MAX_HP and the plain names
           base    FIGHT_PROP_BASE_*
    write  extra   Actor_*ExtraDelta
           premod  Actor_*Delta / Actor_*Ratio of a stat that has an extra lane

Stats without an extra lane (RES, reaction bonuses, speed) have no channel.
See md/buff_chains.md for what the channels mean in the calculator.
"""

import re


# FIGHT_PROP name without its NONEXTRA_/CUR_/BASE_ prefix -> calculator stat.
READ_STATS = {
    'ATTACK': 'atk',
    'DEFENSE': 'def',
    'MAX_HP': 'hp',
    'ELEMENT_MASTERY': 'mastery',
    'CHARGE_EFFICIENCY': 'recharge',
    'CRITICAL': 'crit_rate',
    'CRITICAL_HURT': 'crit_dmg',
    'FIRE_ADD_HURT': 'dmg_pyro',
    'WATER_ADD_HURT': 'dmg_hydro',
    'ICE_ADD_HURT': 'dmg_cryo',
    'ELEC_ADD_HURT': 'dmg_electro',
    'WIND_ADD_HURT': 'dmg_anemo',
    'ROCK_ADD_HURT': 'dmg_geo',
    'GRASS_ADD_HURT': 'dmg_dendro',
    'PHYSICAL_ADD_HURT': 'dmg_phys',
}
# Current values, not stats: they have no channel.
STATE_PROPS = re.compile(r'^(CUR_HP|CUR_HP_DEBTS|HP_DEBTS|\w*_ENERGY)$')

# Actor_<name>(Extra)(Delta|Ratio) -> calculator stat; these have an extra lane.
WRITE_STATS = {
    'Attack': 'atk',
    'Defence': 'def',
    'Defense': 'def',
    'MaxHP': 'hp',
    'ElemMastery': 'mastery',
    'ChargeEfficiency': 'recharge',
    'Critical': 'crit_rate',
    'CriticalHurt': 'crit_dmg',
    'FireAddHurt': 'dmg_pyro',
    'WaterAddHurt': 'dmg_hydro',
    'IceAddHurt': 'dmg_cryo',
    'ElecAddHurt': 'dmg_electro',
    'WindAddHurt': 'dmg_anemo',
    'RockAddHurt': 'dmg_geo',
    'GrassAddHurt': 'dmg_dendro',
    'PhysicalAddHurt': 'dmg_phys',
}
PERCENT_WRITES = {'Attack', 'Defence', 'Defense', 'MaxHP'}
WRITE_RE = re.compile(r'^Actor_(\w+?)(Extra)?(Delta|Ratio)$')
# Written on an opponent: CRIT against it, not a stat of the member. Always
# listed, like per-hit CRIT.
ENEMY_WRITES = {'Actor_AntiCriticalDelta': 'crit_rate_enemy'}

OPERATORS = {'MUL', 'ADD', 'SUB', 'DIV', 'DPM'}

# Fields whose value is an expression that may name an override-map entry or a
# global value. Any other field only counts when it reads a stat directly.
VALUE_FIELDS = {
    'damageExtra': 'flat damage',
    'damagePercentage': 'multiplier',
    'damagePercentageRatio': 'multiplier ratio',
    'bonusCritical': 'CRIT Rate of hits',
    'bonusCriticalHurt': 'CRIT DMG of hits',
    'amount': 'healing',
    'shieldHP': 'shield',
    'maxShieldHP': 'shield',
    # Obfuscated in the dumps, under a name that changes with the dump: the
    # damage of a reaction hit, and a value of ModifyDamageMixin.
    'ODOCDKOAICG': 'reaction damage',
    'NIINMHMEIAP': 'reaction damage',
    'OOGPFIGOCJD': None,
    'IMINCOHKHLH': None,
    'value': None,
    'targetValue': None,
}
# Per-hit CRIT is listed even when it reads no stat: it is not a stat of the
# member, which matters to effects that read the member's CRIT.
ALWAYS_LISTED = {'bonusCritical', 'bonusCriticalHurt'}
PROP_TYPES = {'MaxHp': 'hp', 'Defense': 'def', 'Mastery': 'mastery', 'Attack': 'atk'}


def read_stat(prop):
    """FIGHT_PROP_* -> (stat, channel); channel None for a current value."""
    name = prop[len('FIGHT_PROP_'):]
    if STATE_PROPS.match(name):
        return (name.lower(), None)
    channel = 'total'
    for (prefix, prefix_channel) in (('NONEXTRA_', 'premod'), ('BASE_', 'base'), ('CUR_', 'total')):
        if name.startswith(prefix):
            name = name[len(prefix):]
            channel = prefix_channel
            break
    stat = READ_STATS.get(name)
    if stat is None:
        return (name.lower(), None)
    return (stat, channel)


def write_stat(key):
    """Modifier property -> (stat, channel); channel None without an extra lane."""
    match = WRITE_RE.match(key)
    if not match or match.group(1) not in WRITE_STATS:
        return (key, None)
    (name, extra, form) = match.groups()
    stat = WRITE_STATS[name]
    if form == 'Ratio' and name in PERCENT_WRITES:
        stat += '_percent'
    return (stat, 'extra' if extra else 'premod')


def _is_expression(value):
    if isinstance(value, str):
        return True
    return (
        isinstance(value, list)
        and bool(value)
        and all(not isinstance(item, (dict, list)) for item in value)
    )


def _tokens(value):
    return [item for item in (value if isinstance(value, list) else [value]) if isinstance(item, str)]


def _has_direct_read(value):
    return any(token.startswith('FIGHT_PROP_') for token in _tokens(value))


def _fields(node):
    """A config object's fields by name.

    One dump writes them sorted and another as the game has them: the scan
    reads them in one order, so its result does not depend on the dump.
    """
    return sorted(node.items())


class UnitScan:
    """One owner's abilities: a character, a weapon, an artifact set.

    Global values belong to the owner and pass values between its abilities,
    so they are shared; an override map belongs to one ability.
    """

    def __init__(self, abilities):
        self.abilities = abilities
        self.overrides = {name: {} for name in abilities}
        self.globals = {}
        self.read_sources = {name: {} for name in abilities}
        for (name, ability) in abilities.items():
            self._collect(name, ability)

    # --- symbols

    def _assign_override(self, ability, key, expr):
        if isinstance(key, str) and _is_expression(expr):
            self.overrides[ability].setdefault(key, []).append((ability, expr))

    def _assign_global(self, ability, key, expr):
        if isinstance(key, str) and _is_expression(expr):
            self.globals.setdefault(key, []).append((ability, expr))

    def _assignment(self, ability, node):
        """Record a node that stores a value under a name; True if it is one."""
        node_type = node.get('$type')
        stored = []
        if node_type == 'SetOverrideMapValue':
            stored.append(node.get('value'))
            self._assign_override(ability, node.get('overrideMapKey'), node.get('value'))
        elif node_type in ('SetGlobalValue', 'AddGlobalValue'):
            for field in ('value', 'minValue', 'maxValue'):
                stored.append(node.get(field))
                self._assign_global(ability, node.get('key'), node.get(field))
        elif node_type == 'GetFightProperty':
            stored.append(node.get('fightProp'))
            self._assign_global(ability, node.get('globalValueKey'), node.get('fightProp'))
        elif node_type == 'SetGlobalValueToOverrideMap':
            self._assign_override(ability, node.get('overrideMapKey'), node.get('globalValueKey'))
        elif node_type == 'SetTeamFightPropertyToOverrideMapKey':
            for (field, value) in _fields(node):
                if field != 'overrideMapKey' and isinstance(value, str) and value.startswith('FIGHT_PROP_'):
                    stored.append(value)
                    self._assign_override(ability, node.get('overrideMapKey'), value)
        else:
            return False
        for value in stored:
            if _is_expression(value):
                for token in _tokens(value):
                    if token.startswith('FIGHT_PROP_'):
                        self.read_sources[ability].setdefault(token, False)
        return True

    def _collect(self, ability, node):
        if isinstance(node, dict):
            self._assignment(ability, node)
            for (_, value) in _fields(node):
                self._collect(ability, value)
        elif isinstance(node, list):
            for value in node:
                self._collect(ability, value)

    # --- expressions

    def resolve(self, ability, expr, seen=()):
        """-> (stat reads, ability parameters) an expression is built from."""
        reads = []
        specials = []
        ability_specials = self.abilities[ability].get('abilitySpecials') or {}
        for token in _tokens(expr):
            if token.startswith('FIGHT_PROP_'):
                reads.append((ability, token))
                continue
            name = token.lstrip('%')
            if name in OPERATORS or (ability, name) in seen:
                continue
            sources = self.overrides[ability].get(name, []) + self.globals.get(name, [])
            for (source_ability, source_expr) in sources:
                (sub_reads, sub_specials) = self.resolve(
                    source_ability, source_expr, seen + ((ability, name),)
                )
                reads += sub_reads
                specials += sub_specials
            if name in ability_specials:
                specials.append((ability, name))
        return (reads, specials)

    # --- effects

    def scan(self, ability):
        """-> (effects, unattributed reads) of one ability."""
        effects = []
        self._effects(ability, self.abilities[ability], '', '', effects)
        unattributed = []
        for (prop, used) in self.read_sources[ability].items():
            (stat, channel) = read_stat(prop)
            if not used and channel is not None:
                unattributed.append({'stat': stat, 'channel': channel, 'prop': prop})
        return (effects, unattributed)

    def _effect(self, ability, effects, where, kind, target, prop, expr, write=None, tags=None, always=False):
        (reads, specials) = self.resolve(ability, expr)
        for (source_ability, read_prop) in reads:
            if read_prop in self.read_sources[source_ability]:
                self.read_sources[source_ability][read_prop] = True
        read_list = []
        for (_, read_prop) in reads:
            (stat, channel) = read_stat(read_prop)
            entry = {'stat': stat, 'channel': channel, 'prop': read_prop}
            if channel is not None and entry not in read_list:
                read_list.append(entry)
        if not read_list and not always:
            return
        special_list = []
        for special in specials:
            if special not in special_list:
                special_list.append(special)
        effect = {
            'where': where,
            'kind': kind,
            'target': target,
            'property': prop,
            'write': write,
            'reads': read_list,
            'specials': special_list,
        }
        if tags:
            effect['tags'] = list(tags)
        if effect not in effects:
            effects.append(effect)

    def _effects(self, ability, node, node_type, where, effects):
        if isinstance(node, list):
            for value in node:
                self._effects(ability, value, node_type, where, effects)
            return
        if not isinstance(node, dict):
            return
        node_type = node.get('$type', node_type)
        if node.get('$type') == 'SetNewElementReactionBaseDamageRatioParam':
            # Moonsign and Stellar base bonuses: the stat is named, with no
            # marker of premod or total.
            stat = PROP_TYPES.get(node.get('propType') or 'Attack', str(node.get('propType')))
            effect = {
                'where': where,
                'kind': 'reaction base',
                'target': 'reaction base DMG',
                'property': node_type,
                'write': None,
                'reads': [{'stat': stat, 'channel': 'no marker', 'prop': 'propType'}],
                'specials': [],
            }
            # The ratio and its limits sit in obfuscated fields.
            for (field, value) in _fields(node):
                if field not in ('$type', 'propType') and _is_expression(value):
                    for special in self.resolve(ability, value)[1]:
                        if special not in effect['specials']:
                            effect['specials'].append(special)
            if effect not in effects:
                effects.append(effect)
        assignment = node_type in (
            'SetOverrideMapValue', 'SetGlobalValue', 'AddGlobalValue', 'GetFightProperty',
            'SetGlobalValueToOverrideMap', 'SetTeamFightPropertyToOverrideMapKey',
        ) and '$type' in node
        condition = (
            node_type.startswith('By') or 'compareType' in node or 'logic' in node
        ) and '$type' in node
        for (field, value) in _fields(node):
            if field == 'modifiers' and isinstance(value, dict):
                for (modifier, body) in _fields(value):
                    self._effects(ability, body, node_type, modifier, effects)
                continue
            if field == 'properties' and isinstance(value, dict):
                for (prop, expr) in _fields(value):
                    if not _is_expression(expr):
                        continue
                    (stat, channel) = write_stat(prop)
                    if prop in ENEMY_WRITES:
                        self._effect(
                            ability, effects, where, 'enemy', ENEMY_WRITES[prop], prop, expr,
                            always=True,
                        )
                        continue
                    self._effect(
                        ability, effects, where, 'stat', stat, prop, expr,
                        write=channel, always=channel is not None,
                    )
                continue
            if _is_expression(value) and not assignment:
                if field in VALUE_FIELDS or _has_direct_read(value):
                    kind = 'condition' if condition else 'value'
                    target = VALUE_FIELDS.get(field) or f'{node_type}.{field}'
                    self._effect(
                        ability, effects, where, kind, target, f'{node_type}.{field}', value,
                        tags=node.get('attackTags'), always=field in ALWAYS_LISTED,
                    )
                continue
            self._effects(ability, value, node_type, where, effects)


def scan_unit(abilities):
    """{ability name: {'effects': [...], 'unattributed': [...]}} for one owner.

    Abilities without a stat effect are left out.
    """
    unit = UnitScan(abilities)
    scans = {name: unit.scan(name) for name in abilities}
    result = {}
    for name in abilities:
        # A read stored in one ability may be used by another one's effect.
        unattributed = [
            read for read in scans[name][1]
            if not unit.read_sources[name][read['prop']]
        ]
        if scans[name][0] or unattributed:
            result[name] = {'effects': scans[name][0], 'unattributed': unattributed}
    return result
