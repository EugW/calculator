import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureHeal } from "../../../classes/Feature2/Heal";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const PrototypeAmber = new DbObjectWeapon({
    name: 'prototype_amber',
    serializeId: 53,
    gameId: 14406,
    iconClass: "weapon-icon-catalyst-prototype-amber",
    rarity: 4,
    weapon: 'catalyst',
    statTable: weaponStatTables.PrototypeAmber,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_prototype_amber',
            description: 'talent_descr.weapon_prototype_amber',
            stats: [
                new StatTable('text_decimal', weaponPassiveTables.PrototypeAmber.p3),
                new StatTable('text_percent', percent(weaponPassiveTables.PrototypeAmber.p4)),
            ],
        }),
    ],
    features: [
        new FeatureHeal({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    scaling: 'hp*',
                    leveling: 'weapon_refine',
                    values: new StatTable('prototype_amber_heal', percent(weaponPassiveTables.PrototypeAmber.p4)),
                }),
            ],
        }),
    ],
});
