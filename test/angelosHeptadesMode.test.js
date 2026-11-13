import { AngelosHeptades } from "../src/js/db/Weapon/Catalyst/AngelosHeptades";
import { CalcObjectWeapon } from "../src/js/classes/CalcObject/Weapon";
import { DB } from "../src/js/db/DB";

global.DB = DB;

function getCondition(conditions, name) {
    return conditions.find((condition) => condition.getName() === name);
}

test("Angelos Heptades disabled toggle keeps refine-scaled text without enabling DMG bonus", () => {
    const mode = getCondition(AngelosHeptades.getConditions(), "weapon_angelos_heptades");
    const settings = {
        weapon_refine: 5,
    };

    const stats = mode.getStats(settings);
    const activePostEffects = AngelosHeptades.getPostEffects()
        .filter((postEffect) => postEffect.isActive(settings));

    expect(mode.isActive(settings)).toBe(false);
    expect(stats.get("text_percent_max")).toBe(58);
    expect(stats.get("text_percent_max_hexerei")).toBe(29);
    expect(stats.get("dmg_all")).toBe(0);
    expect(activePostEffects).toHaveLength(0);
});

test.each([1, 2, 3])("old Angelos mode %i decodes without reusing its serialize ID", (mode) => {
    const input = [AngelosHeptades.getId(), 90, 6, 5, 1, 1, mode];
    const weapon = CalcObjectWeapon.deserialize(input);
    expect(weapon).not.toBeNull();
    expect(input).toHaveLength(0);
    expect(weapon.getSettings().weapon_angelos_heptades).toBeUndefined();
});
