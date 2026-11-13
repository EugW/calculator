import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const Verdict = new DbObjectWeapon({
    name: 'verdict',
    serializeId: 168,
    gameId: 12512,
    iconClass: "weapon-icon-claymore-verdict",
    rarity: 5,
    weapon: 'claymore',
    statTable: weaponStatTables.Verdict,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_verdict',
            description: 'talent_descr.weapon_verdict_1',
            stats: [
                new StatTable('atk_percent', weaponPassiveTables.Verdict.atk_percent),
            ],
        }),
        new ConditionStacks({
            name: 'weapon_verdict',
            serializeId: 1,
            title: 'talent_name.weapon_verdict',
            description: 'talent_descr.weapon_verdict_2',
            maxStacks: 2,
            levelSetting: 'weapon_refine',
            stats: [
                new StatTable('dmg_skill', percent(weaponPassiveTables.Verdict.p1)),
            ],
        })
    ],
});


