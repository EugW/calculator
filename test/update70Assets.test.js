import fs from 'fs';
import path from 'path';

const root = process.cwd();

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expectPng(relativePath) {
    const data = fs.readFileSync(path.join(root, relativePath));
    expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
}

function expectPngSize(relativePath, width, height) {
    const data = fs.readFileSync(path.join(root, relativePath));
    expect([...data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(data.readUInt32BE(16)).toBe(width);
    expect(data.readUInt32BE(20)).toBe(height);
}

function expectSpriteReferencesExist(css) {
    const references = [...css.matchAll(/\.\.\/\.\.\/images\/sprites\/([^"')]+\.png)/g)]
        .map((match) => match[1]);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of new Set(references)) {
        expect(fs.existsSync(path.join(root, 'src/images/sprites', reference))).toBe(true);
    }
}

test('7.0 artifact assets and regenerated sprite references are complete', () => {
    for (const setId of [15047, 15048]) {
        for (let slot = 1; slot <= 5; ++slot) {
            expectPng(`data/images/artifacts/UI_RelicIcon_${setId}_${slot}.png`);
        }
    }

    for (const slot of ['flower', 'plume', 'sands', 'goblet', 'circlet']) {
        const css = read(`src/css/generated/icons_artifacts_${slot}.css`);
        expect(css).toContain('artifact-icon-scarlet-proof');
        expect(css).toContain('artifact-icon-heart-of-the-furnace');
        expectSpriteReferencesExist(css);
    }
});

test('7.0 and 7.1 weapon manifests have unique selectors and valid PNGs', () => {
    const icons = [
        'UI_EquipIcon_Sword_SerpentTooth',
        'UI_EquipIcon_Sword_GlintstoneSword',
        'UI_EquipIcon_Sword_Swanlake',
        'UI_EquipIcon_Sword_WeaponQuestSnezhnaya',
        'UI_EquipIcon_Claymore_EscapeWheel',
        'UI_EquipIcon_Claymore_GlintstoneClaymore',
        'UI_EquipIcon_Pole_FaesCrystalle',
        'UI_EquipIcon_Pole_GlintstonePolearm',
        'UI_EquipIcon_Catalyst_SandMemoria',
        'UI_EquipIcon_Catalyst_GlintstoneCatalyst',
        'UI_EquipIcon_Bow_ShatteredMirror',
        'UI_EquipIcon_Bow_GlintstoneBow',
        'UI_EquipIcon_Sword_SpikedStake',
        'UI_EquipIcon_Sword_Fajian',
        'UI_EquipIcon_Sword_Samosvist',
        'UI_EquipIcon_Catalyst_FrostScepter',
        'UI_EquipIcon_Catalyst_Bludnye',
        'UI_EquipIcon_Bow_Windtalker',
    ];
    for (const icon of icons) {
        expectPng(`data/images/weapons/${icon}.png`);
    }

    const css = ['sword', 'claymore', 'polearm', 'catalyst', 'bow']
        .map((type) => read(`src/css/generated/icons_weapons_${type}.css`))
        .join('\n');
    for (const selector of [
        'weapon-icon-sword-heretics-molten-blade',
        'weapon-icon-sword-emberwell',
        'weapon-icon-sword-whitelake-frostfeather',
        'weapon-icon-sword-exaiphanes-blade',
        'weapon-icon-claymore-forged-by-the-golden-melody',
        'weapon-icon-claymore-blade-of-atonement',
        'weapon-icon-polearm-frostbreath',
        'weapon-icon-polearm-song-of-the-vigil',
        'weapon-icon-catalyst-clash-of-kings',
        'weapon-icon-catalyst-echoes-of-the-heart',
        'weapon-icon-bow-jade-vista',
        'weapon-icon-bow-covenant-of-frost-and-snow',
        'weapon-icon-sword-spiked-stake',
        'weapon-icon-sword-fajian',
        'weapon-icon-sword-samosvist',
        'weapon-icon-catalyst-frost-scepter',
        'weapon-icon-catalyst-bludnye',
        'weapon-icon-bow-windtalker',
    ]) {
        expect(css).toContain(selector);
    }
    expectSpriteReferencesExist(css);
});

test('all new character portraits use their imported source images', () => {
    expectPng('data/images/chars/UI_AvatarIcon_Alyosha.png');
    expectPng('data/images/chars/UI_AvatarIcon_Odette.png');
    expectPngSize('data/images/chars/UI_AvatarIcon_Vodyanitsa.png', 256, 256);
    expectPngSize('data/images/chars/UI_AvatarIcon_Vesna.png', 256, 256);
    expectPngSize('src/images/chars/vodyanitsa.png', 80, 80);
    expectPngSize('src/images/chars/vodyanitsa_2x.png', 160, 160);
    expectPngSize('src/images/chars/vesna.png', 80, 80);
    expectPngSize('src/images/chars/vesna_2x.png', 160, 160);
    expect(fs.readFileSync(path.join(root,
        'data/images/chars/UI_AvatarIcon_Vodyanitsa.png')).equals(
        fs.readFileSync(path.join(root,
            'data/images/chars/UI_AvatarIcon_Vesna.png')),
    )).toBe(false);

    const css = read('src/css/generated/icons_chars.css');
    for (const selector of [
        'char-icon-alyosha',
        'char-icon-odette',
        'char-icon-vodyanitsa',
        'char-icon-vesna',
    ]) {
        expect(css).toContain(selector);
    }
    expect(css).toContain(
        '.char-icon-vodyanitsa {background-image: url("../../images/chars/vodyanitsa.png")}',
    );
    expect(css).toContain(
        '.char-icon-vesna {background-image: url("../../images/chars/vesna.png")}',
    );
    expect(css).toContain(
        '.char-icon-vodyanitsa {background-image: url("../../images/chars/vodyanitsa_2x.png")}',
    );
    expect(css).toContain(
        '.char-icon-vesna {background-image: url("../../images/chars/vesna_2x.png")}',
    );
    expect(css).not.toContain(
        '.char-icon-vodyanitsa {background-image: url("../../images/chars/unknown',
    );
    expect(css).not.toContain(
        '.char-icon-vesna {background-image: url("../../images/chars/unknown',
    );
    expectSpriteReferencesExist(css);
});
