import React from "react";
import { CharIcon } from "../../Components/Icons";

export class PartyList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showExtended: true,
        };
    }

    getCurrentIds() {
        let ids = [];

        // Core party (slots 1-3)
        for (let i = 1; i <= 3; i++) {
            ids.push(this.props.settings['party_char_' + i] || 0);
        }

        // Extra party members
        let extraIndex = 1;
        while (this.props.settings['party_char_extra_' + extraIndex]) {
            ids.push(this.props.settings['party_char_extra_' + extraIndex]);
            extraIndex++;
        }

        return ids;
    }

    hasAllCoreSlotsFilled() {
        return !!(this.props.settings.party_char_1 &&
               this.props.settings.party_char_2 &&
               this.props.settings.party_char_3);
    }

    handleCharSelect(index, isExtra = false) {
        let currentIds = this.getCurrentIds();
        let excludeIds = [this.props.settings.char_id].concat(currentIds.filter(id => id));

        UI.CharSelectReact.show({
            excludeIds: excludeIds,
            showEmpty: true,
            callback: (char) => {
                let actualIndex = isExtra ? 3 + index : index;
                currentIds[actualIndex - 1] = char ? char.getId() : 0;

                // Compact extra members: remove all zeros, not just trailing
                let coreIds = currentIds.slice(0, 3);
                let extraIds = currentIds.slice(3).filter(id => id);
                currentIds = coreIds.concat(extraIds);

                this.props.onChange(currentIds);
            },
        });
    }

    handleAddExtraMember() {
        let currentIds = this.getCurrentIds();
        let excludeIds = [this.props.settings.char_id].concat(currentIds.filter(id => id));

        UI.CharSelectReact.show({
            excludeIds: excludeIds,
            showEmpty: false,
            callback: (char) => {
                if (char) {
                    currentIds.push(char.getId());
                    this.props.onChange(currentIds);
                }
            },
        });
    }

    toggleExtended() {
        this.setState({ showExtended: !this.state.showExtended });
    }

    render() {
        let coreItems = [];
        let extraItems = [];

        // Main character (not clickable)
        coreItems.push(
            <CharIcon key={this.props.settings.char_id} char={DB.Chars.getById(this.props.settings.char_id)} />
        );

        // Core party slots (1-3)
        for (let i = 1; i <= 3; i++) {
            let char = DB.Chars.getById(this.props.settings['party_char_' + i]);
            coreItems.push(
                <CharIcon
                    key={'party_char_' + i}
                    char={char}
                    addClass="item"
                    onClick={() => this.handleCharSelect(i)}
                />
            );
        }

        // Extra party members
        let extraIndex = 1;
        while (this.props.settings['party_char_extra_' + extraIndex]) {
            let charId = this.props.settings['party_char_extra_' + extraIndex];
            let char = DB.Chars.getById(charId);
            if (char) {
                let idx = extraIndex;
                extraItems.push(
                    <CharIcon
                        key={'extra_' + charId}
                        char={char}
                        addClass="item"
                        onClick={() => this.handleCharSelect(idx, true)}
                    />
                );
            }
            extraIndex++;
        }

        let showAddButton = this.hasAllCoreSlotsFilled();

        return (
            <div className="buffs-char-list-wrapper">
                <div className="buffs-char-list">
                    {coreItems}
                    {showAddButton && (
                        <div className="buffs-char-add" onClick={() => this.handleAddExtraMember()}>
                            <span className="buffs-char-add-icon">+</span>
                        </div>
                    )}
                </div>

                {extraItems.length > 0 && (
                    <div className="buffs-char-extended">
                        <div
                            className="buffs-char-extended-header"
                            onClick={() => this.toggleExtended()}
                        >
                            <span>{UI.Lang.get('buff_group.additional_supports')} ({extraItems.length})</span>
                            <span className={'buffs-char-extended-toggle' + (this.state.showExtended ? ' open' : '')}></span>
                        </div>
                        {this.state.showExtended && (
                            <div className="buffs-char-list buffs-char-list-extra">
                                {extraItems}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
}
