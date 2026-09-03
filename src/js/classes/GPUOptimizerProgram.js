import {WGSLMegaKernelCompiler} from './Feature2/WGSLCompiler';
import {MAX_GPU_STAT_CONSTRAINTS, normalizeSetConstraintThresholds, normalizeStatConstraintBounds} from './OptimizerConstraints';

export function gpuNow() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/** CPU lowering can run in the candidate worker, without a GPU device. */
export function lowerGPUProgram(source, buildKernel) {
    const started = gpuNow();
    const isPlan = source?.kind === 'optimization-plan';
    if (isPlan) validateOptimizationPlanForGPU(source);
    const compiler = new WGSLMegaKernelCompiler();
    if (isPlan) compiler.addOptimizationPlan(source);
    else for (const [id, variation] of Object.entries(source)) compiler.addVariation(id, variation);
    const code = buildKernel(compiler);
    const profile = {kernelBuildMs: gpuNow() - started};
    const statIndexMap = Object.freeze({...compiler.getStatIndexMap()});
    profile.statCount = Object.keys(statIndexMap).length;
    profile.variationCount = isPlan ? source.variations.length : Object.keys(source).length;
    profile.kernelCodeLength = code.length;
    return {code, statIndexMap, variationMap: compiler.buildVariationMap(),
        optimizationPlan: isPlan ? source : null, featureVariants: isPlan ? null : source, profile};
}

/** Compile locally lowered code or a candidate worker's transferable program. */
export async function prepareGPUProgram(context, source, buildKernel) {
    const device = context.device;
    if (!device) throw new Error('WebGPU not initialized');
    const started = gpuNow();
    const lowered = source?.kind === 'gpu-program' ? source : lowerGPUProgram(source, buildKernel);
    const {code} = lowered;
    const profile = {...lowered.profile};
    let stage = gpuNow();
    const module = device.createShaderModule({code});
    profile.createShaderModuleMs = gpuNow() - stage;
    stage = gpuNow();
    const info = await context.waitFor(module.getCompilationInfo(), device);
    profile.compilationInfoMs = gpuNow() - stage;
    for (const message of info.messages) {
        if (message.type === 'error') throw new Error('WGSL compilation failed: ' + message.message);
        if (message.type === 'warning') console.warn('WGSL warning:', message.message);
    }
    profile.totalMs = gpuNow() - started;
    return Object.freeze({...lowered, device, module,
        statIndexMap: Object.freeze({...lowered.statIndexMap}), profile});
}

/** Resolve semantics once, before either execution engine allocates run data. */
export function resolveGPUSemantics(prepared, opts) {
    const plan = prepared.optimizationPlan;
    if (plan && ['settings', 'damageIndex', 'constraintBounds'].some(key => Object.prototype.hasOwnProperty.call(opts, key))) {
        throw new TypeError('GPU optimizer semantics are bound by OptimizationPlan; settings, damageIndex, and constraintBounds cannot be overridden');
    }
    const raw = plan ? {setMinValues: plan.setConstraints.minValues, setMaxValues: plan.setConstraints.maxValues} : (opts.settings || {});
    const normalized = plan ? null : normalizeSetConstraintThresholds(raw.setMinValues, raw.setMaxValues);
    const settings = plan ? raw : {...raw, setMinValues: normalized.minValues, setMaxValues: normalized.maxValues};
    const constraintBounds = plan ? plan.statConstraints.bounds
        : opts.constraintBounds === undefined ? normalizeStatConstraintBounds(raw.stats) : opts.constraintBounds;
    const damageIndex = plan ? plan.objective.vectorIndex : (opts.damageIndex === undefined ? 2 : opts.damageIndex);
    if (!Number.isInteger(damageIndex) || damageIndex < 0 || damageIndex > 2) {
        throw new RangeError('GPU optimizer damageIndex must be 0, 1, or 2, got ' + damageIndex);
    }
    return {plan, settings, constraintBounds, damageIndex, variationSource: plan || prepared.featureVariants};
}

function validateOptimizationPlanForGPU(plan) {
    if (plan.numericPolicy?.gpuArithmetic !== 'f32') {
        throw new RangeError('GPU optimization plan must declare f32 GPU arithmetic');
    }
    if (!Number.isInteger(plan.objective?.vectorIndex) || plan.objective.vectorIndex < 0 || plan.objective.vectorIndex > 2) {
        throw new RangeError('GPU optimization plan objective vector index is invalid');
    }
    if (!Array.isArray(plan.statConstraints?.predicates)) {
        throw new TypeError('GPU optimization plan has no stat constraint predicates');
    }
    if (plan.statConstraints.predicates.length > MAX_GPU_STAT_CONSTRAINTS) {
        throw new RangeError(
            `GPU optimizer supports at most ${MAX_GPU_STAT_CONSTRAINTS} constrained stats; got ${plan.statConstraints.predicates.length}`
        );
    }

    for (const variation of plan.variations || []) {
        for (const term of variation.selector?.terms || []) {
            if (term.minimumInclusive !== 2 && term.minimumInclusive !== 4) {
                throw new RangeError(
                    `GPU optimizer variation for set "${term.setName}" uses unsupported ${term.minimumInclusive}-piece semantics`
                );
            }
        }
    }
}
