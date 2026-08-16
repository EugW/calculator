import json
import os
import re
import static # type: ignore
from source_config import get_excel_dir, required_alias

dirname  = os.path.dirname(__file__)
data_dir = str(get_excel_dir()) + os.sep

# rounded_stats = ['atk', 'hp', 'def', 'mastery']
# stats = ['atk', 'atk_percent', 'def', 'def_percent', 'hp', 'hp_percent', 'mastery', 'recharge', 'crit_rate', 'crit_dmg']

def parse_rolls():
    file   = open(data_dir + 'ReliquaryLevelExcelConfigData.json', 'r', encoding='utf-8')
    result = {}

    for row_index, item in enumerate(json.load(file)):
        context = f'ReliquaryLevel row {row_index}'
        level = required_alias(item, 'level', 'Level', context=context)
        add_props = required_alias(item, 'addProps', 'AddProps', context=context)
        result[level] = {}

        for prop_index, prop in enumerate(add_props):
            prop_context = f'{context} addProps[{prop_index}]'
            type = required_alias(prop, 'propType', 'PropType', context=prop_context)
            stat  = static.getStatByName(type)
            raw_value = required_alias(prop, 'value', 'Value', context=prop_context)
            value = static.getStatValue(type, raw_value)

            stat = re.sub(r'_base', '', stat)

            result[level][stat] = static.trimValue(value)

    print(result)
    return result

parse_rolls()
