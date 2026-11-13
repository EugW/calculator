import { ConditionBooleanRefine } from "../../../classes/Condition/Boolean/Refine";
import { ConditionBoolean } from "../../../classes/Condition/Boolean";
import { ConditionAnd } from "../../../classes/Condition/And";
import { ConditionDropdownTeamMember } from "../../../classes/Condition/Dropdown/TeamMember";
import { ConditionSelectedReceiver } from "../../../classes/Condition/SelectedReceiver";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { RECEIVERS } from "../../../classes/Team/Receivers";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

export const ThrillingTales = new DbObjectWeapon({
    name: 'thrilling_tales_of_dragon_slayers',
    serializeId: 58,
    gameId: 14302,
    iconClass: "weapon-icon-catalyst-thrilling-tales-of-dragon-slayers",
    rarity: 3,
    weapon: 'catalyst',
    statTable: weaponStatTables.ThrillingTalesofDragonSlayers,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_thrilling_tales',
            description: 'talent_descr.weapon_thrilling_tales',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.ThrillingTalesofDragonSlayers.p1)),
            ],
        }),
        // Heritage: the new character taking the field has their ATK
        // increased. Reapplying this buff does not stack it (Gameplay Notes):
        // https://genshin-impact.fandom.com/wiki/Thrilling_Tales_of_Dragon_Slayers
        new ConditionBooleanRefine({
            name: 'weapon_thrilling_tales',
            serializeId: 1,
            title: 'talent_name.weapon_thrilling_tales',
            description: 'talent_descr.weapon_thrilling_tales',
            stats: [
                new StatTable('text_percent', percent(weaponPassiveTables.ThrillingTalesofDragonSlayers.p1)),
            ],
        }),
        new ConditionDropdownTeamMember({
            name: 'weapon_thrilling_tales_receiver',
            serializeId: 2,
            othersOnly: true,
            title: 'buffs_name.selected_receiver',
            description: 'buffs_descr.selected_receiver',
        }),
        new ConditionStaticRefine({
            isHidden: true,
            receivers: RECEIVERS.OTHERS,
            stack: 'thrilling_tales',
            stackScope: 'receiver',
            condition: new ConditionAnd([
                new ConditionBoolean({name: 'weapon_thrilling_tales'}),
                new ConditionSelectedReceiver({name: 'weapon_thrilling_tales_receiver'}),
            ]),
            stats: [
                new StatTable('atk_percent', percent(weaponPassiveTables.ThrillingTalesofDragonSlayers.p1)),
            ],
        }),
    ],
});

