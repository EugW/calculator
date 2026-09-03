import { Worker } from 'worker_threads';
import { Artifact } from '../src/js/classes/Artifact';
import { CalcSet } from '../src/js/classes/CalcSet';
import { DB } from '../src/js/db/DB';
import { evaluateArtifactActionCandidate } from '../src/js/classes/ArtifactActionPrep';
import { normalizeArtifactRVFilters } from '../src/js/classes/ArtifactUsefulRV';

global.DB = DB;

// Exercise the actual candidate GPU boundary through a real thread. The GPU
// reply selects companion zero; CPU rescoring must use the retained f64 data,
// even after every numeric input buffer has detached from the candidate.
test('candidate transfers GPU inputs and retains the state needed for f64 rescore and gallery', async () => {
    const build = new CalcSet();
    build.setChar(DB.Chars.get('Jean'));
    build.setEnemy(DB.Enemies.getFirst().getFirst());
    const inventory = Object.entries({flower: 'hp', plume: 'atk', sands: 'atk_percent', goblet: 'dmg_phys', circlet: 'crit_dmg'})
        .map(([slot, main]) => new Artifact(5, 20, slot, 'GladiatorFinale', main, []));
    const input = {kind: 'craft', set: 'GladiatorFinale', feature: 'stats.crit_dmg', baseValue: 1,
        build: build.serialize(), inventory: inventory.map(art => art.serialize()),
        inventoryHashes: inventory.map(art => art.getHash()), group: {slot: 'flower'},
        craftAffixes: {flower: {mainStat: 'hp', substats: ['crit_dmg', 'def']}},
        rvFilters: normalizeArtifactRVFilters(), topologySpecs: [], retainOutcomes: true};
    const worker = new Worker(`
        const {parentPort} = require('worker_threads');
        parentPort.on('message', request => {
            const {outcomeCount, complementCount, outcomeRows} = request.inputs;
            if (!outcomeRows.length || request.program.kind !== 'gpu-program') throw new Error('Invalid GPU request');
            // (value, chunk-local build, chunk, pad): build 0 of chunk 0 wins.
            const readback = new Uint32Array(outcomeCount * 4);
            const values = new Float32Array(readback.buffer);
            for (let i = 0; i < outcomeCount; ++i) values[i * 4] = 123;
            parentPort.postMessage({readback, outcomeCount, complementCount, shards: 1}, [readback.buffer]);
        });
    `, {eval: true});
    let detached = 0;
    const stages = [];
    try {
        const result = await evaluateArtifactActionCandidate(structuredClone(input), {
            onProgress: update => stages.push(update.key || update.phase),
            executeGPU: request => new Promise((resolve, reject) => {
                worker.once('message', resolve);
                worker.once('error', reject);
                const transfer = Object.values(request.inputs).filter(ArrayBuffer.isView).map(view => view.buffer);
                worker.postMessage(request, transfer);
                detached = transfer.length;
                expect(detached).toBeGreaterThan(5);
                expect(transfer.every(buffer => buffer.byteLength === 0)).toBe(true);
            }),
        });
        expect(result.rows[0].probabilitySum).toBeCloseTo(1, 12);
        expect(result.rows[0].outcomeDetails.length).toBeGreaterThan(0);
        expect(stages).toContain('rescore');
        expect(stages).toContain('gallery');
        expect(result.rows[0].expectedValue).not.toBe(123); // f64 scorer, not the dummy GPU value
        for (const ids of result.rows[0].outcomeDetails.builds) expect(ids).toEqual([1, 2, 3, 4]);
    } finally { await worker.terminate(); }
});
