import { Artifact } from "../../src/js/classes/Artifact";
import { Team } from "../../src/js/classes/Team";
import { makeBuild } from "./team";

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

function equip(build, set, mains, subs) {
    for (const slot of SLOTS) {
        const items = (subs[slot] || []).map(([stat, value]) => ({stat, value}));
        build.setArtifact(new Artifact(5, 20, slot, set, mains[slot], items));
    }
}

/**
 * Skirk (on field) with Escoffier C2, Furina and Citlali holding Thrilling
 * Tales of Dragon Slayers R5 for Escoffier, against a level 100 enemy: a team
 * whose damage runs through every kind of stat source (objects, own and
 * delivered conditions, post-effects, a delivered multiplier, enemy RES).
 *
 * @returns {{team: Team, skirk: CalcSet, escoffier: CalcSet, furina: CalcSet, citlali: CalcSet}}
 */
export function makeSkirkTeam() {
    const skirk = makeBuild('Skirk');
    skirk.setWeapon(DB.Weapons.get('sword').get('Azurelight'));
    equip(skirk, 'FinaleOfTheDeepGalleries',
        {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_cryo', circlet: 'crit_dmg'},
        {
            flower: [['crit_rate', 10.5], ['crit_dmg', 21.0], ['atk_percent', 9.9]],
            plume: [['crit_rate', 7.0], ['crit_dmg', 20.2], ['atk_percent', 5.8]],
            sands: [['crit_rate', 9.7], ['crit_dmg', 14.0], ['atk', 33]],
            goblet: [['crit_rate', 6.6], ['crit_dmg', 21.8], ['atk_percent', 4.7]],
            circlet: [['crit_rate', 10.1], ['atk_percent', 14.6], ['atk', 19]],
        });

    const escoffier = makeBuild('Escoffier');
    escoffier.setCharLevels({level: 90, ascension: 6, constellation: 2});
    equip(escoffier, 'GoldenTroupe',
        {flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'atk_percent', circlet: 'crit_rate'},
        {flower: [['atk_percent', 11.1]], plume: [['atk_percent', 9.9]], sands: [['atk', 35]], goblet: [['recharge', 11]], circlet: [['atk_percent', 8.7]]});

    const furina = makeBuild('Furina');
    equip(furina, 'GoldenTroupe',
        {flower: 'hp', plume: 'atk', sands: 'hp_percent', goblet: 'hp_percent', circlet: 'crit_rate'},
        {flower: [['hp_percent', 10.5]], plume: [['hp_percent', 9.9]]});

    const citlali = makeBuild('Citlali');
    citlali.setWeapon(DB.Weapons.get('catalyst').get('ThrillingTales'));
    citlali.setWeaponLevels({level: 90, ascension: 6, refine: 5});

    const team = Team.fromMember(skirk);
    team.setMember(1, escoffier);
    team.setMember(2, furina);
    team.setMember(3, citlali);
    team.enemy.setLevels({level: 100});

    skirk.setCharSettings({skirk_seven_phase_flash: true, skirk_serpents_subtlety: 10, skirk_reason_beyond_reason: 3, skirk_return_to_oblivion: 3});
    escoffier.setCharSettings({escoffier_fresh_fragrant_stew_is_an_art: true});
    furina.setCharSettings({furina_fanfare_stacks: 300});
    citlali.setWeaponSettings({weapon_thrilling_tales: true, weapon_thrilling_tales_receiver: escoffier.char.getId()});

    return {team, skirk, escoffier, furina, citlali};
}
