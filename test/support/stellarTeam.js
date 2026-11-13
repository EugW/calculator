import { Team } from "../../src/js/classes/Team";
import { finalStats, makeBuild } from "./team";

// Preserve the original 1000 + 600% * 1000 formula fixture using real members.
export function qiqiStellarTeam() {
    const receiver = makeBuild('Ayaka');
    const qiqi = makeBuild('Qiqi');
    qiqi.setCharLevels({level: 90, ascension: 6, constellation: 6});
    const team = Team.fromMember(receiver);
    team.setMember(1, qiqi);
    team.enemy.set(null);
    team.enemy.setResistances({cryo: 0});
    for (const member of [receiver, qiqi]) {
        const stats = finalStats(member);
        member.modifyBuffsSettings({
            'custom_buffs.atk': 1000 - stats.get('atk_base') - stats.get('atk'),
            'custom_buffs.mastery': -stats.get('mastery_base') - stats.get('mastery'),
        });
    }
    qiqi.setCharSettings({qiqi_glimpse_of_mystery: 1});
    return {team, receiver, qiqi};
}
