import { CalcObjectBuffs, CUSTOM_STATS } from "../src/js/classes/CalcObject/Buffs";
import { DB } from "../src/js/db/DB";

global.DB = DB;

test('Stellar Glimmer custom-stat IDs append without renumbering Conduct', () => {
    expect(CUSTOM_STATS.dmg_stellarconduct.serializeId).toBe(47);
    expect(CUSTOM_STATS.stellarconduct_multi.serializeId).toBe(48);
    expect(CUSTOM_STATS.dmg_stellarconduct_special.serializeId).toBe(51);

    expect(CUSTOM_STATS.dmg_stellarglimmer.serializeId).toBe(52);
    expect(CUSTOM_STATS.stellarglimmer_multi.serializeId).toBe(53);
    expect(CUSTOM_STATS.dmg_stellarglimmer_special.serializeId).toBe(54);
    expect(CUSTOM_STATS.dmg_stellarswirl.serializeId).toBe(55);
    expect(CUSTOM_STATS.stellarswirl_multi.serializeId).toBe(56);
    expect(CUSTOM_STATS.dmg_stellarswirl_special.serializeId).toBe(57);

    const usedIds = Object.values(CUSTOM_STATS).map((item) => item.serializeId);
    expect(usedIds).not.toContain(49);
    expect(usedIds).not.toContain(50);
});

test('Stellar Glimmer custom stats round-trip through immutable serialized IDs', () => {
    const buffs = new CalcObjectBuffs();
    const encoded = buffs.serializeCustomBuffs({
        'custom_buffs.dmg_stellarglimmer': 12.3,
        'custom_buffs.stellarglimmer_multi': 23.4,
        'custom_buffs.dmg_stellarglimmer_special': 34.5,
        'custom_buffs.dmg_stellarswirl': 45.6,
        'custom_buffs.stellarswirl_multi': 56.7,
        'custom_buffs.dmg_stellarswirl_special': 67.8,
    });

    expect(encoded).toEqual([
        6,
        52, 123,
        53, 234,
        54, 345,
        55, 456,
        56, 567,
        57, 678,
    ]);

    expect(buffs.deserializeCustomBuffs([...encoded])).toEqual({
        'custom_buffs.dmg_stellarglimmer': 12.3,
        'custom_buffs.stellarglimmer_multi': 23.4,
        'custom_buffs.dmg_stellarglimmer_special': 34.5,
        'custom_buffs.dmg_stellarswirl': 45.6,
        'custom_buffs.stellarswirl_multi': 56.7,
        'custom_buffs.dmg_stellarswirl_special': 67.8,
    });
});
