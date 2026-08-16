# 7.1 weapon string provenance

Weapon strings use the ordinary generated tables. Regenerate them from the
checked-out game-data `main` revision with:

```powershell
python new_bin/import_weapons.py `
    --data-root C:\path\to\game-data `
    --expected-data-revision 535bae69dc326195e90273c5720fa8c1bf3de721
```

The source rows for these six IDs still have generic weapon-type names and
missing or generic passive titles:

- `11437` / `spiked_stake`
- `11438` / `fajian`
- `11522` / `samosvist`
- `14437` / `frost_scepter`
- `14524` / `bludnye`
- `15437` / `windtalker`

For those rows, `weapons.csv` supplies only the calculator's visible name/title
fallbacks and its control/help labels. Passive descriptions remain source-owned
in `../generated/weapon_talents.csv`. The importer checks the exact placeholder
values and fails when they change, prompting removal of the corresponding
manual fallback.

Runtime availability is configuration-driven and does not depend on localized
text or importer behavior.
