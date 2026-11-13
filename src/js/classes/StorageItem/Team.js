import { Serializer } from "../Serializer";
import { StorageItem } from "../StorageItem";
import { Team } from "../Team";

/** Saved teams are complete snapshots, independent of the open team. */
export class StorageItemTeam extends StorageItem {
    constructor() {
        super('teams');
    }

    decodeItem(string) {
        try {
            const team = Team.deserialize(Serializer.unpack(string));
            return team?.getMembers().length ? team : null;
        } catch {
            return null;
        }
    }

    listDecoded(showBeta) {
        return super.listDecoded(true).filter((item) => showBeta
            || !item.data.getMembers().some((member) => member.hasBetaContent()));
    }

    itemHash(item) {
        return item.data + '-' + (item.title || '');
    }
}
