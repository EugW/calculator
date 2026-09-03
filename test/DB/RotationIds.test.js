import { DB } from "../../src/js/db/DB";
import { Rotation } from "../../src/js/db/Features/Rotation";
import { toBeEmptyArray } from "../../src/js/test/matchers";

expect.extend({toBeEmptyArray});

test('Duplicate ids for Rotations', () => {
    expect( getDuplicatedIds(Rotation) ).toBeEmptyArray();
});

test('All rotation features have IDs', () => {
    expect( getMissingRotationIds() ).toBeEmptyArray();
});

function getDuplicatedIds(obj) {
    let used_ids = {};

    for (let name of obj.listNames()) {
        let id = obj.getByName(name);
        if (!used_ids[id]) {
            used_ids[id] = [];
        }
        used_ids[id].push(name);
    }

    let result = [];

    for (let id of Object.keys(used_ids)) {
        if (used_ids[id].length > 1) {
            result.push('id='+ id +' keys='+ used_ids[id].join(','));
        }
    }

    return result;
}

function getMissingRotationIds() {
    let missing = [];

    for (const char of DB.Chars.getList()) {
        for (const feature of char.getFeatures()) {
            if (feature.usedInRotation && feature.usedInRotation()) {
                const name = feature.getName();
                const id = Rotation.getByName(name);

                if (!id) {
                    missing.push(`${char.name}: ${name}`);
                }
            }
        }
    }

    return missing;
}
