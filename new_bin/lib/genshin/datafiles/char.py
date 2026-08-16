from .base import ListParser
from .passives import (
    COMBAT_INHERENT_PROUD_SKILL_GROUP_IDS,
    is_combat_inherent_proud_skill_open,
)

SKIP_CHARACTERS = [
    10000001, 11000008, 11000009, 11000010, 11000011, 11000013, 11000017,
    11000018, 11000019, 11000025, 11000026, 11000027, 11000028, 11000030, 11000031, 11000032, 11000033, 11000034,
    11000035, 11000036, 11000037, 11000038, 11000039, 11000040, 11000041, 11000042, 11000043, 11000044, 11000045,
    11000046, 11000047, 11000048, 11000134, 11000135,
    10000134, 10000135,
    10000901, 10000902, 10000903, 10000904, 10000998, 10000999,
    11000998, 11000999,
]

class CharData(ListParser):
    filename = 'AvatarExcelConfigData.json'


class CharSkillDepotData(ListParser):
    filename = 'AvatarSkillDepotExcelConfigData.json'

    # Map obfuscated keys (5.0+ data dumps) back to original names.
    # Only applied when the original key is absent, so old dumps still work.
    KEY_ALIASES = {
        'LOAMPGAFLMA': 'inherentProudSkillOpens',
        'BKHEBEGJIAO': 'inherentProudSkillOpens',
        'LHNAJLJNBAH': 'inherentProudSkillOpens',
        'GPDJAHEANHE': 'specialProudSkillOpens',
        'DAEIJGCFNLL': 'specialProudSkillOpens',
        'NMKACHALCPO': 'specialProudSkillOpens',
    }
    NESTED_KEY_ALIASES = {
        'inherentProudSkillOpens': {
            'AMKLKEEBGPM': 'needAvatarPromoteLevel',
            'AEELKPGFNEA': 'needAvatarPromoteLevel',
            'KGGNNMEALJM': 'needAvatarPromoteLevel',
        },
    }

    def parse(self):
        super().parse()
        for item in self.get_list():
            # Rename top-level obfuscated keys
            for obf_key, orig_key in self.KEY_ALIASES.items():
                if orig_key not in item and obf_key in item:
                    item[orig_key] = item.pop(obf_key)
            # Rename nested obfuscated keys
            for parent_key, aliases in self.NESTED_KEY_ALIASES.items():
                for child in item.get(parent_key, []):
                    if isinstance(child, dict):
                        for obf_key, orig_key in aliases.items():
                            if orig_key not in child and obf_key in child:
                                child[orig_key] = child.pop(obf_key)
            self.normalize_skill_open_fields(item)

    def normalize_skill_open_fields(self, item):
        inherent_opens = item.get('inherentProudSkillOpens')
        if not inherent_opens:
            inferred = self.find_proud_skill_open_list(item, with_promote_level=True)
            if inferred:
                item['inherentProudSkillOpens'] = inferred
                inherent_opens = inferred

        if inherent_opens:
            self.normalize_promote_level_fields(inherent_opens)

        if not item.get('specialProudSkillOpens'):
            inferred = self.find_proud_skill_open_list(item, with_promote_level=False)
            if inferred:
                item['specialProudSkillOpens'] = inferred

    def find_proud_skill_open_list(self, item, with_promote_level):
        for key, value in item.items():
            if key in ('inherentProudSkillOpens', 'specialProudSkillOpens'):
                continue
            if not self.is_proud_skill_open_list(value):
                continue
            if self.has_promote_level_field(value) == with_promote_level:
                return value
        return None

    @staticmethod
    def is_proud_skill_open_list(value):
        return (
            isinstance(value, list)
            and value
            and all(isinstance(child, dict) for child in value)
            and any(child.get('proudSkillGroupId') for child in value)
        )

    @staticmethod
    def has_promote_level_field(value):
        for child in value:
            for key, val in child.items():
                if key != 'proudSkillGroupId' and isinstance(val, int):
                    return True
        return False

    @staticmethod
    def normalize_promote_level_fields(value):
        for child in value:
            if 'needAvatarPromoteLevel' in child:
                continue
            for key, val in child.items():
                if key != 'proudSkillGroupId' and isinstance(val, int):
                    child['needAvatarPromoteLevel'] = val
                    break


class CharSkillData(ListParser):
    filename = 'AvatarSkillExcelConfigData.json'


BUFFED_DESC_TEXT_MAP_HASH_KEYS = (
    'OBHFOBHLHFK',
    'JDKOMPNCEMO',
    'POMMPOECOFA',
    'uniqueDescTextMapHash',
    'BDLFGGJDHLI',
)


def normalize_buffed_desc(item):
    if item.get('extraDescTextMapHash'):
        return

    desc_hash = item.get('descTextMapHash')
    for key in BUFFED_DESC_TEXT_MAP_HASH_KEYS:
        extra_desc_hash = item.get(key)
        if extra_desc_hash and extra_desc_hash != desc_hash:
            item['extraDescTextMapHash'] = extra_desc_hash
            return


class CharProudSkillData(ListParser):
    id_field = 'proudSkillId'
    filename = 'ProudSkillExcelConfigData.json'

    def parse(self):
        super().parse()
        for item in self.get_list():
            normalize_buffed_desc(item)


class CharTalentSkillData(ListParser):
    id_field = 'talentId'
    filename = 'AvatarTalentExcelConfigData.json'

    def parse(self):
        super().parse()
        for item in self.get_list():
            normalize_buffed_desc(item)
