"""Semantic routing for inherent passive groups."""


# Inherent groups without an ascension requirement are normally exploration or
# utility passives. These groups are explicitly known to affect combat and must
# be exported. Keep this allowlist narrow so exploration passives do not leak
# into combat talent strings.
COMBAT_INHERENT_PROUD_SKILL_GROUP_IDS = frozenset({
    823,    # Cryo Traveler: Stellar Jubilee
    11423,  # Skirk: party Elemental Skill level
    11623,  # Ineffa: Moonsign/Lunar-Charged conversion
    13323,  # Sandrone: Stellar Jubilee
    14323,  # Vesna: Stellar Jubilee
    14823,  # Alyosha: Radiance/Mark combat effect
    15023,  # Odette: Stellar Jubilee
})


def is_combat_inherent_proud_skill_open(skill_open):
    return bool(
        skill_open.get('needAvatarPromoteLevel')
        or skill_open.get('proudSkillGroupId')
        in COMBAT_INHERENT_PROUD_SKILL_GROUP_IDS
    )
