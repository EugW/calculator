import React from 'react';
import "../../../css/Components/ControlsBar.css"

export function ControlsBar(props) {
    return (
        <div className={'controls-bar' + (props.wrap ? ' wrap' : '')}>
        {React.Children.map(props.children, child => {
                if (!child) return null;
                if (child.type == ControlsBarDivider) {
                    return child;
                }

                let childClass = 'item';
                if (child.props.barClass) {
                    childClass += ' '+ child.props.barClass;
                }
                return (
                    <div className={childClass}>{child}</div>
                );
            })}
        </div>
    );
}

export function ControlsBarDivider(props) {
    return <div className='spacer' />;
}
