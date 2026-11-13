# Game-data source selection

All legacy `bin/import` generators and the `new_bin` data-file readers use the
same revision-checked source configuration. Every invocation must explicitly
select both a checkout and its expected revision; there is no implicit source
default.

Select a checkout with command-line options:

```powershell
python bin/import/artifact_itemids.py --data-root C:\path\to\genshin-data `
  --expected-data-revision 8ba944addd6de9adad88d7dd9cc951d780905b36 --recent
```

Or set the equivalent environment variables before invoking a `new_bin`
script:

```powershell
$env:GENSHIN_DATA_ROOT = 'C:\path\to\genshin-data'
$env:GENSHIN_DATA_REVISION = '8ba944addd6de9adad88d7dd9cc951d780905b36'
python new_bin/import_artifacts.py
```

The importer resolves both revisions to full commit IDs, requires the selected
checkout's `HEAD` to match, rejects dirty or untracked source files, and prints
the selected root and revision to stderr. It does not switch checkouts or copy
data. Base and `TextMap_Medium` files are merged by the same resolver;
conflicting duplicate hashes are rejected.

`char_talent_scales.py` also reads `BinOutput/Talent/AvatarTalents` from the
same checkout. Besides the three active talents (`s1`-`s3`) it writes each
character's passives (`a1`, `a4`, `a0` for the ones open from the start, `sp`
for specially unlocked ones) and constellations (`c1`-`c6`) that have params.
Those have no format code in the game data, so the values are raw (0.15 for
15%); the comment above each one is the ability parameter it feeds, and "also
fed by" lists the other positions the game adds into the same parameter.

`equip_param_tables.py` does the same for equipment: it writes
`WeaponPassiveTables.js` (one value per refinement) and `ArtifactSetTables.js`
(`pc2` / `pc4` blocks). A named stat (`hp_percent`) is a bonus the passive's
table row gives directly; the row names its property, so it is in calculator
units (20 for 20%). `pN` is a position of its `paramList` and is raw.
Weapons take their names from `weapon_names` in `weapon_stat_scales.py` and
sets from `artifact_set_names` in `equip_common.py`; a set missing there is
named after its English title.

`ability_channels.py` reads `BinOutput/Ability/Temp` and `BinOutput/Talent`
and writes `data/raw/ability_channels.txt`: for every character, weapon and
artifact set, the effects of its abilities with the stats they read and write
and the channel of each (premod, total, base, extra). The header of the text
file explains the notation; `channel_scan.py` holds the detection. A new
character appears in it once it is in `static.py`.

A beta dump and a release dump of the same data are not written the same way.
The readers allow for the differences, so the output does not depend on the
dump (the 7.2 release against the beta data before it):

- A field can still be under an obfuscated name, which changes with the dump:
  a depot's specially unlocked passives (`special_proud_skill_opens` takes
  the depot's other list of passives), the damage of a reaction hit and a
  value of `ModifyDamageMixin` (`channel_scan.VALUE_FIELDS`: a new name goes
  next to the known ones).
- A field at its default is left out by one dump and written by the other (a
  zero `paramRatio`).
- A number is the double of a 32-bit float in one dump and already its short
  decimal in the other (`format_param` prints both the same).
- An object's fields are in the game's order in one dump and sorted in the
  other: the scan reads them by name, so its lines come in one order.

Generators rewrite the shared output files to match the selected snapshot.
Selecting an older revision will intentionally remove entities and strings
that exist only in a later snapshot, so use the revision intended for the
published dataset.

Run the focused contract tests with:

```powershell
python -m unittest discover -s bin/import/tests -p "test_*.py"
```
