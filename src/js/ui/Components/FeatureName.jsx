import React from 'react';
import parse from 'html-react-parser';

import "../../../css/Components/FeatureName.css"

export function FeatureName(props) {
    let nameStyle = props.nameStyle || (props.result && props.result.nameStyle) || '';
    let classNames = ['feature-name-text'];

    if (nameStyle) {
        classNames.push('damage-feature-name', 'damage-feature-name-' + nameStyle);
    }
    if (props.className) {
        classNames.push(props.className);
    }

    return (
        <span className={classNames.join(' ')}>
            {parseText(props.text !== undefined ? props.text : props.children)}
        </span>
    );
}

function parseText(value) {
    if (typeof value === 'string') {
        return parse(value);
    }
    return value;
}
