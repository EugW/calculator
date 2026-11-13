import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionHexereiResonance } from "../../../classes/Condition/HexereiResonance";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { StatTableConditions } from "../../../classes/StatTable/Condition";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

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
            maxStacks: weaponPassiveTables.GestOfTheMightyWolf.p5[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_all', percent(weaponPassiveTables.GestOfTheMightyWolf.p2)),
                new StatTable('crit_dmg_ui', percent(weaponPassiveTables.GestOfTheMightyWolf.p3)),
                new StatTableConditions('crit_dmg', percent(weaponPassiveTables.GestOfTheMightyWolf.p3), [
                    new ConditionHexereiResonance()
                ]),
            ],
        })
    ],
    partyConditions: [
        
    ],
});
