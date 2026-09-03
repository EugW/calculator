import React from 'react';
import '../../../css/Components/Pager.css';

/**
 * Shared pager used by the outcome gallery and the upgrade candidate list.
 * Pages are zero-based; callers own clamping through onPage.
 */
export function Pager({page, pages, onPage, previousLabel, nextLabel, pageLabel, formatTotal}) {
    const total = formatTotal ? formatTotal(pages) : pages;
    return <div className="pager">
        <button type="button" className="inputs-button" disabled={page === 0}
            onClick={() => onPage(page - 1)} aria-label={previousLabel}>‹</button>
        <input className="inputs-text" type="number" min={1} max={pages} value={page + 1}
            aria-label={pageLabel} onChange={event => onPage(Number(event.target.value) - 1)} />
        <span>/ {total}</span>
        <button type="button" className="inputs-button" disabled={page + 1 >= pages}
            onClick={() => onPage(page + 1)} aria-label={nextLabel}>›</button>
    </div>;
}
