import json
import os
from source_config import get_excel_dir, load_text_map

dirname  = os.path.dirname(__file__)
data_dir = str(get_excel_dir()) + os.sep

# Known weapon names from weapon_stat_scales.py
weapon_names = {
    11301: 'CoolSteel',
    11302: 'HarbingerofDawn',
    11303: 'TravelersHandySword',
    11304: 'DarkIronSword',
    11305: 'FilletBlade',
    11306: 'SkyriderSword',
    11401: 'FavoniusSword',
    11402: 'Flute',
    11403: 'SacrificialSword',
    11404: 'RoyalLongsword',
    11405: 'LionsRoar',
    11406: 'PrototypeRancour',
    11407: 'IronSting',
    11408: 'BlackcliffLongsword',
    11409: 'BlackSword',
    11410: 'AlleyFlash',
    11412: "SwordofDescension",
    11413: "FesteringDesire",
    11414: "AmenomaKageuchi",
    11415: "CinnabarSpindle",
    11416: "KagotsurubeIsshin",
    11417: "SapwoodBlade",
    11418: "XiphosMoonlight",
    11422: 'ToukabouShigure',
    11424: 'WolfFang',
    11425: 'FinaleOfTheDeep',
    11426: 'FleuveCendreFerryman',
    11427: 'TheDockhandsAssistant',
    11428: 'SwordOfNarzissenkreuz',
    11430: 'SturdyBone',
    11431: 'FlamebreathFlute',
    11432: 'CalamityOfEshu',
    11435: 'HereticsMoltenBlade',
    11436: 'Emberwell',
    11437: 'SpikedStake',
    11438: 'Fajian',
    11501: "AquilaFavonia",
    11502: "SkywardBlade",
    11503: "FreedomSworn",
    11504: "SummitShaper",
    11505: "PrimordialJadeCutter",
    11510: 'HaranGeppakuFutsu',
    11511: "KeyofKhajNisut",
    11512: "LightofFoliarIncision",
    11513: "SplendorOfStillWaters",
    11514: "UrakuMisugiri",
    11515: "Absolution",
    11516: "PeakPatrolSong",
    11517: "Azurelight",
    11520: "WhitelakeFrostfeather",
    11521: "ExaiphanesBlade",
    11522: "Samosvist",
    11509: "MistsplitterReforged",
    12301: "FerrousShadow",
    12302: "BloodtaintedGreatsword",
    12303: "WhiteIronGreatsword",
    12305: "DebateClub",
    12306: "SkyriderGreatsword",
    12401: "FavoniusGreatsword",
    12402: "Bell",
    12403: "SacrificialGreatsword",
    12404: "RoyalGreatsword",
    12405: "Rainslasher",
    12406: "PrototypeArchaic",
    12407: "Whiteblind",
    12408: "BlackcliffSlasher",
    12409: "SerpentSpine",
    12410: "LithicBlade",
    12411: "SnowTombedStarsilver",
    12412: "LuxuriousSeaLord",
    12414: "KatsuragikiriNagamasa",
    12415: "MakhairaAquamarine",
    12416: "Akuoumaru",
    12417: "ForestRegalia",
    12418: 'MailedFlower',
    12424: 'TalkingStick',
    12425: 'TidalShadow',
    12426: 'MegaMagicSword',
    12427: 'PortablePowerSaw',
    12430: 'FruitfulHook',
    12431: 'Earthshaker',
    12432: 'FlameForgedInsight',
    12435: 'ForgedByTheGoldenMelody',
    12436: 'BladeOfAtonement',
    12501: "SkywardPride",
    12502: "WolfsGravestone",
    12503: "SongofBrokenPines",
    12504: "Unforged",
    12510: "RedhornStonethresher",
    12511: 'BeaconOfTheReedSea',
    12512: 'Verdict',
    12513: 'MountainKingsFang',
    12514: 'AThousandBlazingSuns',
    12515: 'GestOfTheMightyWolf',
    12516: 'ATeaspoonOfTranscendence',
    13301: "WhiteTassel",
    13302: "Halberd",
    13303: "BlackTassel",
    13401: "DragonsBane",
    13402: "PrototypeStarglitter",
    13403: "CrescentPike",
    13404: "BlackcliffPole",
    13405: "Deathmatch",
    13406: "LithicSpear",
    13407: "FavoniusLance",
    13408: "RoyalSpear",
    13409: "DragonspineSpear",
    13414: "KitainCrossSpear",
    13415: "Catch",
    13416: "WavebreakersFin",
    13417: "Moonpiercer",
    13419: "MissiveWindspear",
    13424: "BalladOfTheFjords",
    13425: "RightfulReward",
    13426: "DialoguesOfTheDesertSages",
    13427: 'ProspectorsDrill',
    13430: 'MountainBracingBolt',
    13431: 'RainbowsTrail',
    13432: 'BriefPavilionChatter',
    13435: 'Frostbreath',
    13436: 'SongOfTheVigil',
    13501: "StaffofHoma",
    13502: "SkywardSpine",
    13504: "VortexVanquisher",
    13505: "PrimordialJadeWingedSpear",
    13507: "CalamityQueller",
    13509: "GrasscuttersLight",
    13511: "StaffOfScarletSands",
    13512: "CrimsonMoonsSemblance",
    13513: 'LumidouceElegy',
    13514: 'SymphonistofScents',
    13515: 'FracturedHalo',
    14301: "MagicGuide",
    14302: "ThrillingTalesofDragonSlayers",
    14303: "OtherworldlyStory",
    14304: "EmeraldOrb",
    14305: "TwinNephrite",
    14401: "FavoniusCodex",
    14402: "Widsith",
    14403: "SacrificialFragments",
    14404: "RoyalGrimoire",
    14405: "SolarPearl",
    14406: "PrototypeAmber",
    14407: "MappaMare",
    14408: "BlackcliffAgate",
    14409: "EyeofPerception",
    14410: "WineandSong",
    14412: "Frostbearer",
    14413: "DodocoTales",
    14414: "HakushinRing",
    14415: "OathswornEye",
    14416: "WanderingEvenstar",
    14417: "FruitOfFulfillment",
    14424: "SacrificialJade",
    14425: "FlowingPurity",
    14426: 'BalladoftheBoundlessBlue',
    14427: 'AshGravenDrinkingHorn',
    14430: 'WaveridingWhirl',
    14431: 'RingOfCeiba',
    14435: 'ClashOfKings',
    14436: 'EchoesOfTheHeart',
    14437: 'FrostScepter',
    14501: "SkywardAtlas",
    14502: "LostPrayer",
    14504: "MemoryofDust",
    14505: "JadefallsSplendor",
    14506: "EverlastingMoonglow",
    14509: "KagurasVerity",
    14511: "ThousandFloatingDreams",
    14512: "TulaytullahsRemembrance",
    14513: 'CashflowSupervision',
    14514: 'TomeoftheEternalFlow',
    14515: 'CranesEchoingCall',
    14516: 'SurfingTime',
    14517: 'StarcallersWatch',
    14518: 'MorningHibernation',
    14519: 'VividNotions',
    14524: 'Bludnye',
    15301: "RavenBow",
    15302: "SharpshootersOath",
    15303: "RecurveBow",
    15304: "Slingshot",
    15305: "Messenger",
    15401: "FavoniusWarbow",
    15402: "Stringless",
    15403: "SacrificialBow",
    15404: "RoyalBow",
    15405: "Rust",
    15406: "PrototypeCrescent",
    15407: "CompoundBow",
    15408: "BlackcliffWarbow",
    15409: "ViridescentHunt",
    15410: "AlleyHunter",
    15411: "FadingTwilight",
    15412: "MitternachtsWaltz",
    15413: "WindblumeOde",
    15414: "Hamayumi",
    15415: "Predator",
    15416: "MouunsMoon",
    15417: "KingsSquire",
    15418: "EndOfTheLine",
    15419: "IbisPiercer",
    15424: "ScionOfTheBlazingSun",
    15425: "SongOfStillness",
    15426: "Cloudforged",
    15427: 'RangeGauge',
    15430: 'FlowerWreathedFeathers',
    15431: 'ShatteredChains',
    15432: 'SequenceofSolitude',
    15435: 'JadeVista',
    15436: 'CovenantOfFrostAndSnow',
    15437: 'Windtalker',
    15501: "SkywardHarp",
    15502: "AmosBow",
    15503: "ElegyfortheEnd",
    15507: "PolarStar",
    15508: "AquaSimulacra",
    15509: "ThunderingPulse",
    15511: "HuntersPath",
    15512: "TheFirstGreatMagic",
    15513: "SilvershowerHeartstrings",
    15514: "AstralVulturesCrimsonPlumage",
}

weapon_types = {
    'WEAPON_SWORD_ONE_HAND': 'Sword',
    'WEAPON_CLAYMORE': 'Claymore',
    'WEAPON_POLE': 'Polearm',
    'WEAPON_CATALYST': 'Catalyst',
    'WEAPON_BOW': 'Bow',
}

def parse_lang():
    return load_text_map('EN')

def find_missing_weapons():
    file = open(data_dir + 'WeaponExcelConfigData.json', 'r', encoding='utf-8')
    lang = parse_lang()

    missing = []

    for item in json.load(file):
        rarity = int(item['rankLevel'])
        if rarity < 3:
            continue

        weapon_id = item['id']
        if weapon_id in weapon_names:
            continue

        name = lang.get(str(item['nameTextMapHash']), 'Unknown')
        weapon_type = weapon_types.get(item.get('weaponType', ''), 'Unknown')

        # Skip weapons with placeholder/test names
        if not name or name == 'Unknown' or name.startswith('(Test)'):
            continue

        missing.append({
            'id': weapon_id,
            'name': name,
            'type': weapon_type,
            'rarity': rarity,
        })

    # Sort by type, then rarity, then id
    missing.sort(key=lambda x: (x['type'], -x['rarity'], x['id']))

    print(f"Found {len(missing)} missing weapons:\n")

    current_type = None
    for weapon in missing:
        if weapon['type'] != current_type:
            current_type = weapon['type']
            print(f"\n=== {current_type} ===")

        # Generate PascalCase name for code
        code_name = ''.join(word.capitalize() for word in weapon['name'].replace("'", '').replace('-', ' ').replace(':', '').split())
        print(f"    {weapon['id']}: \"{code_name}\",  # {weapon['name']} ({weapon['rarity']}*)")

if __name__ == '__main__':
    find_missing_weapons()
