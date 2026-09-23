import fs from 'fs';
import path from 'path';

const root = process.cwd();

test('feature dropdowns use measured height and overflow-only marquee', () => {
    const source = fs.readFileSync(
        path.join(root, 'src/js/ui/Components/Inputs/Dropdown.jsx'),
        'utf8',
    );

    expect(source).toContain("item.isFeature");
    expect(source).toContain("getContentElement().scrollHeight");
    expect(source).toContain("content.scrollWidth - textBlock.clientWidth");
    expect(source).not.toContain("let itemsHeight = this.props.items.length * 26 + 10");
});

test('opened feature rows wrap without changing dropdown width', () => {
    const css = fs.readFileSync(
        path.join(root, 'src/css/Components/Inputs/Dropdown.css'),
        'utf8',
    );

    expect(css).toContain('.dropdown-wrapper.feature-dropdown .dropdown-options .dropdown-option');
    expect(css).toContain('.dropdown-wrapper.feature-dropdown .dropdown-current');
    expect(css).toContain('padding-right: 28px');
    expect(css).toContain('height: auto');
    expect(css).toContain('white-space: normal');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toMatch(/feature-dropdown[^{}]*\.dropdown-options\s*\{[^}]*\bwidth\s*:/s);
});

test('rotation feature names wrap instead of using ellipsis', () => {
    const css = fs.readFileSync(
        path.join(root, 'src/css/Components/Tab/Rotation/List.css'),
        'utf8',
    );

    const featureLine = css.match(/\.rotation-items-list \.feature-line\s*\{([^}]*)\}/s)[1];
    expect(featureLine).toContain('white-space: normal');
    expect(featureLine).toContain('overflow-wrap: anywhere');
    expect(featureLine).not.toContain('text-overflow: ellipsis');
});
