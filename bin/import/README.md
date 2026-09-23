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

Generators rewrite the shared output files to match the selected snapshot.
Selecting an older revision will intentionally remove entities and strings
that exist only in a later snapshot, so use the revision intended for the
published dataset.

Run the focused contract tests with:

```powershell
python -m unittest discover -s bin/import/tests -p "test_*.py"
```
