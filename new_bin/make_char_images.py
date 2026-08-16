import os
import io
import requests
from PIL import Image

from lib.genshin.datafiles.char import CharData, SKIP_CHARACTERS
from lib.genshin.datafiles.lang import LangData
from lib.genshin.utils import convert_id
from lib.genshin.sprite import ImageGenerator

dirname = os.path.dirname(__file__)
img_path = os.path.join(dirname, '../data/images/')

char_data = CharData()
lang = LangData('EN')
items = [
    'char-icon-unknown',
    'char-icon-empty',
]
images = [
    f'{img_path}chars/UI_Icon_Unknown.png',
    f'{img_path}chars/UI_Icon_Reset.png',
]


def ensure_char_image(image_path, image_name, char_id):
    if os.path.isfile(image_path):
        return image_path

    sources = [
        (
            'Lunaris',
            f'https://api.lunaris.moe/data/assets/avataricon/{image_name}.png',
        ),
        ('Yatta', f'https://gi.yatta.moe/assets/UI/{image_name}.png'),
        ('Honey Hunter', f'https://gensh.honeyhunterworld.com/img/i_n{char_id}_100.webp'),
    ]
    for source_name, image_url in sources:
        print(f'Downloading {image_name} from {source_name}...')
        try:
            response = requests.get(image_url, timeout=30)
            if response.status_code != 200:
                raise ValueError(f'HTTP {response.status_code}')

            image = Image.open(io.BytesIO(response.content))
            image.load()
            if image.size == (64, 64):
                raise ValueError('received the mirror unknown-icon placeholder')
            image = image.convert('RGBA')
            if image.width != image.height:
                size = max(image.size)
                squared = Image.new('RGBA', (size, size), (255, 255, 255, 0))
                squared.paste(
                    image,
                    ((size - image.width) // 2, (size - image.height) // 2),
                    image,
                )
                image = squared
            image.save(image_path, 'PNG')
            return image_path
        except Exception as error:
            print(f'  Warning: {source_name} failed for {image_name}: {error}')

    print(f'  Warning: using unknown icon placeholder for {image_name}')
    return f'{img_path}chars/UI_Icon_Unknown.png'

for char in char_data.get_list():
    if char['id'] in SKIP_CHARACTERS:
        continue
    char_name = lang.get(char['nameTextMapHash'])
    if char['id'] == 10000005:
        char_name += '_boy'
    elif char['id'] == 10000007:
        char_name += '_girl'
    char_id = convert_id(char_name).replace('_', '-')
    char_icon_name = char['iconName']
    char_icon_path = f'{img_path}chars/{char_icon_name}.png'

    items.append(f'char-icon-{char_id}')
    images.append(ensure_char_image(char_icon_path, char_icon_name, char['id']))

# items.extend([
#     'char-icon-ineffa',
# ])

# images.extend([
#     f'{img_path}chars/UI_AvatarIcon_Ineffa.png',
# ])

image_gen = ImageGenerator(
    items=items,
    images=images,
    pack_name='chars',
)

rules = [
    {'size': 24, 'class': 'sprite-char.sprite-24'},
    {'size': 40, 'class': 'sprite-char.sprite-40'},
    {'size': 60, 'class': 'sprite-char.sprite-60'},
]

image_gen.generate_individual((80, 80))

for rule in rules:
    image_gen.generate_sprite(
        prefix='char_',
        sprite_class=rule['class'],
        size=(rule['size'], rule['size']),
    )

image_gen.save()
