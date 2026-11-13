import { CalcSet } from "../CalcSet";
import { Serializer } from "../Serializer";
import { StorageItem } from "../StorageItem";
import { isTeamFormat, Team } from "../Team";

export class StorageItemChar extends StorageItem {
    constructor() {
        super('char');
    }

    decodeItem(string) {
        let input = Serializer.unpack(string);
        if (!input) return null;

        // A character saved with its additional buffs is a team of one
        // (App.buildToSave): its one member, in that team.
        if (isTeamFormat(input[0])) {
            let team = Team.deserialize(input);
            let members = team ? team.getMembers() : [];
            return members.length == 1 ? members[0] : null;
        }

        // Keep format-1 context for Team.solo/fromMember. Importing this
        // build into an existing team explicitly takes its characterBuild().
        return CalcSet.deserialize(input);
    }

    /**
     * @param {CalcSet|Team} object a character, or a team of one: a character
     *     with its additional buffs
     */
    add(object, meta) {
        return super.add(storedForm(object), meta);
    }

    replace(index, object) {
        return super.replace(index, storedForm(object));
    }

    /**
     * A backup's build of the released format (1) is stored as it is: packed
     * again it would be its character only, without its enemy and its party
     * and buff rows. So is a character saved with its additional buffs.
     */
    addFromBackup(object, meta, data) {
        if (!object.legacyTeam && !object.team) {
            return super.addFromBackup(object, meta, data);
        }

        let item = Object.assign({}, meta, {data});
        delete item.hash;
        this.items.push(item);
        this.save();
    }

    itemHash(item) {
        return item.data +'-'+ (item.title || '');
    }

    savedHashes(artifactStorage) {
        let result = {};

        for (let item of this.listDecoded(1)) {
            let char = item.data.getChar().object;

            for (const [slot, art] of Object.entries(item.data.getArtifacts())) {
                if (art) {
                    let hash = artifactStorage?.getByHash(art.getHash())?.getHash() || art.getHash();
                    if (!result[hash]) {
                        result[hash] = [];
                    }

                    let icon = char.getIcon();
                    if (!result[hash].includes(icon)) {
                        result[hash].push(icon);
                    }
                }
            }
        }

        return result;
    }

    addChars(items) {
        let hashes = {};

        for (let char of this.items) {
            hashes[char.data] = 1;
        }

        for (let data of items) {
            let char = data.set;
            let hash = char.getHash();

            if (hash && !hashes[hash]) {
                this.add(char, {});
            }
        }
    }
}

/**
 * @param {CalcSet|Team} object
 * @returns {CalcSet|Team} what is stored: a character on its own, or a team
 *     of one as it is
 */
function storedForm(object) {
    return object instanceof Team ? object : object.characterBuild();
}
