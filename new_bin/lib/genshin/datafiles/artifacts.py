from .base import ListParser, Parser
from ..config import normalize_alias

SKIP_ARTIFACTS = [
    15000, 15004, 15012
]

class ArtifactSetData(ListParser):
    filename = 'ReliquarySetExcelConfigData.json'
    id_field = 'setId'

    def parse(self):
        super().parse()
        for row_index, item in enumerate(self.get_list()):
            if (
                item.get('setId') in SKIP_ARTIFACTS
                and 'equipAffixId' not in item
                and 'EquipAffixId' not in item
            ):
                continue
            normalize_alias(
                item,
                'equipAffixId',
                'EquipAffixId',
                context=f'ReliquarySet row {row_index}',
            )


class ArtifactPieceBonusesData(ListParser):
    filename = 'EquipAffixExcelConfigData.json'
    id_field = 'affixId'

    def bonuses_list(self, affix_id: int):
        items = self.get_list_by_field('id', affix_id)
        return sorted(items, key=lambda i: i.get('level', 0))


class ArtifactData(ListParser):
    filename = 'ReliquaryExcelConfigData.json'


class ArtifactMainstatData(Parser):
    filename = 'ReliquaryLevelExcelConfigData.json'
