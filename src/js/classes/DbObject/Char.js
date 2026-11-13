import { ConditionRetired } from "../Condition/Retired";
import { DbObject } from "../DbObject";

export class DbObjectChar extends DbObject {
    constructor(data) {
        super(data);

        this.constellation = data.constellation;
        this.element = data.element;
        this.weapon = data.weapon;
        this.origin = data.origin || '';
        // Serialize IDs of party conditions moved into the character's own
        // effects, as [id, type]. Old party data (format 1 links, saved
        // builds) still decodes; the values are dropped.
        this.retiredParty = (data.retiredParty || []).map(([serializeId, type]) => {
            return new ConditionRetired({serializeId, type});
        });
        this.talents = data.talents;
        this.gameId = [];
        this.depotIds = data.depotIds || [];
        this.priority = data.priority;
        this.priorityConst = data.priorityConst;

        if (Array.isArray(data.gameId)) {
            this.gameId = data.gameId;
        } else if (data.gameId) {
            this.gameId = [data.gameId];
        }

    }

    getName() {
        return 'char_name.'+ this.name;
    }

    getIcon() {
        return this.iconClass || 'char-icon-' + this.name.replace('_', '-');
    }

    getGameId() {
        return this.gameId;
    }

    getWeapon() {
        return this.weapon;
    }

    getElement() {
        return this.element;
    }

    getOrigin() {
        return this.origin;
    }

    getAllConditions() {
        let result = this.getConditions();

        if (this.constellation) {
            result = result.concat(this.constellation.getConditions(6));
        }

        return result;
    }

    getLegacyPartyConditions() {
        return this.retiredParty;
    }

    getTalentTable(name) {
        let result;

        if (this.talents) {
            result = this.talents.getCategory(name);
        }

        return result;
    }
}
