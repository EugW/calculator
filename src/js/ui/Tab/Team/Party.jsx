import React from 'react';

import { ConditionList } from '../../Components/ConditionList';

/**
 * Party setup: the resonances and other effects of the team's composition,
 * and the team toggles (the on-field shield, Polestar Field, the Ascendant
 * Gleam source...). The toggles are team state, so they are changed on the
 * team, not through a member. Whether an effect applies can depend on the
 * member (a shield protects only the on-field one): that part is the viewed
 * member's evaluation of the team.
 *
 * @param {{app: App}} props
 */
export function TeamParty(props) {
    let settings = viewedSettings(props.app);

    return (
        <ConditionList
            items={partyConditions()}
            settings={settings}
            onChange={(name, value) => props.app.modifyTeamSettings({[name]: value})}
        />
    );
}

/**
 * "Party setup", with the number of effects that are on.
 *
 * @param {{app: App, lang: Lang}} props
 */
export function TeamPartyTitle(props) {
    let title = props.lang.get('team.party');
    let count = countActive(partyConditions(), viewedSettings(props.app));
    return count ? `${title} (${count})` : title;
}

function partyConditions() {
    return DB.Buffs.get('ElementalResonance').getConditions();
}

function viewedSettings(app) {
    return app.view().getPartySettings();
}

/**
 * @param {Array.<Condition>} conditions
 * @param {Object} settings
 * @returns {number} shown effects that are on, not counting descriptions
 */
function countActive(conditions, settings) {
    let result = 0;

    for (const cond of conditions) {
        if (cond.isHidden(settings)) {
            continue;
        }

        let type = cond.getType();
        if (!type || type == 'static' || type == 'number' && !cond.params.countable) {
            continue;
        }

        if (cond.isActive(settings)) {
            ++result;
        }
    }

    return result;
}
