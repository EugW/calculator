import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStacksHidden } from "../../../classes/Condition/Stacks/Hidden";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const CalamityQueller = new DbObjectWeapon({
    name: 'calamity_queller',
    serializeId: 118,
    gameId: 13507,
    iconClass: "weapon-icon-polearm-calamity-queller",
    rarity: 5,
    weapon: 'polearm',
    statTable: weaponStatTables.CalamityQueller,
    settingsSets: [
        {
            name: 'on_field',
            settings: {
                weapon_calamity_queller: 6,
                weapon_calamity_queller_off_field: 0,
            },
        },
        {
            name: 'off_field',
            settings: {
                weapon_calamity_queller: 6,
                weapon_calamity_queller_off_field: 1,
            },
        },
    ],
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_calamity_queller',
            description: 'talent_descr.weapon_calamity_queller',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.CalamityQueller.p1)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.CalamityQueller.p1)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.CalamityQueller.p1)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.CalamityQueller.p1)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.CalamityQueller.p1)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.CalamityQueller.p1)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.CalamityQueller.p1)),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_calamity_queller',
            serializeId: 1,
            title: 'talent_name.weapon_calamity_queller',
            description: 'talent_descr.weapon_calamity_queller_2',
            maxStacks: weaponPassiveTables.CalamityQueller.p4[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.CalamityQueller.p3)),
            ],
        }),
        new ConditionBoolean({
            name: 'weapon_calamity_queller_off_field',
            serializeId: 2,
            title: 'talent_name.weapon_calamity_queller',
            description: 'talent_descr.weapon_calamity_queller_3',
        }),
        new ConditionStacksHidden({
            name: 'weapon_calamity_queller',
            maxStacks: weaponPassiveTables.CalamityQueller.p4[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.CalamityQueller.p3)),
            ],
            subConditions: [
                new ConditionBoolean({name: 'weapon_calamity_queller_off_field'}),
            ],
        }),
    ],
});
