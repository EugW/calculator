import SimpleBar from 'simplebar-react';
import React from 'react';
import { createPortal } from 'react-dom';
import parse from 'html-react-parser';

import "../../../../css/Components/Inputs/Dropdown.css"
import { FeatureName } from '../FeatureName';

const MAX_HEIGHT = 350;

export class Dropdown extends React.Component {
    constructor(props) {
        super(props);

        this.optionsRef = null;
        this.currentRef = null;
        this.rootRef = null;
        this.resizeObserver = null;
        this.ignoreEvent = false;
        this.state = {
            clickY: 0,
            opened: false,
            maxHeight: 0,
        };

        this.openEvent = () => this.handleDropdownEvent();
        this.portalViewportEvent = event => {
            if (this.props.portal && this.state.opened && !this.optionsRef?.contains(event.target)) this.setState({opened: false});
        };

        document.addEventListener('dropdown_open', this.openEvent);
    }

    handleDropdownEvent() {
        if (this.ignoreEvent) {
            this.ignoreEvent = false;
            return;
        }

        if (this.state.opened) {
            this.setState({opened: false});
        }
    }

    toggleOpened(e) {
        if (this.props.disabled) return;
        let newState = !this.state.opened;
        let clickY = e && Number.isFinite(e.clientY)
            ? e.clientY
            : this.currentRef.getBoundingClientRect().bottom;
        this.ignoreEvent = true;
        document.dispatchEvent(new Event('dropdown_open'));

        this.setState({
            maxHeight: 0,
            clickY: clickY,
            opened: newState,
        });
    }

    handleCurrentKeyDown(e) {
        if (e.key == 'Enter' || e.key == ' ') {
            e.preventDefault();
            this.toggleOpened(e);
        } else if (e.key == 'Escape' && this.state.opened) {
            e.preventDefault();
            this.setState({opened: false});
        }
    }

    selectItem(item) {
        if (this.props.disabled) return;
        if (this.props.isMultiple) {
            let alreadySelected = false;
            let selected = [];
            for (let selectedItem of this.selectedItems) {
                if (selectedItem.value == item.value) {
                    alreadySelected = true;
                } else {
                    selected.push(selectedItem);
                }
            }

            if (!alreadySelected) {
                if (this.props.disableSelectNew) {
                    return;
                }
                selected.push(item);
            }

            this.props.onChange(selected);
        } else {
            this.props.onChange(item);
            this.setState({opened: false});
        }
    }

    shrinkOptionsHeight() {
        let observer = new IntersectionObserver((entries) => {
            let data = entries[0];
            if (data.intersectionRatio < 1) {
                let height = data.intersectionRect.height - 15;
                if (height > 100) {
                    this.setState({maxHeight: height});
                }
            }
            observer.disconnect();
        }, {
            threshold: 0,
        });

        observer.observe(this.optionsRef);
    }

    isFeatureDropdown() {
        return this.props.items.some((item) => item.isFeature);
    }

    setupResizeObserver() {
        if (!this.isFeatureDropdown() || typeof ResizeObserver === 'undefined') {
            return;
        }

        if (!this.resizeObserver) {
            this.resizeObserver = new ResizeObserver(() => this.updateMarqueeText(false));
        }

        this.resizeObserver.disconnect();
        this.resizeObserver.observe(this.rootRef);
        for (let content of this.currentRef.querySelectorAll('.dropdown-text-content')) {
            this.resizeObserver.observe(content);
        }
    }

    updateMarqueeText(animate) {
        if (!this.currentRef || !this.isFeatureDropdown()) {
            return;
        }

        for (let textBlock of this.currentRef.querySelectorAll('.dropdown-text.marquee-enabled')) {
            let content = textBlock.querySelector('.dropdown-text-content');
            let overflow = Math.ceil(content.scrollWidth - textBlock.clientWidth);
            let isOverflowing = overflow > 1;

            textBlock.classList.toggle('overflowing', isOverflowing);

            if (isOverflowing) {
                textBlock.style.setProperty('--dropdown-marquee-distance', -overflow + 'px');
                textBlock.style.setProperty('--dropdown-marquee-duration', Math.min(12, Math.max(5, overflow / 35 + 4)) + 's');
                if (animate) {
                    restartMarquee(textBlock);
                }
            } else {
                content.classList.remove('marquee-active');
                textBlock.style.removeProperty('--dropdown-marquee-distance');
                textBlock.style.removeProperty('--dropdown-marquee-duration');
            }
        }
    }

    getItemsHeight() {
        if (this.isFeatureDropdown() && this.bar && this.bar.getContentElement()) {
            let optionsStyle = window.getComputedStyle(this.optionsRef);
            let optionsPadding = parseFloat(optionsStyle.paddingTop) + parseFloat(optionsStyle.paddingBottom);
            return Math.ceil(this.bar.getContentElement().scrollHeight + optionsPadding);
        }
        return this.props.items.length * 26 + 10;
    }

    componentDidMount() {
        if (this.props.portal) {
            document.addEventListener('scroll', this.portalViewportEvent, true);
            window.addEventListener('resize', this.portalViewportEvent);
        }
        this.setupResizeObserver();
        this.updateMarqueeText(true);
    }

    componentDidUpdate(prevProps) {
        if (this.props.disabled && this.state.opened) {
            this.setState({opened: false});
            return;
        }
        this.setupResizeObserver();
        this.updateMarqueeText(prevProps.selected !== this.props.selected);
        if (this.state.opened && this.currentRef) {
            for (let content of this.currentRef.querySelectorAll('.marquee-active')) {
                content.classList.remove('marquee-active');
            }
        }

        if (this.optionsRef && this.state.opened) {
            let itemsHeight = this.getItemsHeight();
            let maxHeight = this.state.maxHeight || this.props.height || MAX_HEIGHT;
            let height = Math.min(itemsHeight, maxHeight) + 30;

            this.optionsRef.classList.toggle('scroll', itemsHeight > maxHeight);

            if (this.state.clickY > height && this.state.clickY + height > window.innerHeight) {
                this.optionsRef.classList.add('up');
            } else {
                this.optionsRef.classList.remove('up');
            }

            if (this.props.portal) {
                const bounds = this.currentRef.getBoundingClientRect();
                const width = Math.max(190, bounds.width);
                const up = bounds.bottom + height > window.innerHeight && bounds.top > height;
                Object.assign(this.optionsRef.style, {width: width + 'px',
                    left: Math.max(6, Math.min(bounds.left, window.innerWidth - width - 6)) + 'px',
                    top: up ? 'auto' : bounds.bottom + 2 + 'px',
                    bottom: up ? window.innerHeight - bounds.top + 2 + 'px' : 'auto'});
            }
            setTimeout(() => {if (this.optionsRef && this.state.opened) this.shrinkOptionsHeight();}, 1);
        }
    }

    componentWillUnmount() {
        document.removeEventListener('dropdown_open', this.openEvent);
        document.removeEventListener('scroll', this.portalViewportEvent, true);
        window.removeEventListener('resize', this.portalViewportEvent);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    render() {
        const options = [];
        let isFeatureDropdown = this.isFeatureDropdown();
        let selectedValues = Array.isArray(this.props.selected) ? this.props.selected : [this.props.selected];
        this.selectedItems = [];

        if (selectedValues.length == 0 && !this.props.isMultiple) {
            selectedValues = [this.props.items[0].value];
        }

        for (let item of this.props.items) {
            let selected = inSelected(item.value, selectedValues);
            if (selected) {
                this.selectedItems.push(item);
            }
            options.push(
                <DropdownOption
                    key={item.value}
                    item={item}
                    selected={selected}
                    disableSelect={this.props.disableSelectNew}
                    onClick={(i) => this.selectItem(i)}
                />
            );
        }

        let currentItems = [];
        for (let selectedItem of this.selectedItems) {
            let icons = [];
            let iconIndex = 0;

            if (this.props.textIcon) {
                ++iconIndex;
                icons.push(<div key={'icon-'+ iconIndex} className={'dropdown-icon icon-'+ this.props.textIcon} />);
            }

            if (selectedItem.textIcons) {
                for (let icon of selectedItem.textIcons) {
                    ++iconIndex;
                    icons.push(<div key={'icon-'+ iconIndex} className={'dropdown-icon icon-'+ icon} />);
                }
            }

            currentItems.push(
                <div key={selectedItem.value} className="dropdown-option">
                    {icons}
                    <DropdownText item={selectedItem} marquee={isFeatureDropdown} />
                </div>
            );
        }

        const optionsNode = <div ref={obj => {this.optionsRef = obj;}}
            className={'dropdown-options' + (this.props.portal ? ' dropdown-portal ' + (this.props.portalClassName || '') : '')}>
            <SimpleBar ref={obj => {this.bar = obj;}}
                style={{maxHeight: this.state.maxHeight || this.props.height || 350}} autoHide={true}>
                {options}
            </SimpleBar>
        </div>;

        return (
            <DropdownWrapper
                rootRef={(obj) => {this.rootRef = obj;}}
                addClass={(this.props.addClass || '') + (isFeatureDropdown ? ' feature-dropdown' : '')}
            >
                <div
                    ref={(obj) => {this.currentRef = obj;}}
                    className={'dropdown-current' + (this.state.opened ? ' opened' : '') + (this.props.disabled ? ' disabled' : '')}
                    role={isFeatureDropdown || this.props.ariaLabel ? 'button' : undefined}
                    tabIndex={this.props.disabled ? -1 : isFeatureDropdown || this.props.ariaLabel ? 0 : undefined}
                    aria-label={this.props.ariaLabel}
                    aria-disabled={this.props.disabled || undefined}
                    aria-expanded={isFeatureDropdown || this.props.ariaLabel ? this.state.opened : undefined}
                    onFocus={() => restartMarquee(this.currentRef && this.currentRef.querySelector('.dropdown-text.marquee-enabled'))}
                    onKeyDown={(e) => this.handleCurrentKeyDown(e)}
                    onClick={(e) => this.toggleOpened(e)}
                >
                    {this.props.selectedText !== undefined ? <div className="dropdown-option">
                        <div className="text dropdown-selection-text" title={this.props.selectedText}>{this.props.selectedText}</div>
                    </div> : currentItems}
                </div>
                {this.props.portal ? this.state.opened && createPortal(optionsNode, document.body) : optionsNode}
            </DropdownWrapper>
        );
    }
}

function DropdownWrapper(props) {
    return (
        <div ref={props.rootRef} className={'dropdown-wrapper '+ (props.addClass || '')}>
            {props.children}
        </div>
    );
}

function DropdownOption(props) {
    if (props.item.isCaption) {
        return (
            <div className='dropdown-caption'>
                <span className="dropdown-option-text">{parseText(props.item.text)}</span>
            </div>
        );
    }

    let className = 'dropdown-option';
    if (props.selected) {
        className += ' selected';
    }
    if (props.item.isSubitem) {
        className += ' subitem';
    }
    if (props.item.isChild) {
        className += ' child';
    }
    if (!props.selected && props.disableSelect) {
        className += ' disabled';
    }

    let icons = [];
    let iconIndex = 0;

    if (props.item.textIcons) {
        for (let icon of props.item.textIcons) {
            ++iconIndex;
            icons.push(<div key={'icon-'+ iconIndex} className={'dropdown-icon icon-'+ icon} />);
        }
    }

    if (props.item.optionIcons) {
        for (let icon of props.item.optionIcons) {
            ++iconIndex;
            icons.push(<div key={'icon-'+ iconIndex} className={'dropdown-icon icon-'+ icon} />);
        }
    }

    return (
        <div className={className} onClick={() => props.onClick(props.item)}>
            {icons}
            <DropdownText item={props.item} />
            {props.item.number ? <div className="number">{props.item.number}</div> : ''}
        </div>
    );
}


function inSelected(value, list) {
    for (let item of list) {
        if (item == value) {
            return true;
    }
    }
    return false;
}

function parseText(value) {
    if (typeof value === 'string') {
        return parse(value);
    }
    return value;
}

function renderItemText(item) {
    if (item.nameStyle) {
        return <FeatureName text={item.text} nameStyle={item.nameStyle} />;
    }
    return parseText(item.text);
}

function DropdownText(props) {
    let className = 'text dropdown-text';
    if (props.marquee) {
        className += ' marquee-enabled';
    }

    return (
        <div
            className={className}
            onPointerEnter={props.marquee ? (e) => restartMarquee(e.currentTarget) : undefined}
        >
            <span
                className="dropdown-text-content"
                onAnimationEnd={(e) => e.currentTarget.classList.remove('marquee-active')}
            >
                {renderItemText(props.item)}
            </span>
        </div>
    );
}

function restartMarquee(textBlock) {
    if (!textBlock || !textBlock.classList.contains('overflowing')) {
        return;
    }

    let content = textBlock.querySelector('.dropdown-text-content');
    content.classList.remove('marquee-active');
    void content.offsetWidth;
    content.classList.add('marquee-active');
}
