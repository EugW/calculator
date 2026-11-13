import React from "react";
import "../../../../css/Components/Tab/Rotation/BlockModal.css"

import { DialogContainer } from "../../Components/Dialog/Container";
import { Lang } from "../../Lang";

let lang = new Lang();

/**
 * Picks the member a rotation's switch step puts on field.
 */
export class RotationSwitchModal extends React.PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            isVisible: false,
        };
    }

    show(data, saveCallback) {
        this.saveCallback = saveCallback;

        this.setState({
            isVisible: true,
        });
    }

    handleSave(charId) {
        if (this.saveCallback) {
            this.saveCallback({type: 'action', action: 'switch', charId: charId});
        }

        this.setState({isVisible: false});
    }

    handleClose() {
        this.setState({isVisible: false});
    }

    render() {
        let members = this.props.build.team ? this.props.build.team.getMembers() : [];

        return (
            <DialogContainer
                addClass="rotation-block-modal"
                width={500}
                isVisible={this.state.isVisible}
                title={lang.get('modal_window.rotation_switch')}
                closeCallback={() => this.handleClose()}
            >
                <div className="description switch">{lang.get('rotation_view.switch_descr')}</div>
                {members.map((member) => {
                    let char = member.char.get();
                    return (
                        <div key={char.getId()} className="item member" onClick={() => this.handleSave(char.getId())}>
                            <div className={'icon sprite sprite-24 sprite-char ' + char.getIcon()} />
                            <div className="title">{lang.get(char.getName())}</div>
                        </div>
                    );
                })}
            </DialogContainer>
        );
    }
}
