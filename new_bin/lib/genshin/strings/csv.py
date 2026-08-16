import csv
import os

OUT_PATH = '../../../../data/strings/generated/'


class CsvDumper:
    def get_path(self, file):
        dirname = os.path.dirname(__file__)
        return os.path.normpath(os.path.join(dirname, OUT_PATH, file))

    def get_lineterminator(self, file_path):
        if not os.path.exists(file_path):
            return '\r\n'
        with open(file_path, 'rb') as file:
            data = file.read()
        index = data.find(b'\n')
        if index > 0 and data[index - 1:index] == b'\r':
            return '\r\n'
        if index >= 0:
            return '\n'
        return '\r\n'

    def open_file(self, file_path):
        return open(file_path, 'w', encoding='utf-8', newline='')

    def get_dumper(self, f, fieldnames, lineterminator):
        return csv.DictWriter(
            f,
            fieldnames=fieldnames,
            escapechar='~',
            quotechar='"',
            delimiter=';',
            lineterminator=lineterminator,
        )

    def dump(self, data, filename):
        file_path = self.get_path(filename)
        lineterminator = self.get_lineterminator(file_path)
        with self.open_file(file_path) as file:
            dumper = self.get_dumper(file, data[0].keys(), lineterminator)
            dumper.writeheader()
            dumper.writerows(data)
