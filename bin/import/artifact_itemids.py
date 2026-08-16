import json
import os
from source_config import get_excel_dir

dirname  = os.path.dirname(__file__)
data_dir = str(get_excel_dir()) + os.sep

def get_artifact_itemids():
    """Extract itemIds grouped by setId from ReliquaryExcelConfigData.json"""
    file = open(data_dir + 'ReliquaryExcelConfigData.json', 'r', encoding='utf-8')
    data = json.load(file)
    file.close()

    # Group items by setId
    sets = {}
    for item in data:
        set_id = item.get('setId', 0)
        if set_id == 0:
            continue

        item_id = item.get('id')
        if item_id is None:
            continue

        if set_id not in sets:
            sets[set_id] = []
        sets[set_id].append(item_id)

    # Sort itemIds within each set
    for set_id in sets:
        sets[set_id] = sorted(sets[set_id])

    return sets

def print_set_itemids(set_id):
    """Print itemIds for a specific set in JS array format"""
    sets = get_artifact_itemids()
    if set_id not in sets:
        print(f"Set {set_id} not found")
        return

    item_ids = sets[set_id]
    print(f"itemIds: [{', '.join(map(str, item_ids))}],")

def print_all_sets():
    """Print all sets with their itemIds"""
    sets = get_artifact_itemids()
    for set_id in sorted(sets.keys()):
        if set_id >= 15000:  # Only print 5-star artifact sets
            print(f"// setId: {set_id}")
            print(f"itemIds: [{', '.join(map(str, sets[set_id]))}],")
            print()

def find_missing_itemids():
    """Find sets that might be missing itemIds in the codebase"""
    sets = get_artifact_itemids()

    # Sets from 15001 onwards are the main artifact sets
    print("Recent artifact sets (15030+):")
    for set_id in sorted(sets.keys()):
        if set_id >= 15030:
            item_ids = sets[set_id]
            print(f"  {set_id}: {len(item_ids)} items -> [{', '.join(map(str, item_ids))}]")

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == '--all':
            print_all_sets()
        elif sys.argv[1] == '--recent':
            find_missing_itemids()
        else:
            try:
                set_id = int(sys.argv[1])
                print_set_itemids(set_id)
            except ValueError:
                print("Usage: python artifact_itemids.py [setId|--all|--recent]")
    else:
        print("Usage: python artifact_itemids.py [setId|--all|--recent]")
        print("  setId:    Print itemIds for specific set (e.g., 15043)")
        print("  --all:    Print all sets")
        print("  --recent: Print recent sets (15030+)")
