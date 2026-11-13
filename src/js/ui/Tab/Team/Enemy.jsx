import React from 'react';

import { ConditionList } from '../../Components/ConditionList';
import { EnemyIcon } from '../../Components/Icons';
import { NumberInput } from '../../Components/Inputs/Input';
import { Slider } from '../../Components/Inputs/Slider';
import { ResistanceBlock } from '../../Components/ResistanceBlock';
import { CustomEnemy } from './CustomEnemy';

const MAX_LEVEL = 110;

/**
 * The team's enemy: its choice, level, resistances and conditions. The enemy
 * is team state, so it is read and changed on the team, not through a member.
 * Its total resistances include every member's RES reductions, as the team's
 * evaluation resolves them.
 *
 * @param {{app: App, lang: Lang}} props
 */
export function TeamEnemy(props) {
    let app = props.app;
    let lang = props.lang;
    let team = app.getTeam();
    let enemy = team.enemy;

    let view = app.view();
    let resolved = view.getEnemy();
    // The enemy's conditions show the enemy's state; whether one is shown
    // may depend on the viewed member (weak spot shots are for bows).
    let conditionSettings = Object.assign(view.getSettings(), resolved.settings);

    return (
        <div className="team-enemy-content">
            <EnemyHeader
                enemy={enemy}
                lang={lang}
                onSelect={() => selectEnemy(app)}
                onLevelChange={(level) => app.setEnemyLevels({level})}
            />
            <CustomEnemy
                hidden={!!enemy.object}
                resistances={enemy.getResistances()}
                onResistanceChange={(element, value) => {
                    app.setEnemyResistances(Object.assign({}, enemy.getResistances(), {[element]: value}));
                }}
            />
            <ResistanceBlock
                title={lang.get('object_view.total_resistance')}
                stats={resolved.stats}
                settings={resolved.settings}
            />
            <ConditionList
                items={enemy.getConditions()}
                settings={conditionSettings}
                onChange={(name, value) => app.setEnemySettings({[name]: value})}
            />
        </div>
    );
}

/**
 * The enemy (its icon opens the choice), then its level: the number on the
 * line of the name, the slider on a line of its own.
 */
function EnemyHeader(props) {
    let enemy = props.enemy;
    let lang = props.lang;
    let level = enemy.getLevels().level;

    return (
        <div className="team-enemy-header">
            <EnemyIcon size={60} enemy={enemy.object} onClick={props.onSelect} addClass="team-enemy-icon" />
            <div className="team-enemy-info">
                <div className="team-enemy-name" data-tooltip={lang.get(enemyName(enemy))}>{lang.get(enemyName(enemy))}</div>
                <div className="team-enemy-level">
                    <span>{lang.get('object_view.level')}</span>
                    <NumberInput
                        minValue={1}
                        maxValue={MAX_LEVEL}
                        nonEmpty={true}
                        value={level}
                        onChange={props.onLevelChange}
                        addClass="team-enemy-level-input"
                    />
                </div>
                <Slider min={1} max={MAX_LEVEL} value={level} onChange={props.onLevelChange} />
            </div>
        </div>
    );
}

function enemyName(enemy) {
    return enemy.object ? enemy.object.getName() : 'modal_window.enemy_custom';
}

/**
 * The caption of the collapsed section: the enemy and its level. A long name
 * is cut; the level always shows.
 *
 * @param {{team: Team, lang: Lang}} props
 */
export function TeamEnemyTitle(props) {
    let enemy = props.team.enemy;
    let lang = props.lang;

    return (
        <span className="team-enemy-title">
            <span className="team-enemy-title-name">{lang.get('tab_header.enemy') + ': ' + lang.get(enemyName(enemy))}</span>
            <span className="team-enemy-title-level">{'· ' + lang.get('team.level') + ' ' + enemy.getLevels().level}</span>
        </span>
    );
}

function selectEnemy(app) {
    let enemy = app.getTeam().enemy.object;

    UI.EnemySelectReact.show({
        selectedId: enemy ? enemy.getId() : 0,
        callback: (item) => app.setEnemy(item || null),
    });
}
