import { DbObject } from "../DbObject";

export class DbObjectBuff extends DbObject {
    constructor(data) {
        super(data);
        this.type = data.type || '';
        this.visible = !data.invisible;
        this.party = !!data.party;
    }

    /**
     * @returns {boolean} whether these are the team's own effects (the
     *     party component) rather than every member's
     */
    isParty() {
        return this.party;
    }

    getType() {
        return this.type;
    }

    getName() {
        return 'buff_group.'+ this.name;
    }

    isVisible() {
        return this.visible;
    }
}
