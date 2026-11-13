import { Condition } from "../../../classes/Condition";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const MegaMagicSword = new DbObjectWeapon({
    name: 'ultimate_overlords_mega_magic_sword',
    serializeId: 167,
    gameId: 12426,
    iconClass: 'weapon-icon-claymore-ultimate-overlords-mega-magic-sword',
    rarity: 4,
    weapon: 'claymore',
    statTable: weaponStatTables.MegaMagicSword,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_ultimate_overlords_mega_magic_sword',
            description: 'talent_descr.weapon_ultimate_overlords_mega_magic_sword_1',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.MegaMagicSword.atk_percent),
            ],
        }),
        new Condition({serializeId: 1}),
        new ConditionStacks({
            name: 'weapon_ultimate_overlords_mega_magic_sword',
            serializeId: 2,
            title: 'talent_name.weapon_ultimate_overlords_mega_magic_sword',
            description: 'talent_descr.weapon_ultimate_overlords_mega_magic_sword_2',
            maxStacks: 12,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('atk_percent', [1, 1.25, 1.5, 1.75, 2]),
                new StatTable('text_percent', percent(weaponPassiveTables.MegaMagicSword.p3)),
            ],
        }),
    ],
});
