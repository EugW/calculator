from .base import ListParser

IGNORED_WEAPONS = [
    10002, 10003, 10004, 10005, 10006, 10008, 10009, 10010, 10011, 10012,
    11411, 11506, 11507, 11508,
    12506, 12508, 12509, 13304, 13503, 13506, 14306, 14411, 14503,
    14508, 15504, 15505, 15506, 20001, 12505, 12304, 15306, 11419, 11420,
    11421
]

SUPPORTED_WEAPON_RARITIES = {1, 3, 4, 5}


class WeaponData(ListParser):
    filename = 'WeaponExcelConfigData.json'

    def parse(self):
        super().parse()
        for item in self.get_list():
            # Some current dumps mark event weapons as rankLevel 1; the id still carries their rarity.
            rarity = (item['id'] // 100) % 10
            if rarity >= 3 and item.get('rankLevel', 0) < rarity:
                item['rankLevel'] = rarity


class WeaponSkillData(ListParser):
    filename = 'EquipAffixExcelConfigData.json'
    id_field = 'affixId'


class WeaponPromoteData(ListParser):
    filename = 'WeaponPromoteExcelConfigData.json'
    id_field = None
