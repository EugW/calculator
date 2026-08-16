import json
import os
from source_config import get_excel_dir, load_text_map

dirname = os.path.dirname(__file__)
data_dir = str(get_excel_dir()) + os.sep

ids = [11419, 11420, 11421, 11429, 11519, 12515, 12516, 14522]

try:
    lang = load_text_map('EN')

    with open(os.path.join(data_dir, 'WeaponExcelConfigData.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)

    for item in data:
        w_id = item.get('id')
        if w_id in ids:
            name_hash = str(item.get('nameTextMapHash'))
            name = lang.get(name_hash, "Unknown")
            if name != "Unknown":
                clean_name = ''.join(w.capitalize() for w in name.replace("'", "").split())
                print(f"    {w_id}: '{clean_name}',")
            else:
                print(f"Unknown Hash: {w_id}")
except Exception as e:
    import traceback
    traceback.print_exc()
