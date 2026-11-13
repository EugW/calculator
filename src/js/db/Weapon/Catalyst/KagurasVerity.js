import { ConditionBooleanValue } from "../../../classes/Condition/Boolean/Value";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const KagurasVerity = new DbObjectWeapon({
    name: 'kaguras_verity',
    serializeId: 119,
    gameId: 14509,
    iconClass: "weapon-icon-catalyst-kaguras-verity",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.KagurasVerity,
    settingsSets: [
        {
            name: 'stacks_1',
            settings: {
                "weapon_kaguras_verity": 1,
            },
        },
        {
            name: 'stacks_3',
            settings: {
                "weapon_kaguras_verity": 3,
            },
        },
    ],
    conditions: [
        new ConditionStacks({
            name: 'weapon_kaguras_verity',
            serializeId: 1,
            title: 'talent_name.weapon_kaguras_verity',
            description: 'talent_descr.weapon_kaguras_verity_1',
            maxStacks: 3,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.KagurasVerity.p1)),
                new StatTable('dmg_stellarconduct', percent(weaponPassiveTables.KagurasVerity.p4)),
            ],
        }),
        new ConditionBooleanValue({
            name: 'weapon_kaguras_verity_max_stack',
            title: 'talent_name.weapon_kaguras_verity',
            description: 'talent_descr.weapon_kaguras_verity_2',
            levelSetting: 'weapon_refine',
            cond: 'ge',
            value: 3,
            setting: 'weapon_kaguras_verity',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.KagurasVerity.p3)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.KagurasVerity.p3)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.KagurasVerity.p3)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.KagurasVerity.p3)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.KagurasVerity.p3)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.KagurasVerity.p3)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.KagurasVerity.p3)),
            ],
        }),
    ],
});
