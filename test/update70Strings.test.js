import fs from 'fs';
import path from 'path';

const root = process.cwd();
const stringsRoot = path.join(root, 'data/strings');

function csvFiles(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return csvFiles(fullPath);
        return entry.name.endsWith('.csv') ? [fullPath] : [];
    });
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; ++i) {
        const char = text[i];
        if (quoted && char === '"') {
            if (text[i + 1] === '"') {
                field += '"';
                ++i;
            } else {
                quoted = false;
            }
        } else if (!quoted && char === '"' && field.length === 0) {
            quoted = true;
        } else if (!quoted && char === ';') {
            row.push(field);
            field = '';
        } else if (!quoted && (char === '\n' || char === '\r')) {
            if (char === '\r' && text[i + 1] === '\n') ++i;
            row.push(field);
            if (row.some((value) => value.length > 0)) rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    if (rows.length > 0) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
    return rows;
}

function readRows(file) {
    return parseCsv(fs.readFileSync(file, 'utf8'));
}

function relativeStringPath(file) {
    return path.relative(stringsRoot, file).split(path.sep).join('/');
}

const versionFiles = [
    ...csvFiles(path.join(stringsRoot, '7.0')),
    ...csvFiles(path.join(stringsRoot, '7.1')),
];
const generatedFiles = [
    'artifact_set_bonuses.csv',
    'artifact_set_names.csv',
    'char_names.csv',
    'char_skills.csv',
    'char_talents.csv',
    'weapon_names.csv',
    'weapon_talents.csv',
].map((name) => path.join(stringsRoot, 'generated', name));
const auditFiles = [
    ...versionFiles,
    ...generatedFiles,
    path.join(stringsRoot, 'artifacts/manual.csv'),
    path.join(stringsRoot, 'ui/features_view.csv'),
    path.join(stringsRoot, 'ui/stats.csv'),
];
const allStringFiles = csvFiles(stringsRoot);

function collectOccurrences() {
    const result = new Map();
    for (const file of allStringFiles) {
        for (const row of readRows(file).slice(1)) {
            if (row.length !== 4) continue;
            const key = `${row[0]}.${row[1]}`;
            result.set(key, [
                ...(result.get(key) || []),
                {file, values: row.slice(2)},
            ]);
        }
    }
    return result;
}

const manualExceptions = {
    '7.0/alyosha.csv': [
        'talent_name.alyosha_hunters_precision',
        'talent_descr.alyosha_hunters_precision',
    ],
    '7.0/odette.csv': [
        'talent_name.odette_snow_swans_dream',
        'talent_descr.odette_snow_swans_dream',
    ],
    '7.0/stellar_glimmer.csv': [
        'talent_name.radiance_stellarconduct',
        'talent_name.radiance_stellarswirl',
        'talent_name.stellarswirl_vortex_triggers',
        'talent_descr.stellarswirl_vortex_triggers',
    ],
    '7.0/traveler_cryo.csv': [
        'talent_name.traveler_cryo_icepoint',
    ],
    '7.0/weapons.csv': [
        'talent_name.weapon_heretics_molten_blade_distance',
        'talent_name.weapon_exaiphanes_blade_resonated_elements',
        'talent_name.weapon_forged_by_the_golden_melody_active',
        'talent_name.weapon_forged_by_the_golden_melody_copied',
        'talent_name.weapon_forged_by_the_golden_melody_atk',
        'talent_name.weapon_forged_by_the_golden_melody_mastery',
        'talent_name.weapon_forged_by_the_golden_melody_stellarglimmer',
        'talent_descr.weapon_forged_by_the_golden_melody_active',
        'talent_descr.weapon_forged_by_the_golden_melody_copied',
    ],
    '7.1/vesna.csv': [
        'talent_name.n11430001',
        'talent_descr.n11430001',
        'talent_name.vesna_spirit_blade_force',
        'talent_descr.vesna_spirit_blade_force',
        'talent_name.vesna_spirit_blade_sequence',
        'talent_descr.vesna_spirit_blade_sequence',
        'talent_name.vesna_unruffled_clear',
    ],
    '7.1/vodyanitsa.csv': [
        'talent_name.vodyanitsa_microphone_summons',
        'talent_descr.vodyanitsa_microphone_summons',
    ],
    '7.1/weapons.csv': [
        'weapon_name.spiked_stake',
        'talent_name.weapon_spiked_stake',
        'talent_name.weapon_spiked_stake_mode',
        'talent_name.weapon_spiked_stake_normal',
        'talent_name.weapon_spiked_stake_radiance',
        'talent_name.weapon_spiked_stake_stacks',
        'talent_descr.weapon_spiked_stake_stacks',
        'weapon_name.fajian',
        'talent_name.weapon_fajian',
        'weapon_name.samosvist',
        'talent_name.weapon_samosvist',
        'talent_name.weapon_samosvist_attention',
        'talent_descr.weapon_samosvist_attention',
        'talent_name.weapon_samosvist_blazing',
        'talent_name.weapon_samosvist_dazzling',
        'talent_name.weapon_samosvist_radiant',
        'weapon_name.frost_scepter',
        'talent_name.weapon_frost_scepter',
        'talent_name.weapon_frost_scepter_radiance',
        'weapon_name.bludnye',
        'talent_name.weapon_bludnye',
        'talent_name.weapon_bludnye_mode',
        'talent_name.weapon_bludnye_hymn',
        'talent_name.weapon_bludnye_triumph',
        'talent_name.weapon_bludnye_stacks',
        'talent_descr.weapon_bludnye_stacks',
        'talent_name.weapon_bludnye_holder_hp',
        'talent_name.weapon_bludnye_hymn_1',
        'talent_name.weapon_bludnye_hymn_2',
        'talent_name.weapon_bludnye_hymn_3',
        'talent_name.weapon_bludnye_triumph_1',
        'talent_name.weapon_bludnye_triumph_2',
        'talent_name.weapon_bludnye_triumph_3',
        'talent_descr.weapon_bludnye_party',
        'weapon_name.windtalker',
        'talent_name.weapon_windtalker',
        'talent_name.weapon_windtalker_points',
        'talent_descr.weapon_windtalker_points',
        'talent_name.weapon_windtalker_party',
    ],
};

const sourceOwned70Descriptions = [
    'qiqi_seven_sacred_treasures',
    'qiqi_rite_of_resurrection_buffed',
    'diona_choice_treasures',
    'diona_cats_tail_closing_time_buffed',
    'yumemizuki_mizuki_aisa_utamakura_pilgrimage',
    'yumemizuki_mizuki_bright_moons_restless_voice',
    'yumemizuki_mizuki_vast_be_the_dream',
    'yumemizuki_mizuki_in_mist_like_waters_buffed',
    'yumemizuki_mizuki_your_echo_i_meet_in_dreams_buffed',
    'yumemizuki_mizuki_buds_warm_lucid_springs_buffed',
    'yumemizuki_mizuki_the_heart_lingers_long_buffed',
    'ifa_field_medics_vision',
    'sandrone_self_evident_proposition',
    'sandrone_differential_analysis',
    'sandrone_q_e_d',
    'sandrone_light_of_rationalisme',
    'sandrone_eternal_speculation_engine',
    'sandrone_morrow_after_the_golden_dusk',
    'sandrone_an_heiress_gazed_into_the_looking_glass',
    'sandrone_in_knowledge_lies_the_worlds_true_ground',
    'sandrone_narcissus_wakes_her_eyes_upon_the_dawn',
    'venti_temporal_winds_eulogy',
    'sucrose_catalyst_conversion',
    'kaedehara_kazuha_poetics_of_fuubutsu',
    'sayu_someone_more_capable',
    'sayu_new_and_improved',
    'shikanoin_heizou_paradoxical_practice',
    'skirk_reason_beyond_reason',
    'varka_winds_vanguard',
    'varka_for_none_may_take_from_us_our_freedom_of_song',
    'prune_ring_a_ding_ding_hexhunter_chime',
    'prune_verdict_and_punishment',
    'prune_witchseekers_vow',
];

test('7.0, 7.1, and generated CSVs are structurally complete', () => {
    for (const file of auditFiles) {
        const rows = readRows(file);
        expect(rows[0]).toEqual(['category', 'name', 'rus', 'eng']);
        for (const [index, row] of rows.slice(1).entries()) {
            expect({file, line: index + 2, columns: row.length}).toEqual({
                file,
                line: index + 2,
                columns: 4,
            });
            expect(row[2].trim()).not.toBe('');
            expect(row[3].trim()).not.toBe('');
            expect(['none', 'unknown']).not.toContain(row[2].trim().toLowerCase());
            expect(['none', 'unknown']).not.toContain(row[3].trim().toLowerCase());
            if (row[0] === 'char_name' || row[0] === 'weapon_name') {
                expect(row[2]).not.toMatch(/^Weapon: (Sword|Catalyst|Bow)$/i);
                expect(row[3]).not.toMatch(/^Weapon: (Sword|Catalyst|Bow)$/i);
            }
        }
    }
});

test('versioned CSVs contain only calculator text and documented source gaps', () => {
    const actual = {};
    for (const file of versionFiles) {
        const rows = readRows(file).slice(1)
            .filter((row) => !row[0].startsWith('feature_'))
            .map((row) => `${row[0]}.${row[1]}`)
            .sort();
        if (rows.length > 0) actual[relativeStringPath(file)] = rows;
    }

    const expected = Object.fromEntries(
        Object.entries(manualExceptions)
            .map(([file, rows]) => [file, [...rows].sort()]),
    );
    expect(actual).toEqual(expected);
    expect(fs.existsSync(path.join(stringsRoot, '7.0/existing_characters.csv'))).toBe(false);
});

test('changed stable character prose is generated under canonical keys', () => {
    const occurrences = collectOccurrences();
    const modules = fs.readdirSync(path.join(root, 'src/js/db/Char'))
        .filter((name) => name.endsWith('.js'))
        .map((name) => fs.readFileSync(path.join(root, 'src/js/db/Char', name), 'utf8'))
        .join('\n');

    for (const name of sourceOwned70Descriptions) {
        const key = `talent_descr.${name}`;
        const entries = occurrences.get(key) || [];
        expect(entries.some(({file}) => /generated[\\/]char_(skills|talents)\.csv$/.test(file))).toBe(true);
        expect(entries.some(({file}) => /[\\/]7\.[01][\\/]/.test(file))).toBe(false);
        expect(modules).toContain(`description: '${key}'`);
    }

    const releaseSources = versionFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    expect(`${releaseSources}\n${modules}`).not.toMatch(/_7_0\b/);
});

test('7.1 character names and source prose are in the ordinary generated files', () => {
    const nameRows = readRows(path.join(stringsRoot, 'generated/char_names.csv'))
        .filter((row) => row[0] === 'char_name' && ['vesna', 'vodyanitsa'].includes(row[1]))
        .sort((left, right) => left[1].localeCompare(right[1]));
    expect(nameRows).toEqual([
        ['char_name', 'vesna', 'Весна', 'Vesna'],
        ['char_name', 'vodyanitsa', 'Водяница', 'Vodyanitsa'],
    ]);

    const characterGeneratedFiles = [
        path.join(stringsRoot, 'generated/char_names.csv'),
        path.join(stringsRoot, 'generated/char_skills.csv'),
        path.join(stringsRoot, 'generated/char_talents.csv'),
    ];
    const characterGeneratedText = characterGeneratedFiles
        .map((file) => fs.readFileSync(file, 'utf8'))
        .join('\n');

    const occurrences = collectOccurrences();
    const vesnaModule = fs.readFileSync(path.join(root, 'src/js/db/Char/Vesna.js'), 'utf8');
    const vodyanitsaModule = fs.readFileSync(path.join(root, 'src/js/db/Char/Vodyanitsa.js'), 'utf8');
    for (const module of [vesnaModule, vodyanitsaModule]) {
        for (const match of module.matchAll(/(?:title|description): '(talent_(?:name|descr)\.[^']+)'/g)) {
            expect(occurrences.has(match[1])).toBe(true);
        }
    }

    const fallback = occurrences.get('talent_descr.n11430001') || [];
    expect(fallback.map(({file}) => relativeStringPath(file))).toEqual(['7.1/vesna.csv']);
    expect(characterGeneratedText).not.toContain(';n11430001;');
});

test('7.x inputs never rely on last-writer-wins string overrides', () => {
    const occurrences = collectOccurrences();
    const conflicts = [];
    for (const [key, entries] of occurrences) {
        if (entries.length < 2) continue;
        if (!entries.some(({file}) => /[\\/]7\.[01][\\/]/.test(file))) continue;
        const values = new Set(entries.map(({values}) => JSON.stringify(values)));
        if (values.size > 1) conflicts.push(key);
    }
    expect(conflicts).toEqual([]);
});

test('release-owned rows contain no unresolved or malformed markup', () => {
    const releaseNames = new Set([
        'zibai', 'alyosha', 'odette', 'traveler_cryo', 'vesna', 'vodyanitsa',
    ]);
    const releaseIds = new Set([
        'n10050002', 'n11260001', 'n11480001', 'n11480002',
        'n11500001', 'n11500002', 'n11500003', 'n11500004',
        'n11400001', 'n11400002',
    ]);
    const releaseKeys = new Set(sourceOwned70Descriptions);
    const files = [
        ...versionFiles,
        path.join(stringsRoot, 'generated/char_names.csv'),
        path.join(stringsRoot, 'generated/char_skills.csv'),
        path.join(stringsRoot, 'generated/char_talents.csv'),
    ];

    for (const file of files) {
        const generatedCharacterFile = /generated[\\/]char_(names|skills|talents)\.csv$/.test(file);
        for (const row of readRows(file).slice(1)) {
            if (row.length !== 4) continue;
            if (
                generatedCharacterFile
                && !releaseNames.has(row[1])
                && !releaseIds.has(row[1])
                && !releaseKeys.has(row[1])
                && !/^(alyosha|odette|vesna|vodyanitsa|traveler_(?:ever_keen_frost|lucent_ice|illusory_frostmirror|foreign_permafrost|somber_freeze|frostfall_reverberation|glacial_shard|enduring_ice|bittercold_fog|brumal_grimfrost|frostbound_javelin|foreign_frostglint|ice_fog_piercer))/.test(row[1])
            ) continue;

            const text = `${row[2]}\n${row[3]}`;
            expect(text).not.toMatch(/talent\{|\{param|\{LINK#|skill\{skill\{|skill\{n\d+:(?:name|skill)\{|skill\{n\d+:\}/i);
            expect((text.match(/\{/g) || [])).toHaveLength((text.match(/\}/g) || []).length);
        }
    }

    const mizuki = readRows(path.join(stringsRoot, 'generated/char_talents.csv'))
        .find((row) => row[0] === 'talent_descr'
            && row[1] === 'yumemizuki_mizuki_the_heart_lingers_long_buffed');
    expect(mizuki[2]).toContain('0,04%');
    expect(mizuki[3]).toContain('0.04%');
    expect(`${mizuki[2]}\n${mizuki[3]}`).not.toMatch(/(?:0[,.]04|1[,.]8|18)00%/);
});
