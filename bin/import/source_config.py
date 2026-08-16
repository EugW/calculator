"""Shared, revision-checked access to the game-data checkout.

Import scripts may select a checkout with either command-line flags or the
matching environment variables::

    --data-root PATH                 GENSHIN_DATA_ROOT=PATH
    --expected-data-revision REV     GENSHIN_DATA_REVISION=REV

Both values are required so a generator can never select a different snapshot
implicitly. The command-line options are removed from ``sys.argv`` so existing
scripts with their own positional arguments keep working.
"""

from __future__ import annotations

import glob
import json
import os
from dataclasses import dataclass
from pathlib import Path
import subprocess
import sys
from typing import Any, Mapping, MutableMapping


DATA_ROOT_ENV = 'GENSHIN_DATA_ROOT'
DATA_REVISION_ENV = 'GENSHIN_DATA_REVISION'


class DataSourceError(RuntimeError):
    """The selected data checkout cannot safely be used."""


class SourceSchemaError(ValueError):
    """A consumed source row does not match the supported schema."""


@dataclass(frozen=True)
class DataSource:
    root: Path
    expected_revision: str
    revision: str

    @property
    def excel_dir(self) -> Path:
        return self.root / 'ExcelBinOutput'

    @property
    def text_map_dir(self) -> Path:
        return self.root / 'TextMap'


_cached_source: DataSource | None = None


def _pop_cli_value(argv: list[str], option: str) -> str | None:
    prefix = option + '='
    for index, arg in enumerate(argv):
        if arg.startswith(prefix):
            argv.pop(index)
            return arg[len(prefix):]
        if arg == option:
            if index + 1 >= len(argv):
                raise DataSourceError(f'{option} requires a value')
            argv.pop(index)
            return argv.pop(index)
    return None


def _git_revision(root: Path, revision: str = 'HEAD') -> str:
    try:
        result = subprocess.run(
            ['git', '-C', str(root), 'rev-parse', '--verify', f'{revision}^{{commit}}'],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        detail = getattr(exc, 'stderr', '') or str(exc)
        raise DataSourceError(
            f'Cannot resolve git revision {revision!r} in data root {root}: '
            f'{detail.strip()}'
        ) from exc
    return result.stdout.strip().lower()


def _require_clean_worktree(root: Path) -> None:
    try:
        result = subprocess.run(
            [
                'git', '-C', str(root), 'status', '--porcelain=v1',
                '--untracked-files=all',
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        detail = getattr(exc, 'stderr', '') or str(exc)
        raise DataSourceError(
            f'Cannot inspect game-data worktree {root}: {detail.strip()}'
        ) from exc

    dirty_paths = result.stdout.strip()
    if dirty_paths:
        preview = '\n'.join(dirty_paths.splitlines()[:10])
        raise DataSourceError(
            f'Data root {root} has uncommitted or untracked files:\n{preview}'
        )


def resolve_data_source(
    root: str | os.PathLike[str],
    expected_revision: str,
    *,
    announce: bool = False,
) -> DataSource:
    root_path = Path(root).expanduser().resolve()
    if not root_path.is_dir():
        raise DataSourceError(f'Data root does not exist: {root_path}')

    for required_dir in ('ExcelBinOutput', 'TextMap'):
        if not (root_path / required_dir).is_dir():
            raise DataSourceError(
                f'Data root {root_path} is missing required directory {required_dir}'
            )

    actual_revision = _git_revision(root_path)
    expected_full_revision = _git_revision(root_path, expected_revision)
    if actual_revision != expected_full_revision:
        raise DataSourceError(
            f'Data root {root_path} is at {actual_revision}, expected '
            f'{expected_full_revision} ({expected_revision})'
        )
    _require_clean_worktree(root_path)

    source = DataSource(root_path, expected_full_revision, actual_revision)
    if announce:
        print(
            f'[data-source] root={source.root} revision={source.revision}',
            file=sys.stderr,
        )
    return source


def get_data_source() -> DataSource:
    global _cached_source
    if _cached_source is not None:
        return _cached_source

    data_root = _pop_cli_value(sys.argv, '--data-root')
    expected_revision = _pop_cli_value(sys.argv, '--expected-data-revision')
    data_root = data_root or os.environ.get(DATA_ROOT_ENV)
    expected_revision = expected_revision or os.environ.get(DATA_REVISION_ENV)
    if not data_root or not expected_revision:
        raise DataSourceError(
            'Game-data source selection is required. Pass both --data-root '
            'and --expected-data-revision, or set both GENSHIN_DATA_ROOT and '
            'GENSHIN_DATA_REVISION.'
        )
    _cached_source = resolve_data_source(data_root, expected_revision, announce=True)
    return _cached_source


def get_excel_dir() -> Path:
    return get_data_source().excel_dir


def excel_path(filename: str) -> Path:
    path = get_excel_dir() / filename
    if not path.is_file():
        raise DataSourceError(f'Required Excel table is missing: {path}')
    return path


def _text_map_paths(source: DataSource, language: str) -> list[Path]:
    language = language.upper()
    base = source.text_map_dir
    paths: list[Path] = []
    for stem in (f'TextMap{language}', f'TextMap_Medium{language}'):
        exact = base / f'{stem}.json'
        if exact.is_file():
            paths.append(exact)
        paths.extend(Path(path) for path in sorted(glob.glob(str(base / f'{stem}_*.json'))))
    return paths


def load_text_map(language: str = 'EN', *, source: DataSource | None = None) -> dict[str, str]:
    """Merge base and Medium TextMaps, rejecting conflicting duplicate hashes."""

    selected_source = source or get_data_source()
    paths = _text_map_paths(selected_source, language)
    if not paths:
        raise DataSourceError(
            f'No TextMap files found for {language.upper()} in '
            f'{selected_source.text_map_dir}'
        )

    result: dict[str, str] = {}
    origins: dict[str, Path] = {}
    for path in paths:
        with path.open('r', encoding='utf-8') as file:
            part = json.load(file)
        if not isinstance(part, dict):
            raise SourceSchemaError(f'TextMap must be an object: {path}')
        for key, value in part.items():
            key = str(key)
            if key in result and result[key] != value:
                raise SourceSchemaError(
                    f'Conflicting TextMap value for hash {key}: '
                    f'{origins[key].name} != {path.name}'
                )
            result[key] = value
            origins[key] = path
    return result


def required_alias(
    row: Mapping[str, Any],
    canonical: str,
    *aliases: str,
    context: str = 'source row',
) -> Any:
    """Read a required field through known aliases and reject ambiguity."""

    keys = (canonical,) + aliases
    present = [(key, row[key]) for key in keys if key in row]
    if not present:
        raise SourceSchemaError(
            f'{context} is missing required field {canonical!r}; '
            f'accepted keys: {", ".join(keys)}'
        )

    value = present[0][1]
    for key, candidate in present[1:]:
        if candidate != value:
            raise SourceSchemaError(
                f'{context} has conflicting aliases for {canonical!r}: '
                f'{present[0][0]}={value!r}, {key}={candidate!r}'
            )
    return value


def normalize_alias(
    row: MutableMapping[str, Any],
    canonical: str,
    *aliases: str,
    context: str = 'source row',
) -> Any:
    value = required_alias(row, canonical, *aliases, context=context)
    row[canonical] = value
    return value
