import { ConditionBooleanDropdownValue } from "../../../classes/Condition/Boolean/DropdownValue";
import { ConditionDropdown } from "../../../classes/Condition/Dropdown";
import { ConditionStacks } from "../../../classes/Condition/Stacks";
import { ConditionStaticRefine } from "../../../classes/Condition/Static/Refine";
import { DbObjectWeapon } from "../../../classes/DbObject/Weapon";
import { StatTable } from "../../../classes/StatTable";
import { StatTableConditions } from "../../../classes/StatTable/Condition";
import { weaponStatTables } from "../../generated/WeaponStatTables";
import { weaponPassiveTables } from "../../generated/WeaponPassiveTables";
import { percent } from "../../Params";

const normalMode = new ConditionBooleanDropdownValue({
    name: 'weapon_new_bough_mode',
    value: 'normal',
    defaultValue: 'normal',
});
const radianceMode = new ConditionBooleanDropdownValue({
    name: 'weapon_new_bough_mode',
    value: 'radiance',
});

export const NewBough = new DbObjectWeapon({
    name: 'new_bough',
    serializeId: 258,
    gameId: 11437,
    iconClass: 'weapon-icon-sword-new-bough',
    rarity: 4,
    weapon: 'sword',
    statTable: weaponStatTables.NewBough,
    conditions: [
        new ConditionStaticRefine({
            title: 'talent_name.weapon_new_bough',
            description: 'talent_descr.weapon_new_bough',
            stats: [
                new StatTable('text_percent_normal_atk', percent(weaponPassiveTables.NewBough.p4)),
                new StatTable('text_number_normal_mastery', weaponPassiveTables.NewBough.p6),
                new StatTable('text_percent_radiance_atk', percent(weaponPassiveTables.NewBough.p5)),
                new StatTable('text_percent_radiance_dmg', percent(weaponPassiveTables.NewBough.p7)),
            ],
        }),
        new ConditionDropdown({
            name: 'weapon_new_bough_mode',
            serializeId: 1,
            title: 'talent_name.weapon_new_bough_mode',
            defaultValue: 'normal',
            values: [
                {
                    title_str: 'talent_name.weapon_new_bough_normal',
                    value: 'normal',
                    serializeId: 1,
                    conditions: [],
                },
                {
                    title_str: 'talent_name.n11500004',
                    value: 'radiance',
                    serializeId: 2,
                    conditions: [],
                },
            ],
        }),
        new ConditionStacks({
            name: 'weapon_new_bough_stacks',
            serializeId: 2,
            title: 'talent_name.weapon_new_bough_stacks',
            description: 'talent_descr.weapon_new_bough_stacks',
            maxStacks: weaponPassiveTables.NewBough.p3[0],
            levelSetting: 'weapon_refine',
            stats: [
                new StatTableConditions('atk_percent', percent(weaponPassiveTables.NewBough.p4), [normalMode]),
                new StatTableConditions('mastery', weaponPassiveTables.NewBough.p6, [normalMode]),
                new StatTableConditions('atk_percent', percent(weaponPassiveTables.NewBough.p5), [radianceMode]),
                new StatTableConditions('dmg_stellarconduct', percent(weaponPassiveTables.NewBough.p7), [radianceMode]),
                new StatTableConditions('dmg_stellarswirl', percent(weaponPassiveTables.NewBough.p7), [radianceMode]),
            ],
        }),
    ],
});
