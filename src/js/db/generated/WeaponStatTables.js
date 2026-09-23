// This file is auto generated
import { StatTable } from "../../classes/StatTable";
import { StatTableAscensionScale } from "../../classes/StatTable/Ascension/Scale";
import { weaponStatScales } from "./WeaponScale";

const enumAscensionTables = {
	n1: new StatTable('', [19.5, 38.9, 58.4, 77.8, 97.3, 116.7]),
	n2: new StatTable('', [25.9, 51.9, 77.8, 103.7, 129.7, 155.6]),
	n3: new StatTable('', [31.1, 62.2, 93.4, 124.5, 155.6, 186.7]),
	n4: new StatTable('', [11.7, 23.3, 35, 46.7, 0, 0]),
};

const enumStatTables = {
	n1: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 38.7413,
		ascension: enumAscensionTables.n1,
		scale: weaponStatScales.atk_1_1,
	}),
	n2: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 7.66,
		scale: weaponStatScales.crt_1_1,
	}),
	n3: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 10.2,
		scale: weaponStatScales.crt_1_1,
	}),
	n4: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 39.8751,
		ascension: enumAscensionTables.n1,
		scale: weaponStatScales.atk_1_2,
	}),
	n5: new StatTableAscensionScale({
		stat: 'def_percent',
		base: 6.3733,
		scale: weaponStatScales.crt_1_1,
	}),
	n6: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 30.6,
		scale: weaponStatScales.crt_1_1,
	}),
	n7: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 37.6075,
		ascension: enumAscensionTables.n1,
		scale: weaponStatScales.atk_1_4,
	}),
	n8: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 11.3333,
		scale: weaponStatScales.crt_1_1,
	}),
	n9: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 41.0671,
		ascension: enumAscensionTables.n2,
		scale: weaponStatScales.atk_2_4,
	}),
	n10: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 13.3333,
		scale: weaponStatScales.crt_2_1,
	}),
	n11: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 42.401,
		ascension: enumAscensionTables.n2,
		scale: weaponStatScales.atk_2_1,
	}),
	n12: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 9,
		scale: weaponStatScales.crt_2_1,
	}),
	n13: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 43.7349,
		ascension: enumAscensionTables.n2,
		scale: weaponStatScales.atk_2_2,
	}),
	n14: new StatTableAscensionScale({
		stat: 'dmg_phys_base',
		base: 7.5067,
		scale: weaponStatScales.crt_2_1,
	}),
	n15: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 36,
		scale: weaponStatScales.crt_2_1,
	}),
	n16: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 8,
		scale: weaponStatScales.crt_2_1,
	}),
	n17: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 6,
		scale: weaponStatScales.crt_2_1,
	}),
	n18: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 45.0687,
		ascension: enumAscensionTables.n2,
		scale: weaponStatScales.atk_2_3,
	}),
	n19: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 12,
		scale: weaponStatScales.crt_2_1,
	}),
	n20: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 38.7413,
		ascension: enumAscensionTables.n2,
		scale: weaponStatScales.atk_1_1,
	}),
	n21: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 10,
		scale: weaponStatScales.crt_2_1,
	}),
	n22: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 12,
		scale: weaponStatScales.crt_2_1,
	}),
	n23: new StatTableAscensionScale({
		stat: 'def_percent',
		base: 15.0133,
		scale: weaponStatScales.crt_2_1,
	}),
	n24: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 6.6667,
		scale: weaponStatScales.crt_2_1,
	}),
	n25: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 6,
		scale: weaponStatScales.crt_2_1,
	}),
	n26: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 9,
		scale: weaponStatScales.crt_2_1,
	}),
	n27: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 12,
		scale: weaponStatScales.crt_2_1,
	}),
	n28: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 47.537,
		ascension: enumAscensionTables.n3,
		scale: weaponStatScales.atk_3_2,
	}),
	n29: new StatTableAscensionScale({
		stat: 'dmg_phys_base',
		base: 9,
		scale: weaponStatScales.crt_3_1,
	}),
	n30: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 45.9364,
		ascension: enumAscensionTables.n3,
		scale: weaponStatScales.atk_3_1,
	}),
	n31: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 12,
		scale: weaponStatScales.crt_3_1,
	}),
	n32: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 43.2,
		scale: weaponStatScales.crt_3_1,
	}),
	n33: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 10.8,
		scale: weaponStatScales.crt_3_1,
	}),
	n34: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 44.3358,
		ascension: enumAscensionTables.n3,
		scale: weaponStatScales.atk_3_4,
	}),
	n35: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 9.6,
		scale: weaponStatScales.crt_3_1,
	}),
	n36: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 9.6,
		scale: weaponStatScales.crt_3_1,
	}),
	n37: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 7.2,
		scale: weaponStatScales.crt_3_1,
	}),
	n38: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 14.4,
		scale: weaponStatScales.crt_3_1,
	}),
	n39: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 19.2,
		scale: weaponStatScales.crt_3_1,
	}),
	n40: new StatTableAscensionScale({
		stat: 'def_percent',
		base: 18,
		scale: weaponStatScales.crt_3_1,
	}),
	n41: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 4.8,
		scale: weaponStatScales.crt_3_1,
	}),
	n42: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 7.66,
		scale: weaponStatScales.crt_1_1,
	}),
	n43: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 40.8,
		scale: weaponStatScales.crt_1_1,
	}),
	n44: new StatTableAscensionScale({
		stat: 'def_percent',
		base: 9.56,
		scale: weaponStatScales.crt_1_1,
	}),
	n45: new StatTableAscensionScale({
		stat: 'dmg_phys_base',
		base: 9.56,
		scale: weaponStatScales.crt_1_1,
	}),
	n46: new StatTableAscensionScale({
		stat: 'def_percent',
		base: 11.26,
		scale: weaponStatScales.crt_2_1,
	}),
	n47: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 24,
		scale: weaponStatScales.crt_2_1,
	}),
	n48: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 4,
		scale: weaponStatScales.crt_2_1,
	}),
	n49: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 12,
		scale: weaponStatScales.crt_2_1,
	}),
	n50: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 8,
		scale: weaponStatScales.crt_3_1,
	}),
	n51: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 49.1377,
		ascension: enumAscensionTables.n3,
		scale: weaponStatScales.atk_3_3,
	}),
	n52: new StatTableAscensionScale({
		stat: 'dmg_phys_base',
		base: 4.5,
		scale: weaponStatScales.crt_3_1,
	}),
	n53: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 2.4,
		scale: weaponStatScales.crt_3_1,
	}),
	n54: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 5.1,
		scale: weaponStatScales.crt_1_1,
	}),
	n55: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 5.1067,
		scale: weaponStatScales.crt_1_1,
	}),
	n56: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 10.2133,
		scale: weaponStatScales.crt_1_1,
	}),
	n57: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 48,
		scale: weaponStatScales.crt_2_1,
	}),
	n58: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 8,
		scale: weaponStatScales.crt_2_1,
	}),
	n59: new StatTableAscensionScale({
		stat: 'dmg_phys_base',
		base: 15.0133,
		scale: weaponStatScales.crt_2_1,
	}),
	n60: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 3,
		scale: weaponStatScales.crt_2_1,
	}),
	n61: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 6,
		scale: weaponStatScales.crt_2_1,
	}),
	n62: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 2,
		scale: weaponStatScales.crt_2_1,
	}),
	n63: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 14.4,
		scale: weaponStatScales.crt_3_1,
	}),
	n64: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 3.6,
		scale: weaponStatScales.crt_3_1,
	}),
	n65: new StatTableAscensionScale({
		stat: 'recharge_base',
		base: 8.5,
		scale: weaponStatScales.crt_1_1,
	}),
	n66: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 20.4,
		scale: weaponStatScales.crt_1_1,
	}),
	n67: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 3.4,
		scale: weaponStatScales.crt_1_1,
	}),
	n68: new StatTableAscensionScale({
		stat: 'atk_percent',
		base: 7.2,
		scale: weaponStatScales.crt_3_1,
	}),
	n69: new StatTableAscensionScale({
		stat: 'hp_percent',
		base: 10.8,
		scale: weaponStatScales.crt_3_1,
	}),
	n70: new StatTableAscensionScale({
		stat: 'mastery_base',
		base: 57.6,
		scale: weaponStatScales.crt_3_1,
	}),
	n71: new StatTableAscensionScale({
		stat: 'crit_rate_base',
		base: 6.8,
		scale: weaponStatScales.crt_1_1,
	}),
	n72: new StatTableAscensionScale({
		stat: 'crit_dmg_base',
		base: 6.8,
		scale: weaponStatScales.crt_1_1,
	}),
	n73: new StatTableAscensionScale({
		stat: 'dmg_phys_base',
		base: 11.26,
		scale: weaponStatScales.crt_2_1,
	}),
	n74: new StatTableAscensionScale({
		stat: 'atk_base',
		base: 23.245,
		ascension: enumAscensionTables.n4,
		scale: weaponStatScales.atk_1_1,
	}),
};

export const weaponStatTables = {
	CoolSteel: [
		enumStatTables.n1,
		enumStatTables.n2,
	],
	HarbingerofDawn: [
		enumStatTables.n1,
		enumStatTables.n3,
	],
	TravelersHandySword: [
		enumStatTables.n4,
		enumStatTables.n5,
	],
	DarkIronSword: [
		enumStatTables.n1,
		enumStatTables.n6,
	],
	FilletBlade: [
		enumStatTables.n1,
		enumStatTables.n2,
	],
	SkyriderSword: [
		enumStatTables.n7,
		enumStatTables.n8,
	],
	FavoniusSword: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	Flute: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	SacrificialSword: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	RoyalLongsword: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	LionsRoar: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	PrototypeRancour: [
		enumStatTables.n13,
		enumStatTables.n14,
	],
	IronSting: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	BlackcliffLongsword: [
		enumStatTables.n13,
		enumStatTables.n16,
	],
	BlackSword: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	AlleyFlash: [
		enumStatTables.n18,
		enumStatTables.n19,
	],
	SwordofDescension: [
		enumStatTables.n20,
		enumStatTables.n2,
	],
	FesteringDesire: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	AmenomaKageuchi: [
		enumStatTables.n9,
		enumStatTables.n22,
	],
	CinnabarSpindle: [
		enumStatTables.n9,
		enumStatTables.n23,
	],
	KagotsurubeIsshin: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	SapwoodBlade: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	XiphosMoonlight: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	ToukabouShigure: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	WolfFang: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	FinaleOfTheDeep: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	FleuveCendreFerryman: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	TheDockhandsAssistant: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	SwordOfNarzissenkreuz: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	SturdyBone: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	FlamebreathFlute: [
		enumStatTables.n9,
		enumStatTables.n23,
	],
	CalamityOfEshu: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	SerenitysCall: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	MoonweaversDawn: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	HereticsMoltenBlade: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	Emberwell: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	NewBough: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	SilverLight: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	AquilaFavonia: [
		enumStatTables.n28,
		enumStatTables.n29,
	],
	SkywardBlade: [
		enumStatTables.n30,
		enumStatTables.n31,
	],
	FreedomSworn: [
		enumStatTables.n30,
		enumStatTables.n32,
	],
	SummitShaper: [
		enumStatTables.n30,
		enumStatTables.n33,
	],
	PrimordialJadeCutter: [
		enumStatTables.n34,
		enumStatTables.n35,
	],
	MistsplitterReforged: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	HaranGeppakuFutsu: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	KeyofKhajNisut: [
		enumStatTables.n34,
		enumStatTables.n38,
	],
	LightofFoliarIncision: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	SplendorOfStillWaters: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	UrakuMisugiri: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	Absolution: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	PeakPatrolSong: [
		enumStatTables.n34,
		enumStatTables.n40,
	],
	Azurelight: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	AthameArtis: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	LightbearingMoonshard: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	WhitelakeFrostfeather: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	ExaiphanesBlade: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	BeyondTheChrysalis: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	FerrousShadow: [
		enumStatTables.n1,
		enumStatTables.n42,
	],
	BloodtaintedGreatsword: [
		enumStatTables.n7,
		enumStatTables.n43,
	],
	WhiteIronGreatsword: [
		enumStatTables.n1,
		enumStatTables.n44,
	],
	DebateClub: [
		enumStatTables.n1,
		enumStatTables.n2,
	],
	SkyriderGreatsword: [
		enumStatTables.n1,
		enumStatTables.n45,
	],
	FavoniusGreatsword: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	Bell: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	SacrificialGreatsword: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	RoyalGreatsword: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	Rainslasher: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	PrototypeArchaic: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	Whiteblind: [
		enumStatTables.n11,
		enumStatTables.n46,
	],
	BlackcliffSlasher: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	SerpentSpine: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	LithicBlade: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	SnowTombedStarsilver: [
		enumStatTables.n13,
		enumStatTables.n14,
	],
	LuxuriousSeaLord: [
		enumStatTables.n9,
		enumStatTables.n22,
	],
	KatsuragikiriNagamasa: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	MakhairaAquamarine: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	Akuoumaru: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	ForestRegalia: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	MailedFlower: [
		enumStatTables.n13,
		enumStatTables.n47,
	],
	TalkingStick: [
		enumStatTables.n13,
		enumStatTables.n48,
	],
	TidalShadow: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	MegaMagicSword: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	PortablePowerSaw: [
		enumStatTables.n9,
		enumStatTables.n49,
	],
	FruitfulHook: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	Earthshaker: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	FlameForgedInsight: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	MasterKey: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	ForgedByTheGoldenMelody: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	BladeOfAtonement: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	SkywardPride: [
		enumStatTables.n28,
		enumStatTables.n50,
	],
	WolfsGravestone: [
		enumStatTables.n30,
		enumStatTables.n33,
	],
	SongofBrokenPines: [
		enumStatTables.n51,
		enumStatTables.n52,
	],
	Unforged: [
		enumStatTables.n30,
		enumStatTables.n33,
	],
	RedhornStonethresher: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	BeaconOfTheReedSea: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	Verdict: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	MountainKingsFang: [
		enumStatTables.n51,
		enumStatTables.n53,
	],
	AThousandBlazingSuns: [
		enumStatTables.n51,
		enumStatTables.n53,
	],
	GestOfTheMightyWolf: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	ATeaspoonOfTranscendence: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	WhiteTassel: [
		enumStatTables.n1,
		enumStatTables.n54,
	],
	Halberd: [
		enumStatTables.n4,
		enumStatTables.n55,
	],
	BlackTassel: [
		enumStatTables.n7,
		enumStatTables.n56,
	],
	DragonsBane: [
		enumStatTables.n9,
		enumStatTables.n57,
	],
	PrototypeStarglitter: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	CrescentPike: [
		enumStatTables.n13,
		enumStatTables.n14,
	],
	BlackcliffPole: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	Deathmatch: [
		enumStatTables.n9,
		enumStatTables.n58,
	],
	LithicSpear: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	FavoniusLance: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	RoyalSpear: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	DragonspineSpear: [
		enumStatTables.n9,
		enumStatTables.n59,
	],
	KitainCrossSpear: [
		enumStatTables.n13,
		enumStatTables.n47,
	],
	Catch: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	WavebreakersFin: [
		enumStatTables.n18,
		enumStatTables.n60,
	],
	Moonpiercer: [
		enumStatTables.n13,
		enumStatTables.n47,
	],
	MissiveWindspear: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	BalladOfTheFjords: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	RightfulReward: [
		enumStatTables.n13,
		enumStatTables.n61,
	],
	DialoguesOfTheDesertSages: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	ProspectorsDrill: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	MountainBracingBolt: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	RainbowsTrail: [
		enumStatTables.n11,
		enumStatTables.n46,
	],
	BriefPavilionChatter: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	ProspectorsShovel: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	SacrificersStaff: [
		enumStatTables.n18,
		enumStatTables.n62,
	],
	Frostbreath: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	SongOfTheVigil: [
		enumStatTables.n13,
		enumStatTables.n47,
	],
	StaffofHoma: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	SkywardSpine: [
		enumStatTables.n28,
		enumStatTables.n50,
	],
	VortexVanquisher: [
		enumStatTables.n30,
		enumStatTables.n33,
	],
	PrimordialJadeWingedSpear: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	CalamityQueller: [
		enumStatTables.n51,
		enumStatTables.n64,
	],
	GrasscuttersLight: [
		enumStatTables.n30,
		enumStatTables.n31,
	],
	StaffOfScarletSands: [
		enumStatTables.n34,
		enumStatTables.n35,
	],
	CrimsonMoonsSemblance: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	LumidouceElegy: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	SymphonistofScents: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	FracturedHalo: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	BloodsoakedRuins: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	DisasterAndRemorse: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	MagicGuide: [
		enumStatTables.n7,
		enumStatTables.n43,
	],
	ThrillingTalesofDragonSlayers: [
		enumStatTables.n1,
		enumStatTables.n42,
	],
	OtherworldlyStory: [
		enumStatTables.n1,
		enumStatTables.n65,
	],
	EmeraldOrb: [
		enumStatTables.n4,
		enumStatTables.n66,
	],
	TwinNephrite: [
		enumStatTables.n4,
		enumStatTables.n67,
	],
	FavoniusCodex: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	Widsith: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	SacrificialFragments: [
		enumStatTables.n9,
		enumStatTables.n57,
	],
	RoyalGrimoire: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	SolarPearl: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	PrototypeAmber: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	MappaMare: [
		enumStatTables.n13,
		enumStatTables.n47,
	],
	BlackcliffAgate: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	EyeofPerception: [
		enumStatTables.n9,
		enumStatTables.n22,
	],
	WineandSong: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	Frostbearer: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	DodocoTales: [
		enumStatTables.n9,
		enumStatTables.n22,
	],
	HakushinRing: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	OathswornEye: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	WanderingEvenstar: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	FruitOfFulfillment: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	SacrificialJade: [
		enumStatTables.n9,
		enumStatTables.n58,
	],
	FlowingPurity: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	BalladoftheBoundlessBlue: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	AshGravenDrinkingHorn: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	WaveridingWhirl: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	RingOfCeiba: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	EtherlightSpindlelute: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	BlackmarrowLantern: [
		enumStatTables.n9,
		enumStatTables.n57,
	],
	DawningFrost: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	ClashOfKings: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	EchoesOfTheHeart: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	WintersHeavyHeart: [
		enumStatTables.n11,
		enumStatTables.n27,
	],
	SkywardAtlas: [
		enumStatTables.n28,
		enumStatTables.n68,
	],
	LostPrayer: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	MemoryofDust: [
		enumStatTables.n30,
		enumStatTables.n33,
	],
	JadefallsSplendor: [
		enumStatTables.n30,
		enumStatTables.n69,
	],
	EverlastingMoonglow: [
		enumStatTables.n30,
		enumStatTables.n69,
	],
	KagurasVerity: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	ThousandFloatingDreams: [
		enumStatTables.n34,
		enumStatTables.n70,
	],
	TulaytullahsRemembrance: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	CashflowSupervision: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	TomeoftheEternalFlow: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	CranesEchoingCall: [
		enumStatTables.n51,
		enumStatTables.n64,
	],
	SurfingTime: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	StarcallersWatch: [
		enumStatTables.n34,
		enumStatTables.n70,
	],
	MorningHibernation: [
		enumStatTables.n34,
		enumStatTables.n70,
	],
	VividNotions: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	NightweaversLookingGlass: [
		enumStatTables.n34,
		enumStatTables.n70,
	],
	ReliquaryOfTruth: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	NocturnesCurtainCall: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	AngelosHeptades: [
		enumStatTables.n51,
		enumStatTables.n64,
	],
	HymnofTheMaelstrom: [
		enumStatTables.n34,
		enumStatTables.n38,
	],
	RavenBow: [
		enumStatTables.n4,
		enumStatTables.n66,
	],
	SharpshootersOath: [
		enumStatTables.n1,
		enumStatTables.n3,
	],
	RecurveBow: [
		enumStatTables.n7,
		enumStatTables.n56,
	],
	Slingshot: [
		enumStatTables.n7,
		enumStatTables.n71,
	],
	Messenger: [
		enumStatTables.n4,
		enumStatTables.n72,
	],
	FavoniusWarbow: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	Stringless: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	SacrificialBow: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	RoyalBow: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	Rust: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	PrototypeCrescent: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	CompoundBow: [
		enumStatTables.n9,
		enumStatTables.n59,
	],
	BlackcliffWarbow: [
		enumStatTables.n13,
		enumStatTables.n16,
	],
	ViridescentHunt: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	AlleyHunter: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	FadingTwilight: [
		enumStatTables.n13,
		enumStatTables.n24,
	],
	MitternachtsWaltz: [
		enumStatTables.n11,
		enumStatTables.n73,
	],
	WindblumeOde: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	Hamayumi: [
		enumStatTables.n9,
		enumStatTables.n22,
	],
	Predator: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	MouunsMoon: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	KingsSquire: [
		enumStatTables.n9,
		enumStatTables.n22,
	],
	EndOfTheLine: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	IbisPiercer: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	ScionOfTheBlazingSun: [
		enumStatTables.n13,
		enumStatTables.n48,
	],
	SongOfStillness: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	Cloudforged: [
		enumStatTables.n11,
		enumStatTables.n15,
	],
	RangeGauge: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	FlowerWreathedFeathers: [
		enumStatTables.n11,
		enumStatTables.n12,
	],
	ShatteredChains: [
		enumStatTables.n13,
		enumStatTables.n25,
	],
	SequenceofSolitude: [
		enumStatTables.n11,
		enumStatTables.n26,
	],
	SnareHook: [
		enumStatTables.n9,
		enumStatTables.n10,
	],
	RainbowSerpentsRainBow: [
		enumStatTables.n11,
		enumStatTables.n21,
	],
	JadeVista: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	CovenantOfFrostAndSnow: [
		enumStatTables.n11,
		enumStatTables.n46,
	],
	BreezeborneRefrain: [
		enumStatTables.n11,
		enumStatTables.n17,
	],
	SkywardHarp: [
		enumStatTables.n28,
		enumStatTables.n41,
	],
	AmosBow: [
		enumStatTables.n30,
		enumStatTables.n33,
	],
	ElegyfortheEnd: [
		enumStatTables.n30,
		enumStatTables.n31,
	],
	PolarStar: [
		enumStatTables.n30,
		enumStatTables.n37,
	],
	AquaSimulacra: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	ThunderingPulse: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	HuntersPath: [
		enumStatTables.n34,
		enumStatTables.n35,
	],
	TheFirstGreatMagic: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	SilvershowerHeartstrings: [
		enumStatTables.n34,
		enumStatTables.n38,
	],
	AstralVulturesCrimsonPlumage: [
		enumStatTables.n30,
		enumStatTables.n63,
	],
	TheDaybreakChronicles: [
		enumStatTables.n28,
		enumStatTables.n36,
	],
	GoldenFrostboundOath: [
		enumStatTables.n34,
		enumStatTables.n39,
	],
	DullBlade: [
		enumStatTables.n74,
	],
	WasterGreatsword: [
		enumStatTables.n74,
	],
	BeginnersProtector: [
		enumStatTables.n74,
	],
	ApprenticesNotes: [
		enumStatTables.n74,
	],
	HuntersBow: [
		enumStatTables.n74,
	],
};
