import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const Emberwell = new DbObjectWeapon({
    name: 'emberwell',
    serializeId: 247,
    gameId: 11436,
    iconClass: 'weapon-icon-sword-emberwell',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.Emberwell,
    conditions: [
        new ConditionBooleanRefine({
            name: 'weapon_emberwell_reaction',
            serializeId: 1,
            title: 'talent_name.weapon_emberwell',
            description: 'talent_descr.weapon_emberwell_1',
            stats: [
                new StatTable('atk_percent', [16, 20, 24, 28, 32]),
            ],
        }),
        new ConditionBooleanRefine({
            name: 'weapon_emberwell_stellarglimmer',
            serializeId: 2,
            title: 'talent_name.weapon_emberwell',
            description: 'talent_descr.weapon_emberwell_2',
            stats: [
                new StatTable('dmg_stellarglimmer', [16, 20, 24, 28, 32]),
            ],
        }),
    ],
});
