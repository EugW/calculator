import { AngelosHeptades } from "../src/js/db/Weapon/Catalyst/AngelosHeptades";
import { Weapons as WeaponBuffs } from "../src/js/db/Buffs/Weapons";

function getCondition(conditions, name) {
    return conditions.find((condition) => condition.getName() === name);
}

test("Angelos Heptades disabled mode keeps refine-scaled text without enabling personal DMG bonus", () => {
    const mode = getCondition(AngelosHeptades.getConditions(), "weapon_angelos_heptades");
    const settings = {
        weapon_refine: 5,
    };

    const stats = mode.getStats(settings);
    const activePostEffects = AngelosHeptades.getPostEffects()
        .filter((postEffect) => postEffect.isActive(settings));

    expect(mode.getSelectedValue(settings)).toBe("-");
    expect(stats.get("text_percent_max")).toBe(58);
    expect(stats.get("text_percent_max_hexerei")).toBe(29);
    expect(stats.get("dmg_all")).toBe(0);
    expect(activePostEffects).toHaveLength(0);
});

test("Angelos Heptades team mode defaults disabled without enabling team DMG bonus", () => {
    const partyMode = getCondition(WeaponBuffs.getConditions(), "weapon_other.weapon_angelos_heptades");
    const settings = {
        "weapon_other.weapon_angelos_heptades": 5,
        angelos_heptades_atk: 1000,
    };

    const stats = partyMode.getStats(settings);
    const activePostEffects = WeaponBuffs.getPostEffects()
        .filter((postEffect) => postEffect.isActive(settings));

    expect(stats.get("text_percent_max")).toBe(58);
    expect(stats.get("text_percent_max_hexerei")).toBe(29);
    expect(activePostEffects).toHaveLength(0);
});
