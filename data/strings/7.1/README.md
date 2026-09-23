# 7.1 weapon string provenance

Weapon strings use the ordinary generated tables. Regenerate them from the
checked-out game-data `main` revision with the shared source environment:

```powershell
$env:GENSHIN_DATA_ROOT = 'C:\path\to\game-data'
$env:GENSHIN_DATA_REVISION = '8ba944addd6de9adad88d7dd9cc951d780905b36'
python new_bin/import_weapons.py
```

This pinned snapshot provides official localized names and passive text for all
six weapons:

- `11437` — New Bough
- `11438` — Silver Light
- `11522` — Beyond the Chrysalis
- `14437` — Winter's Heavy Heart
- `14524` — Hymn of the Maelstrom
- `15437` — Breezeborne Refrain

The ordinary importer owns their rows in `../generated/weapon_names.csv` and
`../generated/weapon_talents.csv`: display names, passive titles, and passive
descriptions are generated, not versioned fallbacks. Templates split the Hymn
of the Maelstrom and Breezeborne Refrain source descriptions into the official
self/base and party clauses needed by their separate calculator panels.

`weapons.csv` is restricted to calculator-only controls and help text for
states, stack counts, sequence choices, and holder input. Reuse a generated key
when an exact source title exists: the New Bough and Winter's Heavy Heart
Radiance controls use `talent_name.n11500004`, and Breezeborne Refrain's
three-stack condition uses its generated passive title. Versioned rows must not
paraphrase or override source-owned text.

The specialized Hymn party calculation and controls live in
`src/js/db/Buffs/Weapons/HymnofTheMaelstrom.js`; the general weapon-buff
registry only includes the exported condition instance. Runtime availability
remains configuration-driven and does not depend on localized text or importer
behavior.
