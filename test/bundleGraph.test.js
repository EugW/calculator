const fs = require('fs');
const path = require('path');

// A browser page or worker must run one webpack module graph. A module in two
// graphs of one page (two entries, or a worker's importScripts of another
// entry) has two instances: its classes fail instanceof and its symbols differ,
// so team scopes attached by the evaluation are invisible to DB conditions.

const root = path.resolve(__dirname, '..');
const workersDir = path.join(root, 'src/js/workers');

test("the page is a single entry that imports the database and the UI", () => {
    const config = require(path.join(root, 'webpack.config.js'))({}, {mode: 'production'});
    expect(Object.keys(config.entry).sort()).toEqual(['app', 'cli']);

    const app = fs.readFileSync(path.join(root, 'src/js/app.js'), 'utf8');
    expect(app).toMatch(/^import "\.\/db";$/m);
    expect(app).toMatch(/^import "\.\/ui";$/m);
});

test("workers import the database into their own module graph", () => {
    const workers = fs.readdirSync(workersDir).filter((name) => name.endsWith('.js'));
    expect(workers.length).toBeGreaterThan(0);

    for (const name of workers) {
        const source = fs.readFileSync(path.join(workersDir, name), 'utf8');
        expect([name, /^import "\.\.\/db";$/m.test(source)]).toEqual([name, true]);
        expect([name, source.includes('importScripts(')]).toEqual([name, false]);
    }
});
