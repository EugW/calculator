import { DB } from "../src/js/db/DB";

function getWeapon(type, key) {
    return DB.Weapons.get(type).get(key);
}

function getCondition(weapon, name) {
    return weapon.getConditions().find((condition) => condition.getName() === name);
}

test("A Teaspoon of Transcendence is registered with Stellar Glimmer buffs", () => {
    const weapon = getWeapon("claymore", "ATeaspoonOfTranscendence");
    expect(weapon.getId()).toBe(245);
    expect(weapon.getGameId()).toBe(12516);
    expect(weapon.getIcon()).toBe("weapon-icon-claymore-a-teaspoon-of-transcendence");

    const [atkBuff, transcendenceStacks] = weapon.getConditions();
    expect(atkBuff.getStats({ weapon_refine: 1 }).get("atk_percent")).toBe(28);
    expect(atkBuff.getStats({ weapon_refine: 5 }).get("atk_percent")).toBe(56);
    expect(transcendenceStacks.getStats({ weapon_refine: 1 }, 1).get("dmg_stellarglimmer")).toBe(16);
    expect(transcendenceStacks.getStats({ weapon_refine: 5 }, 3).get("dmg_stellarglimmer")).toBe(96);
});

test("changed catalyst passives include direct Stellar-Conduct damage", () => {
    const cashflow = getCondition(getWeapon("catalyst", "CashflowSupervision"), "weapon_cashflow_supervision");
    expect(cashflow.getStats({ weapon_refine: 1 }, 1).get("dmg_stellarconduct")).toBe(14);
    expect(cashflow.getStats({ weapon_refine: 5 }, 3).get("dmg_stellarconduct")).toBe(84);

    const kagura = getCondition(getWeapon("catalyst", "KagurasVerity"), "weapon_kaguras_verity");
    expect(kagura.getStats({ weapon_refine: 1 }, 1).get("dmg_stellarconduct")).toBe(12);
    expect(kagura.getStats({ weapon_refine: 5 }, 3).get("dmg_stellarconduct")).toBe(72);
});
