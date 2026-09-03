import { createArtifactCandidateHandler } from '../../src/js/classes/ArtifactActionPrep';

// The production handler, with the same clone and transfer boundary as a real
// worker. Gates let tests pause individual candidates without timing guesses.
export function makeFakePrepWorker({failPrep, beforePrep, beforeGPUResult} = {}) {
    const listeners = {message: [], error: [], messageerror: []};
    let terminated = false;
    const emit = (data, transfer = []) => {
        if (terminated) return;
        const cloned = structuredClone(data, {transfer});
        worker.sent.push(cloned);
        for (const fn of [...listeners.message]) fn({data: cloned});
    };
    const handler = createArtifactCandidateHandler(emit);
    const worker = {
        messages: [], sent: [],
        get terminated() { return terminated; },
        postMessage(message, transfer = []) {
            const data = structuredClone(message, {transfer});
            worker.messages.push(data);
            queueMicrotask(async () => {
                if (terminated) return;
                try {
                    if (data.type === 'CANDIDATE') {
                        await beforePrep?.(data);
                        if (failPrep) throw new Error(failPrep);
                    }
                    if (data.type === 'GPU_RESULT') await beforeGPUResult?.(data);
                    if (!terminated) await handler({data});
                } catch (error) {
                    emit({type: 'ERROR', jobId: data.jobId, message: error.message});
                }
            });
        },
        addEventListener(event, fn) { listeners[event].push(fn); },
        removeEventListener(event, fn) {
            const at = listeners[event].indexOf(fn);
            if (at >= 0) listeners[event].splice(at, 1);
        },
        terminate() { terminated = true; },
    };
    return worker;
}
