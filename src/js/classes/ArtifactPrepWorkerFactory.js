/**
 * Real nested-worker factory for the candidate pool. Isolated in its own module
 * because the literal `new Worker(new URL(..., import.meta.url))` pattern
 * (required for webpack to emit the worker chunk) defeats the babel CJS
 * transform used by jest: any module textually containing import.meta
 * cannot be imported by the test suites. The pool loads this module dynamically when constructing a worker;
 * construction failure selects the inline fallback.
 */
export function createPrepWorker() {
    return new Worker(new URL('../workers/ArtifactPrep.js', import.meta.url));
}
