import { acknowledgeArtifactBaseline, isArtifactBaselineAcknowledged } from '../src/js/classes/ArtifactBaselineAcknowledgements';

function storage() {
    const data = new Map();
    return {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)};
}

test('acknowledgements survive reopening but never apply to a different build or settings fingerprint', () => {
    const local = storage();
    expect(isArtifactBaselineAcknowledged('team-profile-inventory-A', local)).toBe(false);
    acknowledgeArtifactBaseline('team-profile-inventory-A', local);
    expect(isArtifactBaselineAcknowledged('team-profile-inventory-A', local)).toBe(true);
    expect(isArtifactBaselineAcknowledged('team-profile-inventory-B', local)).toBe(false);
});

test('the cache is bounded and renewing an acknowledgement keeps it recent', () => {
    const local = storage();
    for (let i = 0; i < 64; ++i) acknowledgeArtifactBaseline(String(i), local);
    acknowledgeArtifactBaseline('0', local);
    acknowledgeArtifactBaseline('64', local);
    expect(isArtifactBaselineAcknowledged('0', local)).toBe(true);
    expect(isArtifactBaselineAcknowledged('1', local)).toBe(false);
});

test('malformed or blocked storage never interrupts an action', () => {
    expect(isArtifactBaselineAcknowledged('a', {getItem: () => '{broken'})).toBe(false);
    const blocked = {getItem() {throw new Error('blocked');}, setItem() {throw new Error('quota');}};
    expect(() => acknowledgeArtifactBaseline('a', blocked)).not.toThrow();
    expect(isArtifactBaselineAcknowledged('a', blocked)).toBe(false);
});
