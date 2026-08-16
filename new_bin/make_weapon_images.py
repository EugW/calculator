import os
import io
import requests
from PIL import Image

from lib.genshin.datafiles.weapons import IGNORED_WEAPONS, WeaponData
from lib.genshin.datafiles.lang import LangData
from lib.genshin.utils import convert_id
from lib.genshin.sprite import ImageGenerator

dirname = os.path.dirname(__file__)
img_path = os.path.join(dirname, '../data/images/')

# Create weapons directory if it doesn't exist
os.makedirs(f'{img_path}weapons', exist_ok=True)
unknown_image_path = f'{img_path}chars/UI_Icon_Unknown.png'

weapon_data = WeaponData()
lang = LangData('EN')
weapons = {}
images = {}

weapon_types = {
    'WEAPON_SWORD_ONE_HAND': 'sword',
    'WEAPON_CLAYMORE': 'claymore',
    'WEAPON_POLE': 'polearm',
    'WEAPON_CATALYST': 'catalyst',
    'WEAPON_BOW': 'bow',
}

# These source rows expose only generic weapon-type labels. Keep their CSS
# identifiers aligned with the calculator object names.
WEAPON_ID_OVERRIDES = {
    11437: 'spiked-stake',
    11438: 'fajian',
    11522: 'samosvist',
    14437: 'frost-scepter',
    14524: 'bludnye',
    15437: 'windtalker',
}

weapons = {
    'sword': ['weapon-icon-sword-unknown'],
    'claymore': ['weapon-icon-claymore-unknown'],
    'polearm': ['weapon-icon-polearm-unknown'],
    'catalyst': ['weapon-icon-catalyst-unknown'],
    'bow': ['weapon-icon-bow-unknown'],
}
images = {
    'sword': [unknown_image_path],
    'claymore': [unknown_image_path],
    'polearm': [unknown_image_path],
    'catalyst': [unknown_image_path],
    'bow': [unknown_image_path],
}


def download_image(image_path, image_name, sources):
    for source_name, image_url in sources:
        print(f'Downloading {image_name} from {source_name}...')
        try:
            response = requests.get(image_url, timeout=30)
            if response.status_code != 200:
                print(f'  Warning: {source_name} returned HTTP {response.status_code}')
                continue

            image_data = response.content
            try:
                image = Image.open(io.BytesIO(image_data))
                image.load()
            except Exception as e:
                print(f'  Warning: {source_name} returned invalid image data ({len(image_data)} bytes): {e}')
                continue

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
            return True
        except Exception as e:
            print(f'  Error downloading {image_name} from {source_name}: {e}')

    return False


def weapon_image_sources(weapon_icon, weapon_id=None):
    sources = [
        ('Yatta', f'https://gi.yatta.moe/assets/UI/{weapon_icon}.png'),
    ]
    if weapon_id:
        sources.append(
            ('Honey Hunter', f'https://gensh.honeyhunterworld.com/img/i_n{weapon_id}_100.webp')
        )
    return sources


def ensure_weapon_image(image_path, image_name, sources):
    if os.path.isfile(image_path):
        return image_path

    if download_image(image_path, image_name, sources):
        return image_path

    print(f'  Warning: using unknown icon placeholder for {image_name}')
    return unknown_image_path


for weapon in weapon_data.get_list():
    if weapon['id'] in IGNORED_WEAPONS:
        continue

    rank = weapon.get('rankLevel', 0)
    if rank < 3:
        continue

    weapon_id = WEAPON_ID_OVERRIDES.get(weapon['id'])
    if weapon_id is None:
        weapon_id = convert_id(lang.get(weapon['nameTextMapHash'])).replace('_', '-')
    wtype = weapon_types.get(weapon['weaponType'])
    if wtype not in weapons:
        weapons[wtype] = []
        images[wtype] = []

    weapon_icon = weapon['icon']
    weapon_icon_path = f"{img_path}weapons/{weapon_icon}.png"

    weapon_icon_path = ensure_weapon_image(
        weapon_icon_path,
        weapon_icon,
        weapon_image_sources(weapon_icon, weapon['id']),
    )

    weapons[wtype].append(f'weapon-icon-{wtype}-{weapon_id}')
    images[wtype].append(weapon_icon_path)


# Manually added weapons with special icon names
manual_weapons = [
    ('polearm', 'weapon-icon-polearm-fractured-halo', 'UI_EquipIcon_Pole_Perdix', 13515),
    ('claymore', 'weapon-icon-claymore-flame-forged-insight', 'UI_EquipIcon_Claymore_Polilith', 12432),
]

for wtype, weapon_class, icon_name, weapon_id in manual_weapons:
    if weapon_class in weapons[wtype]:
        continue

    icon_path = f'{img_path}weapons/{icon_name}.png'
    icon_path = ensure_weapon_image(
        icon_path,
        icon_name,
        weapon_image_sources(icon_name, weapon_id),
    )
    weapons[wtype].append(weapon_class)
    images[wtype].append(icon_path)

for wtype in weapons:
    image_gen = ImageGenerator(
        items=weapons[wtype],
        images=images[wtype],
        pack_name=f'weapons/{wtype}',
    )

    rules = [
        {'size': 24, 'class': f'sprite-weapon-{wtype}.sprite-24'},
        {'size': 40, 'class': f'sprite-weapon-{wtype}.sprite-40'},
        {'size': 60, 'class': f'sprite-weapon-{wtype}.sprite-60'},
    ]

    image_gen.generate_individual((80, 80))

    for rule in rules:
        image_gen.generate_sprite(
            prefix=f'weapon_{wtype}_',
            sprite_class=rule['class'],
            size=(rule['size'], rule['size']),
        )

    image_gen.save()
