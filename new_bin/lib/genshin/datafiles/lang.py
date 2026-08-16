from .base import DictParser
from ..config import DATA_SOURCE, load_text_map


class LangData(DictParser):
    path = 'TextMap'

    def __init__(self, lang: str = 'EN'):
        self.lang = lang.upper()
        super().__init__()

    @property
    def filename(self):
        return f'TextMap{self.lang}.json'

    def parse(self):
        self.data = load_text_map(self.lang, source=DATA_SOURCE)
