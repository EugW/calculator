import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../../classes/StatTable";
import { ValueTable } from "../../../classes/ValueTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SturdyBone = new DbObjectWeapon({
    name: 'sturdy_bone',
    serializeId: 186,
    gameId: 11430,
    iconClass: 'weapon-icon-sword-sturdy-bone',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.SturdyBone,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_sturdy_bone',
            serializeId: 1,
            title: 'talent_name.weapon_sturdy_bone',
            description: 'talent_descr.weapon_sturdy_bone',
            stats: [
                new StatTable('text_percent_dmg', percent(weaponPassiveTables.SturdyBone.p2)),
            ],
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            leveling: 'weapon_refine',
            source: 'weapon',
            values: new ValueTable(percent(weaponPassiveTables.SturdyBone.p2)),
            condition: new ConditionBoolean({name: 'weapon_sturdy_bone'}),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal'],
            }),
        }),
    ],
});

