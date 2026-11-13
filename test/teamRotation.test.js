import { CalcSet } from "../src/js/classes/CalcSet";
import { Condition } from "../src/js/classes/Condition";
import { Rotation } from "../src/js/classes/Rotation";
import { ROTATION_SELF, ROTATION_TEAM } from "../src/js/classes/RotationCompiler";
import { Serializer } from "../src/js/classes/Serializer";
import { Team } from "../src/js/classes/Team";
import { DB } from "../src/js/db/DB";
import { makeBuild } from "./support/team";

global.DB = DB;

const HIT = 'attack.normal_hit_1';

function condition(charKey, name) {
    return Condition.unwrap(DB.Chars.get(charKey).getAllConditions()).find((cond) => cond.getName() == name);
}

function makeTeam(...charKeys) {
    const members = charKeys.map(makeBuild);
    const team = Team.fromMember(members[0]);
    members.slice(1).forEach((member, index) => team.setMember(index + 1, member));
    return {team, members};
}

function hit(member, feature = HIT) {
    return {type: 'feature', charId: member.char.getId(), feature, count: 1, reaction: 0};
}

/** A step on a member's character condition. */
function charStep(member, charKey, name, value) {
    return {
        type: 'condition',
        subtype: 'member',
        charId: member.char.getId(),
        object: 'char',
        itemId: member.char.getId(),
        conditionId: condition(charKey, name).getId(),
        value: value,
    };
}

function enemyStep(team, name, value) {
    const cond = DB.Conditions.Enemy.find((item) => item.getName() == name);
    return {type: 'condition', subtype: 'enemy', itemId: team.enemy.object.getId(), conditionId: cond.getId(), value};
}

function result(member, name, type = 'normal') {
    const value = member.getFeatureResultByName(name);
    return value ? value[type] : 0;
}

/** A hit's value outside the rotation, with the team as it is. */
function single(member, feature = HIT) {
    return member.getFeatures(member.getBuildData())[feature].normal;
}

describe("the team's rotation", () => {
    test("is one total for every member; each member's own hits add up to it", () => {
        const {team, members} = makeTeam('Hutao', 'Bennet', 'Xingqiu', 'Kazuha');
        const [hutao, bennet, xingqiu, kazuha] = members;
        team.setRotation(new Rotation({items: [
            hit(hutao), hit(bennet), charStep(bennet, 'Bennet', 'bennet_fantastic_voyage', 1),
            hit(hutao), hit(xingqiu), hit(kazuha),
        ]}));

        const totals = members.map((member) => result(member, ROTATION_TEAM, 'average'));
        for (const total of totals) {
            expect(total).toBeCloseTo(totals[0], 6);
        }
        const own = members.map((member) => result(member, ROTATION_SELF, 'average'));
        expect(own.reduce((sum, value) => sum + value)).toBeCloseTo(totals[0], 6);
    });

    test("a member without hits has only the team's total", () => {
        const {team, members: [hutao, bennet]} = makeTeam('Hutao', 'Bennet');
        team.setRotation(new Rotation({items: [hit(hutao)]}));

        expect(bennet.getFeatureByName(ROTATION_TEAM)).not.toBeNull();
        expect(bennet.getFeatureByName(ROTATION_SELF)).toBeNull();
        expect(result(bennet, ROTATION_TEAM)).toBeCloseTo(result(hutao, ROTATION_SELF), 6);
    });

    test("a step on a teammate switches its effect on for the following hits", () => {
        const {team, members: [hutao, bennet]} = makeTeam('Hutao', 'Bennet');
        const plain = single(hutao);
        bennet.setCharSettings({bennet_fantastic_voyage: true});
        const buffed = single(hutao);
        bennet.setCharSettings({});
        expect(buffed).toBeGreaterThan(plain);

        team.setRotation(new Rotation({items: [hit(hutao), charStep(bennet, 'Bennet', 'bennet_fantastic_voyage', 1), hit(hutao)]}));
        expect(result(hutao, ROTATION_TEAM)).toBeCloseTo(plain + buffed, 6);

        // The rotation works on a copy: the teammate itself is unchanged.
        expect(bennet.getSettings().bennet_fantastic_voyage).toBeFalsy();
    });

    test("a step reaches everything a teammate delivers: a multiplier follows it both ways", () => {
        const {team, members: [kazuha, faruzan]} = makeTeam('Kazuha', 'Faruzan');
        const skill = 'skill.press_dmg';
        const a4 = {faruzan_wind_benefit: true, faruzan_lost_wisdom_of_the_seven_caverns: true};
        const plain = single(kazuha, skill);
        faruzan.setCharSettings(a4);
        const buffed = single(kazuha, skill);
        faruzan.setCharSettings({});

        const steps = (value) => Object.keys(a4).map((name) => charStep(faruzan, 'Faruzan', name, value));
        team.setRotation(new Rotation({items: [hit(kazuha, skill), ...steps(1), hit(kazuha, skill)]}));
        expect(result(kazuha, ROTATION_SELF)).toBeCloseTo(plain + buffed, 6);

        faruzan.setCharSettings(a4);
        team.setRotation(new Rotation({items: [hit(kazuha, skill), ...steps(0), hit(kazuha, skill)]}));
        expect(result(kazuha, ROTATION_SELF)).toBeCloseTo(buffed + plain, 6);
    });

    test("is the same seen from the member whose multiplier a teammate's hit reads", () => {
        // Faruzan's A4 reads her base ATK: in her own program the stats of
        // Kazuha's hit are moved back to plain names.
        const {team, members: [kazuha, faruzan]} = makeTeam('Kazuha', 'Faruzan');
        faruzan.setCharSettings({faruzan_wind_benefit: true, faruzan_lost_wisdom_of_the_seven_caverns: true});
        const skill = 'skill.press_dmg';
        team.setRotation(new Rotation({items: [hit(kazuha, skill)]}));

        expect(result(kazuha, ROTATION_TEAM)).toBeCloseTo(single(kazuha, skill), 6);
        expect(result(faruzan, ROTATION_TEAM)).toBeCloseTo(single(kazuha, skill), 6);
    });

    test("a step on the enemy reaches every member's following hits", () => {
        const {team, members: [hutao, bennet]} = makeTeam('Hutao', 'Bennet');
        team.setRotation(new Rotation({items: [hit(hutao), hit(bennet)]}));
        const plain = [result(hutao, ROTATION_SELF), result(bennet, ROTATION_SELF)];

        team.setRotation(new Rotation({items: [enemyStep(team, 'enemy.def_reduce', 50), hit(hutao), hit(bennet)]}));
        expect(result(hutao, ROTATION_SELF)).toBeGreaterThan(plain[0]);
        expect(result(bennet, ROTATION_SELF)).toBeGreaterThan(plain[1]);
        expect(team.enemy.getSettings()['enemy.def_reduce']).toBeFalsy();
    });

    test("a step on the team's toggles reaches every member and leaves the team alone", () => {
        const {team, members: [ayaka, fischl]} = makeTeam('Ayaka', 'Fischl');
        const polestar = Condition.unwrap(DB.Buffs.getList().filter((item) => item.isParty()).flatMap((item) => item.getConditions()))
            .find((cond) => cond.getName() == 'polestar_field');
        team.setRotation(new Rotation({items: [hit(ayaka)]}));
        const plain = result(ayaka, ROTATION_TEAM);
        team.setRotation(new Rotation({items: [
            {type: 'condition', subtype: 'buffs', itemId: 0, conditionId: polestar.getId(), value: 1},
            hit(ayaka),
        ]}));
        // Polestar's Physical RES shred on the enemy: Ayaka's first hit is physical.
        expect(result(ayaka, ROTATION_TEAM)).toBeGreaterThan(plain);
        expect(result(fischl, ROTATION_TEAM)).toBeCloseTo(result(ayaka, ROTATION_TEAM), 6);
        expect(team.getSettings().polestar_field).toBe(false);
    });

    test("a switch puts a member on field for the following hits", () => {
        // Baizhu's A4 gives the on-field member Quicken DMG Bonus; Baizhu
        // starts on field.
        const {team, members: [baizhu, lisa]} = makeTeam('Baizhu', 'Lisa');
        baizhu.setCharSettings({baizhu_all_things_are_of_the_earth: true});
        const aggravate = Object.assign(hit(lisa), {reaction: 3});
        const switchTo = (member) => ({type: 'action', action: 'switch', charId: member.char.getId()});

        team.setRotation(new Rotation({items: [aggravate]}));
        const offField = result(lisa, ROTATION_TEAM);
        team.setOnFieldMember(lisa);
        const onField = result(lisa, ROTATION_TEAM);
        team.setOnFieldMember(baizhu);
        expect(onField).toBeGreaterThan(offField);

        team.setRotation(new Rotation({items: [switchTo(lisa), aggravate, switchTo(baizhu), aggravate]}));
        expect(result(lisa, ROTATION_TEAM)).toBeCloseTo(onField + offField, 6);
        expect(result(baizhu, ROTATION_TEAM)).toBeCloseTo(onField + offField, 6);
        // The rotation works on a copy: the team's on-field member stays.
        expect(team.getOnFieldMember()).toBe(baizhu);

        // Saved with its member.
        const saved = Rotation.deserialize(team.getRotation().serialize());
        expect(saved.getItems()[0]).toMatchObject({type: 'action', action: 'switch', charId: lisa.char.getId()});
    });
});

describe("blocks", () => {
    function shredTeam() {
        const {team, members: [hutao]} = makeTeam('Hutao', 'Bennet');
        const shred = enemyStep(team, 'enemy.def_reduce', 50);
        team.setRotation(new Rotation({items: [hit(hutao)]}));
        const plain = result(hutao, ROTATION_TEAM);
        team.setRotation(new Rotation({items: [shred, hit(hutao)]}));
        const shredded = result(hutao, ROTATION_TEAM);
        return {team, hutao, shred, plain, shredded};
    }

    test("a step inside a repeat block does not reach the hits after it", () => {
        const {team, hutao, shred, plain, shredded} = shredTeam();
        team.setRotation(new Rotation({items: [{type: 'repeat', count: 2, items: [shred, hit(hutao)]}, hit(hutao)]}));
        expect(result(hutao, ROTATION_TEAM)).toBeCloseTo(2 * shredded + plain, 6);
    });

    test("a step after a block applies, whatever the block changed", () => {
        const {team, hutao, shred, shredded} = shredTeam();
        team.setRotation(new Rotation({items: [{type: 'repeat', count: 1, items: [shred, hit(hutao)]}, shred, hit(hutao)]}));
        expect(result(hutao, ROTATION_TEAM)).toBeCloseTo(2 * shredded, 6);
    });

    test("an uptime block weighs its hits with and without its conditions", () => {
        const {team, hutao, shred, plain, shredded} = shredTeam();
        team.setRotation(new Rotation({items: [{type: 'uptime', percent: 25, conditions: [shred], features: [hit(hutao)]}]}));
        expect(result(hutao, ROTATION_TEAM)).toBeCloseTo(0.25 * shredded + 0.75 * plain, 6);
    });

    test("the editor's hits follow the rotation's order, every member's", () => {
        const {team, members: [hutao, bennet]} = makeTeam('Hutao', 'Bennet');
        const absent = {type: 'feature', charId: DB.Chars.get('Kazuha').getId(), feature: HIT, count: 1, reaction: 0};
        team.setRotation(new Rotation({items: [hit(hutao), absent, {type: 'repeat', count: 2, items: [hit(bennet)]}]}));

        const feature = hutao.view().getFeaturesList().find((item) => item.getName() == ROTATION_TEAM);
        const rows = feature.getResultForEditor();
        expect(rows).toHaveLength(3);
        expect(rows[0].result.normal).toBeCloseTo(single(hutao), 6);
        // A hit of a character not in the team does not apply.
        expect(rows[1]).toEqual({});
        expect(rows[2].result.normal).toBeCloseTo(single(bennet), 6);
    });
});

describe("saving", () => {
    test("hits and member steps are saved with their member", () => {
        const {members: [hutao, bennet]} = makeTeam('Hutao', 'Bennet');
        const step = charStep(bennet, 'Bennet', 'bennet_fantastic_voyage', 1);
        const rotation = new Rotation({items: [hit(hutao), step]});
        const copy = Rotation.deserialize(Serializer.unpack(Serializer.pack(rotation)));
        const [feature, item] = copy.getItems();

        expect(feature).toMatchObject({type: 'feature', charId: hutao.char.getId(), feature: HIT});
        expect(item).toMatchObject({
            subtype: 'member',
            charId: bennet.char.getId(),
            object: 'char',
            itemId: bennet.char.getId(),
            conditionId: step.conditionId,
            value: 1,
        });

        const data = Rotation.getConditionData(item, hutao.team);
        expect(data.invalid).toBe(false);
        expect(data.member).toBe(bennet);
        // Without that member the step does not apply.
        expect(Rotation.getConditionData(item, Team.fromMember(makeBuild('Hutao'))).invalid).toBe(true);
    });

    test("a rotation saved before rotations belonged to teams is given to a member", () => {
        const voyage = condition('Bennet', 'bennet_fantastic_voyage');
        // Version 3: a hit, a step on the owner's character, a weapon step.
        const weapon = DB.Weapons.get('sword').getFirst(true);
        const weaponCondition = Condition.unwrap(DB.Conditions.Weapon.concat(weapon.getConditions()))
            .find((cond) => cond.params.serializeId);
        const v3 = [3, 0, 3,
            0, 0, 1, DB.Features.Rotation.getByName(HIT), 1, 0,
            0, 0, 2, 1, DB.Chars.get('Bennet').getId(), voyage.params.serializeId, 1,
            0, 0, 2, 2, weapon.getId(), weaponCondition.params.serializeId, 1,
        ];
        const rotation = Rotation.deserialize(v3);
        const [feature, charItem, weaponItem] = rotation.getItems();
        expect(feature.charId).toBe(0);
        // A step on a character names it.
        expect(charItem).toMatchObject({subtype: 'member', object: 'char', charId: DB.Chars.get('Bennet').getId()});
        expect(weaponItem).toMatchObject({subtype: 'member', object: 'weapon', charId: 0});

        rotation.assignOwner(DB.Chars.get('Bennet').getId());
        expect(rotation.getItems().map((item) => item.charId)).toEqual(new Array(3).fill(DB.Chars.get('Bennet').getId()));
    });

    test("the team saves its rotation; a character build saves its member's part", () => {
        const {team, members: [hutao, bennet]} = makeTeam('Hutao', 'Bennet');
        const shred = enemyStep(team, 'enemy.def_reduce', 50);
        team.setRotation(new Rotation({items: [
            hit(hutao), charStep(bennet, 'Bennet', 'bennet_fantastic_voyage', 1), shred, hit(bennet), hit(hutao),
        ]}));

        const copy = Team.deserialize(team.serialize());
        expect(copy.getRotation().serialize()).toEqual(team.getRotation().serialize());
        expect(result(copy.getMember(0), ROTATION_TEAM)).toBeCloseTo(result(hutao, ROTATION_TEAM), 6);

        // Hu Tao's part: her hits and the enemy's step.
        const saved = CalcSet.deserialize(hutao.serialize());
        expect(saved.savedRotation.getItems().map((item) => item.type + ':' + (item.charId || item.subtype)))
            .toEqual(['feature:' + hutao.char.getId(), 'condition:enemy', 'feature:' + hutao.char.getId()]);

        // A team made from the build takes it; a team with a rotation keeps its own.
        const solo = Team.fromMember(saved);
        expect(solo.getRotation().getItems()).toHaveLength(3);
        expect(saved.savedRotation).toBeNull();
        const other = makeTeam('Xingqiu', 'Bennet').team;
        other.setRotation(new Rotation({items: [hit(other.getMember(0))]}));
        other.importMember(2, CalcSet.deserialize(hutao.serialize()));
        expect(other.getRotation().getItems()).toHaveLength(1);
    });

    test.each([
        ['retired party condition', {
            type: 'condition', subtype: 'party', itemId: 1, conditionId: 1, value: 1,
        }],
        ['unknown feature', {type: 'feature', charId: 1, feature: 'retired.feature', count: 1}],
    ])("skipping a %s preserves subsequent rotation steps and enclosing data", (_, retired) => {
        const feature = {type: 'feature', charId: DB.Chars.get('Hutao').getId(), feature: HIT, count: 2, reaction: 0};
        const rotation = new Rotation({items: [
            {...retired, disabled: true, collapsed: true},
            {type: 'repeat', count: 3, items: [retired, feature]},
            feature,
        ]});
        const input = [...rotation.serialize(), 9876];
        const copy = Rotation.deserialize(input);

        expect(copy).not.toBeNull();
        expect(copy.getItems()).toMatchObject([
            {type: 'repeat', count: 3, items: [feature]},
            feature,
        ]);
        expect(input).toEqual([9876]);
    });
});
