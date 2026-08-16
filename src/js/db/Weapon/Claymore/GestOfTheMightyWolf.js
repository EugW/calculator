import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { StatTableConditions } from "../../../classes/StatTable/Condition";
import { weaponStatTables } from "../../generated/WeaponStatTables";

export const GestOfTheMightyWolf = new DbObjectWeapon({
    name: 'gest_of_the_mighty_wolf',
    serializeId: 241,
    gameId: 12515,
    iconClass: "weapon-icon-claymore-gest-of-the-mighty-wolf",
    rarity: 5,
    weapon: 'claymore',
    statTable: weaponStatTables.GestOfTheMightyWolf,
    conditions: [
        new ConditionStacks({
            name: 'weapon_gest_of_the_mighty_wolf',
            serializeId: 1,
            title: 'talent_name.weapon_gest_of_the_mighty_wolf',
            description: 'talent_descr.weapon_gest_of_the_mighty_wolf',
            maxStacks: 4,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_all', [7.5, 9.5, 11.5, 13.5, 15.5]),
                new StatTable('crit_dmg_ui', [7.5, 9.5, 11.5, 13.5, 15.5]),
                new StatTableConditions('crit_dmg', [7.5, 9.5, 11.5, 13.5, 15.5], [
                    new ConditionHexereiResonance()
                ]),
            ],
        })
    ],
    partyConditions: [
        
    ],
});
