export class DbObjectRotation {
    /**
     * @param {Object.<string, number>} data feature name -> id
     * @param {Object.<number, string>} [aliases] retired id -> current feature name.
     *   Lets saved rotations that reference a renamed feature keep loading;
     *   they are re-saved with the current id.
     */
    constructor(data, aliases) {
        this.byName = data;
        this.byId = {};
        this.aliases = aliases || {};

        for (const key of Object.keys(data)) {
            this.byId[data[key]] = key;
        }
    }

    getById(id) {
        return this.byId[id] || this.aliases[id];
    }

    getByName(name) {
        return this.byName[name];
    }

    listNames() {
        return Object.keys(this.byName);
    }

    listAliases() {
        return this.aliases;
    }
}
