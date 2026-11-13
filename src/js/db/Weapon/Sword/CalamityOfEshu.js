import { ConditionShielded } from "../../../classes/Condition/Field";
import { ConditionRetired } from "../../../classes/Condition/Retired";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const CalamityOfEshu = new DbObjectWeapon({
    name: 'calamity_of_eshu',
    serializeId: 191,
    gameId: 11432,
    iconClass: "weapon-icon-sword-calamity-of-eshu",
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.CalamityOfEshu,
    conditions: [
        // Shield state follows the team's on-field shield.
        new ConditionRetired({serializeId: 1, type: 'checkbox'}),
        new ConditionStaticRefine({
            title: 'talent_name.calamity_of_eshu',
            description: 'talent_descr.calamity_of_eshu',
            stats: [
                new StatTable('dmg_normal', percent(weaponPassiveTables.CalamityOfEshu.p1)),
                new StatTable('dmg_charged', percent(weaponPassiveTables.CalamityOfEshu.p1)),
                new StatTable('crit_rate_normal', percent(weaponPassiveTables.CalamityOfEshu.p2)),
                new StatTable('crit_rate_charged', percent(weaponPassiveTables.CalamityOfEshu.p2)),
            ],
            subConditions: [
                new ConditionShielded(),
            ],
        }),
    ],
});
