import $ from "jquery";

import {Artifact} from "../../classes/Artifact"
import {describeManualProvenance} from "../../classes/ArtifactMetadata"
import {Window} from "../Window"

import "../../../css/modal/ArtifactWindow.css"
import { artifactInitialRollOptions, artifactRollCounts, artifactRollDraft } from "../../classes/ArtifactRollDraft";
import { Stats } from "../../classes/Stats";

export class ArtifactWindow extends Window{
    constructor() {
        super();
        this.initialized = 0;
        this.activeSlot = '';
        this.rarity = 1;
        this.level = 0;
        this.mainStat = '';
        this.setName = '';
        this.substats = [
            {stat: '', value: 0},
            {stat: '', value: 0},
            {stat: '', value: 0},
            {stat: '', value: 0},
        ];
        this.groups = [];
        this.groupsList = [];
        this.initialLines = null;
        this.fourthInactive = false;
        this.marked = false;
        this.initialRolls = {};
    }

    init() {
        if (this.initialized) {
            return;
        }

        super.init();

        this.root.addClass('gi-artifact-window');
        this.back.addClass('gi-artifact-window-back');

        let html = '';
        // html += '<div class="gi-modal-caption">Создание артефакта</div>';

        // Slots, rarity and set line
        html += '<div class="gi-modal-art-line">';

        for (let slot of DB.Artifacts.Slots.getKeys()) {
            html += '<div class="gi-modal-type '+ slot +'" data-slot="'+ slot +'"></div>';
        }

        html += '<div class="gi-modal-set-icon flower"></div>';

        html += '<div class="gi-artifact-window-stars">';
        for (let i = 1; i <= 5; ++i) {
            html += '<div class="gi-artifact-window-star" data-rarity="'+ i +'"></div>';
        }
        html += '</div>';

        html += '<div class="gi-artifact-window-level">';
        html += '<input class="gi-artifact-slider-level" type="range">';
        html += '<div class="gi-artifact-window-level-value"></div>';
        html += '</div>';

        html += '<div class="gi-artifact-window-group-wrapper"><div class="gi-artifact-window-group"></div>';
        html += '<div class="gi-artifact-window-group-add">';
        html += `<div class="gi-artifact-window-group-add-button" data-tooltip="${UI.Lang.get('artifact_group.add')}"></div>`;
        html += '</div></div>';

        html += '</div>';

        html += '<div class="gi-modal-set-line hidden">';

        for (let setName of DB.Artifacts.Sets.getKeys()) {
            let setData = DB.Artifacts.Sets.get(setName);
            let imgClass = setData.getImage();

            html += '<div class="gi-artifact-set" data-set="'+ setName +'">';
            html += '<div class="gi-artifact-set-icon flower '+ imgClass +'"></div>';
            html += '<div class="gi-artifact-set-name">'+ UI.Lang.get(setData.getName()) +'</div>';
            html += '</div>';
        }
        html += '</div><div class="gi-hr"></div><div class="gi-artifact-stats">';

        // Main stats
        html += '<div class="gi-modal-mainstat-line '+ this.activeSlot +'">';
        for (let stat of DB.Artifacts.Mainstats.getKeys()) {
            let statSlots = DB.Artifacts.Mainstats.get(stat).slots;

            html += '<div class="gi-modal-mainstat-item '+ statSlots.join(' ') + ' ' + stat + '" data-stat="'+ stat +'">';
            html += UI.Lang.get('stat_short.'+ stat) +'</div>';
        }
        html += '</div>';

        html += '<div class="gi-hr"></div><div class="gi-artifact-provenance">';
        html += '<label class="gi-artifact-mark-label" title="'+ UI.Lang.get('artifact_view.elixir_hint') +'">';
        html += '<input type="checkbox" class="gi-artifact-mark-switch">';
        html += '<span class="gi-artifact-mark-track" aria-hidden="true"></span>';
        html += UI.Lang.get('artifact_view.elixir');
        html += '<span class="gi-artifact-mark-unknown">('+ UI.Lang.get('artifact_view.unknown') +')</span></label></div>';
        html += '<div class="gi-modal-substat-lines">';

        for (let i = 1; i <= 4; ++i) {
            html += '<div class="gi-modal-substat-line slot-'+ i +'" data-slot="'+ i +'"><div class="gi-modal-substat-stats">';

            html += '<div class="gi-modal-substat-item gi-modal-substat-item-none" data-stat="">'+ UI.Lang.get('stat_short.none') +'</div>';
            for (let stat of DB.Artifacts.Substats.getKeys()) {
                html += '<div class="gi-modal-substat-item" data-stat="'+ stat +'">'+ UI.Lang.get('stat_short.'+ stat) +'</div>';
            }
            html += '</div>';

            html += '<div class="gi-modal-substat-value-wrapper">';
            html += '<div class="gi-modal-substat-value"><input type="text" value="" class="gi-inputs-number-input">';
            html += '<div class="gi-modal-substat-value-slider"><input class="gi-artifact-substat-slider" type="range"></div></div>';
            html += '<button type="button" class="gi-modal-substat-toggle"></button>';
            html += '<div class="gi-modal-substat-value-rolls"></div>';

            html += '</div></div>';
        }

        html += '<div class="gi-modal-line-error"></div>';
        html += '</div><div class="gi-hr"></div>';

        html += '<div class="gi-modal-buttons"><div class="gi-inputs-button modal-save"><span class="gi-inputs-button-icon button-icon-ok">';
        html += '</span>'+ UI.Lang.get('modal_buttons.save') +'</div>';
        html += '<div class="gi-inputs-button modal-close"><span class="gi-inputs-button-icon button-icon-cancel">';
        html += '</span>'+ UI.Lang.get('modal_buttons.cancel') +'</div></div>';

        html += '</div>';

        this.appendContent(html);

        this.bindEvents();

        this.setRarity(4);
        this.setLevel(0);
        this.setSlot('');
        this.setMainstat('');
        this.setSet('');

        this.initialized = 1;
    }

    setRarity(value) {
        const previous = this.rarity;
        this.rarity = value;

        let minRarity = 1;
        let maxRarity = 5;

        let setData = DB.Artifacts.Sets.get(this.setName);

        if (setData) {
            minRarity = setData.minRarity;
            maxRarity = setData.maxRarity;
        }

        if (this.rarity < minRarity) {
            this.rarity = minRarity;
        } else if (this.rarity > maxRarity) {
            this.rarity = maxRarity;
        }

        if (this.rarity !== previous) {
            this.initialRolls = {};
            if (this.rarity !== 5) this.marked = false;
        }
        let rarityInfo = DB.Artifacts.Rarity[this.rarity-1];
        let stars = this.rarity;

        this.root.find('.gi-artifact-window-star').each(function() {
            if (stars > 0) {
                $(this).addClass('active');
            } else {
                $(this).removeClass('active');
            }

            --stars;
        });

        this.root.find('.gi-modal-substat-line').each(function() {
            if ($(this).data('slot') > rarityInfo.maxSubstats) {
                $(this).hide();
            } else {
                $(this).show();
            }
        });

        this.root.find('.gi-artifact-slider-level').giSlider('range', 0, rarityInfo.maxLevel);
        this.setLevel(this.level);

        this.refreshSubstats();
        this.refreshProvenance();
        this.refreshError();
    }

    setLevel(value) {
        let maxLevel = DB.Artifacts.Rarity[this.rarity-1].maxLevel;

        if (value < 0) {
            this.level = 0;
        } else if (value > maxLevel) {
            this.level = maxLevel;
        } else {
            this.level = parseInt(value);
        }

        this.root.find('.gi-artifact-window-level-value').text('+'+ this.level);
        this.refreshProvenance();
        this.refreshError();
    }

    setSlot(value) {
        if (DB.Artifacts.Slots.get(value)) {
            this.activeSlot = value;
        } else {
            this.activeSlot = DB.Artifacts.Slots.getFirstId();
        }

        if (this.mainStat) {
            let allowed = DB.Artifacts.Slots.get(this.activeSlot).mainStats;
            if (!allowed.includes(this.mainStat)) {
                this.setMainstat('');
            }
        }

        this.root.find('.gi-modal-type').removeClass('active');
        this.root.find('.gi-modal-type.'+ this.activeSlot).addClass('active');

        this.root.find('.gi-modal-mainstat-item').hide();
        this.root.find('.gi-modal-mainstat-item.'+ this.activeSlot).show();

        this.refreshError();
    }

    setMainstat(value) {
        if (DB.Artifacts.Mainstats.get(value)) {
            this.mainStat = value;
        }

        let allowed = DB.Artifacts.Slots.get(this.activeSlot).mainStats;
        if (!allowed.includes(this.mainStat)) {
            this.mainStat = allowed[0];
        }

        this.root.find('.gi-modal-mainstat-item').removeClass('active');
        this.root.find('.gi-modal-mainstat-item.'+ this.mainStat).addClass('active');

        this.root.find('.gi-modal-substat-item').removeClass('disabled');
        this.root.find('.gi-modal-substat-item[data-stat="'+ this.mainStat +'"]').addClass('disabled');
        this.root.find('.gi-modal-substat-item.disabled').removeClass('active');

        this.refreshError();
    }

    setSubstatStat(slot, stat) {
        if (slot >= 1 && slot <= 4) {
            const previous = this.substats[slot-1].stat;
            if (previous !== stat) delete this.initialRolls[previous];
            this.substats[slot-1].stat = stat;

            this.root.find('.gi-modal-substat-line.slot-'+ slot +' .gi-modal-substat-item').removeClass('active');
            this.root.find('.gi-modal-substat-line.slot-'+ slot +' .gi-modal-substat-item[data-stat="'+ stat +'"]').addClass('active');
            this.root.find('.gi-modal-substat-line.slot-'+ slot +' .gi-inputs-number-input').data('stat', stat);

            this.refreshSubstats(slot);

            this.refreshProvenance();
        }

        this.refreshError();
    }

    resetProvenance() {
        this.initialLines = null;
        this.fourthInactive = false;
        this.marked = false;
        this.initialRolls = {};
    }

    // Known first rolls: locked by the user, or a line that holds a single roll.
    getInitialRolls() {
        const initials = {};
        for (const row of this.substats) {
            if (!row.stat) continue;
            const value = artifactRollDraft(row.stat, this.rarity, row.value, this.initialRolls[row.stat]).initialValue;
            if (value !== undefined) initials[row.stat] = value;
        }
        return initials;
    }

    getProvenanceForm() {
        const initials = this.getInitialRolls();
        const active = this.getActiveStats();
        const source = this.sourceArtifact?.getMetadata() || {};
        return {
            // Below +4 the active lines are the start. From +4 a known start is kept,
            // otherwise the first rolls settle it when they can.
            lines: this.level < 4 ? active.length : this.initialLines ?? this.getAutoInitialLines(active, initials),
            crafted: this.marked ?? source.elixirCrafted,
            pair: this.marked === true ? this.substats.slice(0, 2).map(row => row.stat)
                : this.marked === false ? [] : source.definedSubstats,
            initials,
        };
    }

    refreshProvenance() {
        let low = Math.max(0, this.rarity - 2);
        let high = Math.max(0, this.rarity - 1);

        if (this.initialLines !== null && (this.initialLines < low || this.initialLines > high)) {
            this.initialLines = null;
        }

        this.root.find('.gi-artifact-mark-switch').prop('checked', this.marked === true)
            .prop('indeterminate', this.marked === undefined).prop('disabled', this.rarity !== 5);
        this.root.find('.gi-artifact-mark-unknown').toggle(this.marked === undefined);

        // Below +4 a 5★ shows its 4th line before it activates, as the game does.
        const canToggle = this.canToggleFourth();
        const inactive = canToggle && this.fourthInactive;
        this.root.find('.gi-modal-substat-line.slot-4 .gi-modal-substat-toggle').toggle(canToggle)
            .toggleClass('inactive', inactive)
            .text(UI.Lang.get(inactive ? 'artifact_view.substat_inactive' : 'artifact_view.substat_active'));
        for (let slot = 1; slot <= 4; ++slot) {
            const row = this.root.find('.gi-modal-substat-line.slot-' + slot);
            row.toggleClass('inactive', inactive && slot === 4);
            row.toggleClass('elixir-defined', this.marked === true && slot <= 2);
            row.find('.gi-modal-substat-stats').attr('title', this.marked === true && slot <= 2
                ? UI.Lang.get('artifact_view.elixir') : '');
            this.refreshRolls(slot);
        }

        this.refreshError();
    }

    refreshRolls(slot) {
        const row = this.substats[slot - 1];
        const container = this.root.find('.gi-modal-substat-line.slot-' + slot + ' .gi-modal-substat-value-rolls');
        container.empty();
        if (!row.stat) return;

        const initial = this.initialRolls[row.stat];
        const locked = initial !== undefined;
        const data = artifactRollDraft(row.stat, this.rarity, row.value, initial);
        const first = data.steps[0];
        const hint = UI.Lang.get('artifact_view.' + (locked ? 'initial_roll_locked' : 'initial_roll_auto_hint'));
        const label = UI.Lang.get('artifact_view.initial_roll') + ': ' + UI.Lang.get('stat.' + row.stat);
        let html = '<label class="gi-modal-substat-value-roll gi-artifact-initial-roll ' + (locked ? 'locked' : 'auto')
            + ' border-rarity-' + (first?.rarity || 1) + '" title="' + hint + '">';
        html += '<select class="gi-artifact-initial-select" data-slot="' + slot + '" aria-label="' + label + '">';
        html += '<option value=""' + (locked ? '' : ' selected') + '>' + UI.Lang.get('artifact_view.initial_roll_auto')
            + (first && !locked ? ' · ' + first.value : '') + '</option>';
        for (const option of artifactInitialRollOptions(row.stat, this.rarity, initial)) {
            html += '<option value="' + option.value + '"' + (option.selected ? ' selected' : '') + '>'
                + option.label + '</option>';
        }
        html += '</select></label>';
        for (const roll of data.steps.slice(1)) {
            html += '<div class="gi-modal-substat-value-roll border-rarity-' + roll.rarity + '">' + roll.value + '</div>';
        }
        if (data.last !== 0) {
            html += '<button type="button" class="gi-modal-substat-value-roll last" title="'
                + UI.Lang.get('tooltip.remove_roll') + '">' + Stats.format(row.stat, data.last, {signed: true}) + '</button>';
        }
        container.html(html);
        container.find('.last').on('click', () => this.setSubstatValue(slot, Number(row.value) - data.last));
    }

    setInitialRoll(slot, value) {
        const row = this.substats[slot - 1];
        if (!row?.stat) return;
        if (Number.isFinite(value)) {
            const option = artifactInitialRollOptions(row.stat, this.rarity, this.initialRolls[row.stat])
                .find(option => option.value === value);
            // Re-selecting an equivalent tier is a no-op: preserve imported
            // precision and do not snap a total merely because 4.1 is 4.08.
            if (!option || option.selected) return;
            this.initialRolls[row.stat] = option.value;
        } else {
            delete this.initialRolls[row.stat];
        }
        this.setSubstatValue(slot, row.value);
    }

    hasRollConflict() {
        return this.substats.some(row => {
            if (!row.stat || this.initialRolls[row.stat] === undefined) return false;
            const data = artifactRollDraft(row.stat, this.rarity, row.value, this.initialRolls[row.stat]);
            return data.invalid || data.last !== 0;
        });
    }

    refreshSubstats(filter) {
        for (let slot = 1; slot <= 4; ++slot) {
            if (filter && filter != slot) {
                continue;
            }

            let substat = this.substats[slot-1];
            let stat = substat.stat;

            if (stat) {
                const db = DB.Artifacts.Substats.get(stat);
                let rolls = db.rolls[this.rarity-1];
                let min = Stats.roundStatValue(stat, rolls[0]);

                this.setSubstatValue(slot, substat.value || min, false);
            }
        }
    }

    setSubstatValue(slot, value, snap = true) {
        if (slot >= 1 && slot <= 4) {
            if (value < 0) {
                value = 0;
            }

            let stat = this.substats[slot-1].stat;
            if (stat) {
                let type = DB.Artifacts.Substats.get(stat).type;

                if (type == 'percent') {
                    value = value + '';
                    value = value.replace(',', '.');
                    value = parseFloat(value);
                    value = value.toFixed(1);

                    if (!/^\d+(\.\d)?$/.test(value)) {
                        value = 0;
                    }
                } else {
                    value = parseInt(value);
                    if (! /^\d+$/.test(value)) {
                        value = 0;
                    }
                }
            } else {
                value = 0;
            }

            if (stat && snap && this.initialRolls[stat] !== undefined) {
                value = artifactRollDraft(stat, this.rarity, value, this.initialRolls[stat]).total;
            }

            this.substats[slot-1].value = value;

            this.root.find('.gi-modal-substat-line.slot-'+ slot +' .gi-inputs-number-input').val(value);
            const slider = this.root.find('.gi-modal-substat-line.slot-' + slot + ' .gi-artifact-substat-slider');
            if (stat) {
                const draft = artifactRollDraft(stat, this.rarity, value, this.initialRolls[stat]);
                if (draft.totals) {
                    // Index reachable totals so +/- and keyboard steps cannot
                    // get stuck snapping back across a gap between roll sums.
                    slider.giSlider('range', 0, draft.totals.length - 1, 1);
                    slider.giSlider('set value', draft.totals.indexOf(draft.total));
                } else {
                    const data = DB.Artifacts.Substats.get(stat);
                    const tiers = data.rolls[this.rarity - 1];
                    const maximum = DB.Artifacts.Rarity[this.rarity - 1].maxUpgrades;
                    slider.giSlider('range', Stats.roundStatValue(stat, tiers[0]),
                        Stats.roundStatValue(stat, tiers.at(-1) * maximum), data.type === 'percent' ? 0.1 : 1);
                    slider.giSlider('set value', value);
                }
            }

            this.refreshRolls(slot);
        }

        this.refreshError();
    }

    setSet(set) {
        let setData = DB.Artifacts.Sets.get(set);

        if (!setData) {
            for (const setId of DB.Artifacts.Sets.getKeysSorted()) {
                setData = DB.Artifacts.Sets.get(setId);
                set = setId;
                if (setData.maxRarity == 5) {
                    break;
                }
            }
        }

        if (setData) {
            this.setName = set;
            let image = setData.getImage();

            this.root.find('.gi-modal-set-icon')
                .attr("class", "gi-modal-set-icon sprite sprite-artifact sprite-40 flower")
                .addClass(image);
        }

        this.setRarity(this.rarity);

        this.root.find('.gi-modal-set-line').addClass('hidden');
        this.root.find('.gi-artifact-stats').removeClass('hidden');
    }

    save() {
        if (this.hasRollConflict()) return;
        if (this.callback) {
            this.callback(this.getArtifact());
        }

        this.hide();
    }

    refreshError() {
        let art = this.getArtifact();
        let errors = [];

        for (const name of art.getErrors()) {
            errors.push( UI.Lang.get('artifact_error.'+ name) );
        }

        const provenance = describeManualProvenance(art, this.getProvenanceForm());
        for (const name of provenance.errors) {
            errors.push(UI.Lang.get('artifact_error.' + name));
        }
        const conflict = this.hasRollConflict();
        if (conflict) errors.push(UI.Lang.get('artifact_view.initial_roll_conflict'));
        this.root.find('.modal-save').attr('aria-disabled', conflict ? 'true' : 'false');

        let html = errors.join('; ');

        if (errors.length > 0) {
            html = '<span class="gi-modal-line-error-icon"></span>' + html;
        }

        this.root.find('.gi-modal-line-error').html(html);
    }

    getEnteredStats() {
        const maximum = DB.Artifacts.Rarity[this.rarity - 1].maxSubstats;
        return this.substats.slice(0, maximum).filter(item => item.stat && item.value)
            .map(item => ({stat: item.stat, value: +item.value}));
    }

    canToggleFourth() {
        const row = this.substats[3];
        return this.rarity === 5 && this.level < 4 && !!row.stat && !!+row.value;
    }

    // Entered rows without an inactive 4th line.
    getActiveStats(stats = this.getEnteredStats()) {
        return this.canToggleFourth() && this.fourthInactive ? stats.slice(0, -1) : stats;
    }

    // From +4 the rolls decide the start, but only when every line's first roll is
    // known and its displayed total cannot hide a different roll count.
    getAutoInitialLines(stats, initials) {
        const events = Math.floor(this.level / 4);
        let total = 0;
        for (const {stat, value} of stats) {
            const counts = initials[stat] === undefined ? [] : artifactRollCounts(stat, this.rarity, value, initials[stat]);
            if (counts.length !== 1) return undefined;
            total += counts[0];
        }
        return total - events;
    }

    getArtifact() {
        const stats = this.getEnteredStats();
        const active = this.getActiveStats(stats);
        const result = new Artifact(this.rarity, this.level, this.activeSlot, this.setName,
            this.mainStat, active, stats.slice(active.length));
        result.setGroups(this.groups);
        result.setMetadata(describeManualProvenance(result, this.getProvenanceForm()).input);
        if (this.sourceArtifact) result.setLocked(this.sourceArtifact.isLocked());

        return result;
    }

    bindEvents() {
        let that = this;
        super.bindEvents();

        this.root.find('.gi-modal-type').on('click', function() {
            let slot = $(this).data('slot');

            that.setSlot(slot);
        });

        this.root.find('.gi-artifact-window-star').on('click', function() {
            if ($(this).hasClass('disabled')) {
                return false;
            }

            let rarity = $(this).data('rarity');
            that.setRarity(rarity);
        });

        this.root.find('.gi-modal-mainstat-item').on('click', function() {
            if ($(this).hasClass('disabled')) {
                return false;
            }

            let stat = $(this).data('stat');

            that.setMainstat(stat);
        });

        this.root.find('.gi-modal-substat-item').on('click', function() {
            if ($(this).hasClass('disabled')) {
                return false;
            }

            let stat = $(this).data('stat');
            let slot = $(this).closest('.gi-modal-substat-line').data('slot');

            that.setSubstatStat(slot, stat);
        });

        this.root.find('.gi-modal-substat-line.slot-4 .gi-modal-substat-toggle').on('click', function() {
            that.fourthInactive = !that.fourthInactive;
            that.refreshProvenance();
        });

        this.root.find('.gi-artifact-mark-switch').on('change', function() {
            that.marked = this.checked;
            that.refreshProvenance();
        });

        this.root.on('change', '.gi-artifact-initial-select', function() {
            const slot = +$(this).data('slot');
            that.setInitialRoll(slot, parseFloat($(this).val()));
            that.root.find('.gi-artifact-initial-select[data-slot="' + slot + '"]').trigger('focus');
        });

        this.root.find('.gi-modal-set-icon').on('click', function() {
            UI.ArtifactSetSelectReact.show({
                slot: that.activeSlot,
                callback: (set) => {
                    that.setSet(set.key);
                },
            });
        });

        this.root.find('.modal-save').on('click', function() {
            that.save();
        });

        this.root.find('.modal-close').on('click', function() {
            that.hide();
        });

        this.root.find('.gi-artifact-window-level .gi-inputs-number-input').each(function() {
            let $input = $(this);

            $(this).on('change', function() {
                that.setLevel($input.val());
            });
        });

        this.root.find('.gi-modal-substat-value .gi-inputs-number-input').each(function() {
            let $input = $(this);
            let slot = $(this).closest('.gi-modal-substat-line').data('slot');

            $(this).on('change', function() {
                that.setSubstatValue(slot, $input.val());
            });

            $input.parent().find('.gi-inputs-number-input-button').on('click', function() {
                let current = parseFloat($input.val()) || 0;
                let stat = $input.data('stat');

                if (!stat) {
                    return false;
                }

                let rarity = that.rarity;
                let steps = DB.Artifacts.Substats.get(stat).steps[rarity-1];
                let new_value = 0;

                if ($(this).hasClass('plus')) {
                    for (let val of steps) {
                        new_value = val;

                        if (val > current) {
                            break;
                        }
                    }
                } else {
                    for (let val of steps) {
                        if (val >= current) {
                            break;
                        }

                        new_value = val;
                    }
                }

                if (new_value <= 0) {
                    new_value = steps[0];
                }

                that.setSubstatValue(slot, new_value);
            });
        });

        this.root.find('.gi-artifact-slider-level').giSlider({
            min: 0,
            max: 20,
            showButtons: true,
            showSelected: false,
            showValues: false,
            change: function(value) {
                that.setLevel(value);
            }
        });

        this.root.find('.gi-artifact-substat-slider').each(function() {
            let slot = $(this).closest('.gi-modal-substat-line').data('slot');
            $(this).giSlider({
                min: 1,
                max: 20,
                value: 3,
                showButtons: true,
                showSelected: false,
                showValues: false,
                change: function(value) {
                    const row = that.substats[slot - 1];
                    if (!row.stat) return;
                    const draft = artifactRollDraft(row.stat, that.rarity, row.value, that.initialRolls[row.stat]);
                    that.setSubstatValue(slot, draft.totals ? draft.totals[Number(value)] : value);
                }
            });
        });

        this.root.find('.gi-artifact-window-group-add-button').on('click', function() {
            UI.PromptWindow.show('artifact_group.add_new_title', '', function(text) {
                that.refreshGroups(text);
            });
        });

        this.root.on('change', '.gi-artifact-window-group-dropdown', function() {
            that.groups = Artifact.trimGroupNames(that.root.find('.gi-artifact-window-group-dropdown').val());
        });
    }

    refreshGroups(newGroupName) {
        newGroupName = Artifact.trimGroupName(newGroupName);

        let dropdown_html = '<select class="gi-artifact-window-group-dropdown" multiple="multiple" data-autochange="1">';
        for (let item of this.groupsList) {
            let selected = Artifact.inGroups(this.groups, item.value);
            let value = item.value ? item.title : '*';
            dropdown_html += '<option value="'+ value +'"'+ (selected ? ' selected' : '') +'>'+ item.title +'</option>';

            if (Artifact.groupsAreEqual(newGroupName, item.value)) {
                newGroupName = '';
            }
        }

        if (newGroupName) {
            this.groups.push(newGroupName);
            dropdown_html += `<option value="${newGroupName}" selected>${newGroupName}</option>`;
        }

        dropdown_html += '</select>';

        this.root.find('.gi-artifact-window-group').html(dropdown_html);
        this.root.find('.gi-artifact-window-group-dropdown').giDropdown();
    }

    show(callback, artifact, slot, opts) {
        this.sourceArtifact = artifact ? artifact.clone() : null;
        opts = Object.assign({}, opts);
        this.init();
        this.callback = callback;
        this.initialRolls = {};

        super.show();

        this.lockedSlot = false;
        this.groups = [];

        if (artifact) {
            this.groups = artifact.getGroups();
            this.setSet(artifact.set);
            this.setSlot(artifact.slot);
            this.setRarity(artifact.rarity);
            this.setMainstat(artifact.mainStat);
            this.setLevel(artifact.level);

            if (artifact.slot) {
                this.lockedSlot = true;
            }

            const metadata = artifact.getMetadata();
            const pair = metadata.definedSubstats || [];
            // Stored lines are sorted: move a crafted pair to rows 1–2; an unactivated line goes last.
            const ordered = [...artifact.getSubStats()]
                .sort((a, b) => Number(pair.includes(b.stat)) - Number(pair.includes(a.stat)))
                .concat(artifact.getUnactivatedSubStats());
            let slot = 1;
            for (let stats of ordered) {
                this.setSubstatStat(slot, stats.stat);
                this.setSubstatValue(slot, stats.value, false);
                ++slot;
            }

            for (let i = slot; i <= 4; ++i) {
                this.setSubstatStat(i, '');
                this.setSubstatValue(i, 0);
            }

            this.initialLines = artifact.getInitialLineCount() ?? null;
            this.fourthInactive = artifact.getUnactivatedSubStats().length > 0;
            this.marked = metadata.elixirCrafted === false ? false
                : metadata.elixirCrafted === true && pair.length === 2 ? true : undefined;
            this.initialRolls = Object.assign({}, metadata.initialValues);

            this.root.find('.gi-artifact-slider-level').giSlider('set value', this.level);
        } else {
            if (slot) {
                this.lockedSlot = true;
                this.setSlot(slot);
            }

            for (let i = 1; i <= 4; ++i) {
                let data = this.substats[i-1];

                this.setSubstatStat(i, data && data.stat ? data.stat : '');
                this.setSubstatValue(i, data && data.value ? data.value : 0);
            }

            this.resetProvenance();

            this.setSet(this.setName);
        }

        if (Array.isArray(opts.groups)) {
            this.groupsList = opts.groups;
            this.root.find('.gi-artifact-window-group-wrapper').show();
            this.refreshGroups();
        } else {
            this.groupsList = [];
            this.root.find('.gi-artifact-window-group-wrapper').hide();
        }

        this.refreshError();
        this.refreshSubstats();
        this.refreshProvenance();
        this.root.find('.gi-modal-art-line').toggleClass('locked', this.lockedSlot);
        this.resizeContent();
    }

    resizeContent() {
        super.resizeContent();
        if (this.root.is(':visible')) {
            this.root.find('.gi-artifact-substat-slider, .gi-artifact-slider-level').each(function() {
                $(this).giSlider('refresh');
            });
        }
    }
}
