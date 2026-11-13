import { CalcObjectArtifacts } from "../src/js/classes/CalcObject/Artifacts";
import { CalcObjectBuffs } from "../src/js/classes/CalcObject/Buffs";
import { CalcObjectWeapon } from "../src/js/classes/CalcObject/Weapon";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeSetArtifacts } from "./support/baseline";
import { finalStats, makeBuild, shielded } from "./support/team";

global.DB = DB;

/** Hu Tao with two Geo members: Geo Resonance. */
function geoTeam() {
    const hutao = makeBuild('Hutao');
    const team = Team.fromMember(hutao);
    team.setMember(1, makeBuild('Albedo'));
    team.setMember(2, makeBuild('Ningguang'));
    return {team, hutao, albedo: team.getMember(1)};
}

describe("the shield protects the on-field member", () => {
    test("the team toggle shields only the on-field member", () => {
        const {team, hutao, albedo} = geoTeam();
        team.modifySettings({on_field_shield: true});
        expect(shielded(hutao)).toBe(true);
        expect(shielded(albedo)).toBe(false);
        // Geo Resonance: protected by a shield, 15% more DMG.
        expect(finalStats(hutao).get('dmg_all')).toBeCloseTo(0.15, 10);
        expect(finalStats(albedo).get('dmg_all')).toBeCloseTo(0, 10);

        team.setOnFieldMember(albedo);
        expect(shielded(hutao)).toBe(false);
        expect(shielded(albedo)).toBe(true);

        team.modifySettings({on_field_shield: false});
        expect(shielded(albedo)).toBe(false);
    });

    test("member settings cannot shield an off-field member", () => {
        const {team, albedo} = geoTeam();
        team.modifySettings({on_field_shield: true});
        albedo.setCommonSettings({'common.char_status_shield': true});
        albedo.setWeaponSettings({'common.char_status_shield': true});
        expect(shielded(albedo)).toBe(false);
    });

    test("sets and weapons read the member's shield state", () => {
        const {team, hutao} = geoTeam();
        hutao.replaceArtifacts(makeSetArtifacts('RetracingBolide'));
        const keqing = makeBuild('Keqing');
        keqing.setWeapon(DB.Weapons.get('sword').get('SummitShaper'));
        keqing.setWeaponSettings({weapon_unforged: 5});
        team.setMember(3, keqing);
        team.modifySettings({on_field_shield: true});

        const hutaoOn = finalStats(hutao).get('dmg_normal');
        const keqingOff = finalStats(keqing).get('atk_percent');
        team.setOnFieldMember(keqing);
        // Retracing Bolide 4pc: 40% Normal and Charged Attack DMG.
        expect(hutaoOn - finalStats(hutao).get('dmg_normal')).toBeCloseTo(0.4, 10);
        // Summit Shaper R1, 5 stacks: 4% ATK each, doubled while shielded.
        expect(finalStats(keqing).get('atk_percent') - keqingOff).toBeCloseTo(0.2, 10);
    });

    test("the old shield switches still decode", () => {
        // The member's own switch (buffs ID 5) was the on-field shield, now
        // the team's: it decodes, and a member keeps no team toggle.
        expect(CalcObjectBuffs.deserialize([1, 5]).getSettings()).toEqual({});

        const build = makeBuild('Keqing');
        build.replaceArtifacts(makeSetArtifacts('RetracingBolide'));
        build.setWeapon(DB.Weapons.get('sword').get('SummitShaper'));
        const settings = build.getSettings();
        // Retracing Bolide ID 13 and Summit Shaper ID 2 were checkboxes.
        for (const [object, Class, id] of [[build.artifacts, CalcObjectArtifacts, 13], [build.weapon, CalcObjectWeapon, 2]]) {
            const input = object.serialize(settings);
            expect(input[input.length - 1]).toBe(0);
            input.splice(-1, 1, 1, id);
            expect(Class.deserialize(input)).not.toBeNull();
        }
    });
});

test("team toggles override a member's settings in evaluations only", () => {
    const mizuki = makeBuild('Mizuki');
    mizuki.setCharSettings({mizuki_radiance_stellarswirl: true});
    const team = Team.fromMember(makeBuild('Ayaka'));
    team.setMember(1, mizuki);
    expect(mizuki.getBuildData().settings.mizuki_radiance_stellarswirl).toBe(true);

    // Polestar Field is the competing Conduct state; the viewed member is Ayaka.
    team.modifySettings({polestar_field: true});
    expect(mizuki.getBuildData().settings.mizuki_radiance_stellarswirl).toBe(false);
    expect(mizuki.getSettings().mizuki_radiance_stellarswirl).toBe(true);
});
