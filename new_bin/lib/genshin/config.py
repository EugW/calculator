import importlib.util
from pathlib import Path
import sys


_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_SOURCE_CONFIG_PATH = _PROJECT_ROOT / 'bin' / 'import' / 'source_config.py'
_MODULE_NAME = '_genshin_calc_source_config'

if _MODULE_NAME in sys.modules:
    _source_config = sys.modules[_MODULE_NAME]
else:
    _spec = importlib.util.spec_from_file_location(_MODULE_NAME, _SOURCE_CONFIG_PATH)
    if _spec is None or _spec.loader is None:
        raise ImportError(f'Cannot load shared source config from {_SOURCE_CONFIG_PATH}')
    _source_config = importlib.util.module_from_spec(_spec)
    sys.modules[_MODULE_NAME] = _source_config
    _spec.loader.exec_module(_source_config)

DATA_SOURCE = _source_config.get_data_source()
DATA_FILES_PATH = str(DATA_SOURCE.root)
load_text_map = _source_config.load_text_map
normalize_alias = _source_config.normalize_alias
