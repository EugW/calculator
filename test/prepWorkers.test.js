import { normalizePrepWorkers } from '../src/js/classes/ArtifactActionPredictor';

let navigatorDescriptor;
beforeEach(() => {
    navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {hardwareConcurrency: 12}});
});
afterEach(() => {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
});

test('worker count defaults to one and allows every reported logical core', () => {
    for (const missing of [undefined, null, '', 'auto', 'abc', 0, -3, NaN, Infinity]) {
        expect(normalizePrepWorkers(missing)).toBe(1);
    }
    expect(normalizePrepWorkers('4')).toBe(4);
    expect(normalizePrepWorkers(2.7)).toBe(2);
    expect(normalizePrepWorkers(12)).toBe(12);
    expect(normalizePrepWorkers(100)).toBe(12);
    globalThis.navigator.hardwareConcurrency = 32;
    expect(normalizePrepWorkers(32)).toBe(32);
    globalThis.navigator.hardwareConcurrency = 1;
    expect(normalizePrepWorkers(8)).toBe(1);
    delete globalThis.navigator.hardwareConcurrency;
    expect(normalizePrepWorkers(8)).toBe(1);
});

