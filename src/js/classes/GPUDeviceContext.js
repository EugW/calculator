/** A worker owns the device; execution engines borrow it and own their buffers. */
export class GPUDeviceContext {
    constructor() {
        this.device = null;
        this.pending = new Set();
        this.initializing = null;
        this.generation = 0;
    }

    async initialize(requiredStorageBuffers = 4) {
        if (!this.device) {
            if (!this.initializing) {
                this.initializing = this.acquire().finally(() => { this.initializing = null; });
            }
            await this.initializing;
        }
        return !!this.device && this.device.limits.maxStorageBuffersPerShaderStage >= requiredStorageBuffers;
    }

    async acquire() {
        if (!globalThis.navigator?.gpu) return;
        const generation = this.generation;
        try {
            const adapter = await navigator.gpu.requestAdapter({powerPreference: 'high-performance'});
            if (!adapter || adapter.limits.maxStorageBuffersPerShaderStage < 4) return;
            // Request room for both engines when available. A device supporting
            // only the ordinary engine can still run normal artifact searches.
            const device = await adapter.requestDevice({requiredLimits: {
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                maxBufferSize: adapter.limits.maxBufferSize,
                maxStorageBuffersPerShaderStage: Math.min(6, adapter.limits.maxStorageBuffersPerShaderStage),
            }});
            if (generation !== this.generation) {
                device.destroy();
                return;
            }
            this.device = device;
            device.lost.then(info => {
                if (this.device === device) this.device = null;
                this.rejectPending(device, new Error(`WebGPU device lost: ${info.message}`));
            });
        } catch (error) {
            console.error('WebGPU initialization failed:', error);
        }
    }

    rejectPending(device, error) {
        for (const pending of this.pending) {
            if (pending.device === device) pending.reject(error);
        }
    }

    /** Reject queue/readback waits on device loss, even if the driver stalls. */
    waitFor(promise, device = this.device) {
        if (!device || device !== this.device) return Promise.reject(new Error('WebGPU device lost'));
        return new Promise((resolve, reject) => {
            const pending = {device, reject: error => { this.pending.delete(pending); reject(error); }};
            this.pending.add(pending);
            Promise.resolve(promise).then(value => {
                this.pending.delete(pending);
                resolve(value);
            }, pending.reject);
        });
    }

    destroy() {
        ++this.generation;
        const device = this.device;
        this.device = null;
        if (device) {
            this.rejectPending(device, new Error('WebGPU device destroyed'));
            device.destroy();
        }
    }
}

export function checkGPUBufferSize(device, bytes) {
    if (bytes > Math.min(device.limits?.maxBufferSize ?? Infinity,
        device.limits?.maxStorageBufferBindingSize ?? Infinity)) {
        throw new RangeError('GPU buffers exceed device limits');
    }
}

export function createGPUStorageBuffer(device, data, label) {
    checkGPUBufferSize(device, data.byteLength);
    const buffer = device.createBuffer({label, size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
    try {
        device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    } catch (error) {
        buffer.destroy();
        throw error;
    }
}
