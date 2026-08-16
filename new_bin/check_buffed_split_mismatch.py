import csv
import re
import sys
from pathlib import Path


def collect_names(csv_path: Path):
    with csv_path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file, delimiter=";")
        return {
            row["name"]
            for row in reader
            if row.get("name")
        }


def find_mismatches(names):
    buffed_keys = sorted(name for name in names if name.endswith("_buffed"))
    mismatches = []

    for buffed_key in buffed_keys:
        base_key = buffed_key[:-7]  # strip "_buffed"
        split_parts = sorted(
            int(match.group(1))
            for name in names
            if (match := re.fullmatch(re.escape(base_key) + r"_(\d+)", name))
        )

        if split_parts:
            mismatches.append((buffed_key, base_key, split_parts))

    return buffed_keys, mismatches


def main():
    default_path = Path("data/strings/generated/char_talents.csv")
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_path

    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        sys.exit(1)

    names = collect_names(csv_path)
    buffed_keys, mismatches = find_mismatches(names)

    print(f"CSV: {csv_path}")
    print(f"Total exact _buffed keys: {len(buffed_keys)}")
    print(f"_buffed keys where stripped base has split keys (_1/_2/...): {len(mismatches)}")
    print("")

    if not mismatches:
        print("No mismatches found.")
        return

    for buffed_key, base_key, split_parts in mismatches:
        parts = ",".join(str(part) for part in split_parts)
        print(f"{buffed_key} -> base: {base_key} -> split parts: {parts}")


if __name__ == "__main__":
    main()
