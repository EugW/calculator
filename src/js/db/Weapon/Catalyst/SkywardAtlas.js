import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { FeatureDamage } from "../../../classes/Feature2/Damage";
import { FeatureMultiplier } from "../../../classes/Feature2/Multiplier";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const SkywardAtlas = new DbObjectWeapon({
    name: 'skyward_atlas',
    serializeId: 44,
    gameId: 14501,
    iconClass: "weapon-icon-catalyst-skyward-atlas",
    rarity: 5,
    weapon: 'catalyst',
    statTable: weaponStatTables.SkywardAtlas,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_skyward_atlas',
            description: 'talent_descr.weapon_skyward_atlas',
            stats: [
                new StatTable('dmg_anemo', percent(weaponPassiveTables.SkywardAtlas.p1)),
                new StatTable('dmg_geo', percent(weaponPassiveTables.SkywardAtlas.p1)),
                new StatTable('dmg_pyro', percent(weaponPassiveTables.SkywardAtlas.p1)),
                new StatTable('dmg_electro', percent(weaponPassiveTables.SkywardAtlas.p1)),
                new StatTable('dmg_hydro', percent(weaponPassiveTables.SkywardAtlas.p1)),
                new StatTable('dmg_cryo', percent(weaponPassiveTables.SkywardAtlas.p1)),
                new StatTable('dmg_dendro', percent(weaponPassiveTables.SkywardAtlas.p1)),
            ],
        }),
    ],
    features: [
        new FeatureDamage({
            category: 'weapon',
            multipliers: [
                new FeatureMultiplier({
                    leveling: 'weapon_refine',
                    values: new StatTable('skyward_atlas_cloud', percent(weaponPassiveTables.SkywardAtlas.p3)),
                }),
            ],
        }),
    ],
});

