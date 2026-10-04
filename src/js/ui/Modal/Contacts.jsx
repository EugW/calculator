import React from 'react';
import '../../../css/Components/Dialog/Contacts.css';

import { Lang } from '../Lang';
import { NonAppModal } from '../Modal';
import { DialogContainer } from '../Components/Dialog/Container';
import { ControlsBar, ControlsBarDivider } from '../Components/ControlsBar';
import { TitledButton } from '../Components/Inputs/Buttons';

const lang = new Lang();
const discordInvite = 'https://discord.gg/EAPKNuT2XQ';
const telegramInvite = 'https://telegram.me/+Fwi5zbkW54YxNmVi';

export class ContactsModal extends NonAppModal {
    createContent() {
        return <ContactsComponent ref={component => this.modal = component} />;
    }
}

class ContactsComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {isVisible: false};
    }

    show(opener) {
        this.opener = opener || document.activeElement;
        this.setState({isVisible: true}, () => this.content.querySelector('a').focus());
    }

    handleClose() {
        this.setState({isVisible: false}, () => this.opener?.focus());
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.handleClose();
        } else if (event.key === 'Tab') {
            const controls = [...this.content.querySelectorAll('a[href], button')];
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    render() {
        const title = lang.get('modal_window.contacts');
        return (
            <DialogContainer addClass="contacts-modal" width={400} centered
                isVisible={this.state.isVisible} title={title}
                role="dialog" ariaLabel={title} ariaModal={true}
                closeCallback={() => this.handleClose()}>
                <div ref={element => this.content = element} onKeyDown={event => this.handleKeyDown(event)}>
                    <div className="contacts-links">
                        <a className="contacts-link" href={discordInvite} target="_blank" rel="noopener noreferrer">Discord</a>
                        <a className="contacts-link" href={telegramInvite} target="_blank" rel="noopener noreferrer">Telegram</a>
                    </div>
                    <ControlsBar>
                        <ControlsBarDivider />
                        <TitledButton type="button" icon="icon-cancel" title={lang.get('modal_buttons.close')}
                            onClick={() => this.handleClose()} />
                    </ControlsBar>
                </div>
            </DialogContainer>
        );
    }
}
