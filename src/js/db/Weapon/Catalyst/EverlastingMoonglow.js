import { ConditionStatic } from "../../../classes/Condition/Static";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { FeatureMultiplierTarget } from "../../../classes/Feature2/Multiplier/Target";
import { StatTable } from "../../../classes/StatTable";
import { ValueTable } from "../../../classes/ValueTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const EverlastingMoonglow = new DbObjectWeapon({
    name: 'everlasting_moonglow',
    serializeId: 108,
    gameId: 14506,
    iconClass: "weapon-icon-catalyst-everlasting-moonglow",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.EverlastingMoonglow,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_everlasting_moonglow',
            description: 'talent_descr.weapon_everlasting_moonglow_1',
            stats: [
                new StatTable('healing', weaponPassiveTables.EverlastingMoonglow.healing),
                new StatTable('normal_base_hp_percent', percent(weaponPassiveTables.EverlastingMoonglow.p2)),
            ],
        }),
        new ConditionStatic({
            title: 'talent_name.weapon_everlasting_moonglow',
            description: 'talent_descr.weapon_everlasting_moonglow_2',
        }),
    ],
    multipliers: [
        new FeatureMultiplier({
            scaling: 'hp*',
            leveling: 'weapon_refine',
            source: 'weapon',
            values: new ValueTable(percent(weaponPassiveTables.EverlastingMoonglow.p2)),
            target: new FeatureMultiplierTarget({
                damageTypes: ['normal'],
            }),
        }),
    ],
});

