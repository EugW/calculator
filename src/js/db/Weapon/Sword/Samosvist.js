import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";

function attention(stats) {
    return [new ConditionStaticRefine({stats})];
}

export const Samosvist = new DbObjectWeapon({
    name: 'samosvist',
    serializeId: 260,
    gameId: 11522,
    iconClass: 'weapon-icon-sword-samosvist',
    rarity: 5,
    weapon: 'sword',
    statTable: weaponStatTables.Samosvist,
    beta: true,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_samosvist',
            description: 'talent_descr.weapon_samosvist',
            stats: [
                new StatTable('text_percent_blazing', [48, 62, 76, 90, 104]),
                new StatTable('text_percent_dazzling', [28, 35, 42, 49, 56]),
                new StatTable('text_number_radiant', [3, 3.5, 4, 4.5, 5]),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_samosvist_attention',
            serializeId: 1,
            title: 'talent_name.weapon_samosvist_attention',
            description: 'talent_descr.weapon_samosvist_attention',
            dropdownClass: 'medium-text',
            hideEmpty: true,
            defaultValue: '-',
            values: [
                {
                    title: '-',
                    value: '-',
                    serializeId: 4,
                    conditions: [],
                },
                {
                    title_str: 'talent_name.weapon_samosvist_blazing',
                    value: 'blazing',
                    serializeId: 1,
                    conditions: attention([
                        new StatTable('crit_dmg', [48, 62, 76, 90, 104]),
                    ]),
                },
                {
                    title_str: 'talent_name.weapon_samosvist_dazzling',
                    value: 'dazzling',
                    serializeId: 2,
                    conditions: attention([
                        new StatTable('dmg_stellarswirl', [28, 35, 42, 49, 56]),
                    ]),
                },
                {
                    title_str: 'talent_name.weapon_samosvist_radiant',
                    value: 'radiant',
                    serializeId: 3,
                    conditions: attention([
                        new StatTable('text_number_energy', [3, 3.5, 4, 4.5, 5]),
                    ]),
                },
            ],
        }),
    ],
});
