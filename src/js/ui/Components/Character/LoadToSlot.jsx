import React from 'react';
import "../../../../css/Components/Char/LoadToSlot.css"

import { TEAM_SIZE, Team } from '../../../classes/Team';
import { Lang } from '../../Lang';

let lang = new Lang();

/**
 * Buttons that load a build into the team, one per slot: a list of builds (a
 * showcase, the saved characters) fills a whole team without a slot selected
 * first. Only the character is loaded (see loadFullButton for the rest of a
 * saved build). An empty slot is filled at once; replacing a member asks
 * first. A character is in one slot only, so a build of a member's character
 * can only replace that member: its other buttons are off.
 *
 * @param {Object} props app; build (CalcSet); onLoad, called after a load,
 *     for a list the app's refresh does not reach (a modal)
 */
export function LoadToSlot(props) {
    let app = props.app;
    let team = app.getTeam();
    let charId = props.build.char.getId();
    let own = team.getMembers().find((member) => member.char.getId() == charId);
    let buttons = [];

    for (let slot = 0; slot < TEAM_SIZE; ++slot) {
        let member = team.getMember(slot);
        let disabled = !!own && own !== member;

        let classes = ['load-to-slot-button'];
        if (!member) classes.push('empty');
        if (own && own === member) classes.push('own');
        if (disabled) classes.push('disabled');

        let tooltip = lang.get('team.load_other_slot');
        if (!disabled) {
            let now = member ? lang.get('team.slot_now') + ': ' + lang.get(member.char.object.getName()) : lang.get('team.slot_empty');
            tooltip = lang.get('team.load_to_slot') + ' ' + (slot + 1) + ' (' + now + ')';
        }

        buttons.push(
            <div
                key={slot}
                className={classes.join(' ')}
                data-tooltip={tooltip}
                onClick={disabled ? undefined : () => loadToSlot(app, slot, props.build, props.onLoad)}
            >{slot + 1}</div>
        );
    }

    return (
        <div className="load-to-slot">
            <div className="load-to-slot-caption">{lang.get('team.slot')}</div>
            <div className="load-to-slot-buttons">{buttons}</div>
        </div>
    );
}

/**
 * @param {App} app
 * @param {number} slot
 * @param {CalcSet} build
 * @param {function} [onLoad]
 */
function loadToSlot(app, slot, build, onLoad) {
    let load = () => {
        app.fillSlot(slot, build);
        if (onLoad) onLoad();
    };

    if (app.getTeam().getMember(slot)) {
        UI.ConfirmWindow.show('modal.confirm', 'team.confirm_replace', load);
    } else {
        load();
    }
}

/**
 * Whether the team of a saved build has beta content, by build: a list asks
 * on every render, and the answer takes making the team.
 */
const betaTeams = new WeakMap();

/**
 * @param {App} app
 * @param {CalcSet} build
 * @returns {boolean} whether the build holds more than its character and
 *     App.loadSavedTeam loads it
 */
function canLoadFull(app, build) {
    if (!build.legacyTeam && !build.team) {
        return false;
    }
    if (app.showBetaContent()) {
        return true;
    }

    if (!betaTeams.has(build)) {
        betaTeams.set(build, Team.solo(build).team.hasBetaContent());
    }
    return !betaTeams.get(build);
}

/**
 * The button of a list of saved builds that loads a build in full: a build
 * saved with additional buffs, or by the released calculator, starts a new
 * team with what it holds besides its character, its enemy and its
 * additional buffs (App.loadSavedTeam). A build that holds only its
 * character has no such button: it is loaded into a slot.
 *
 * @param {App} app
 * @param {function} [onLoad] called after a load, as LoadToSlot's
 * @returns {Object} a button of CharInfo
 */
export function loadFullButton(app, onLoad) {
    return {
        icon: 'icon-load',
        tooltip: lang.get('team.load_full'),
        visible: (build) => canLoadFull(app, build),
        callback: (build) => UI.ConfirmWindow.show('modal.confirm', 'team.confirm_load_full', () => {
            app.loadSavedTeam(build);
            if (onLoad) onLoad();
        }),
    };
}
