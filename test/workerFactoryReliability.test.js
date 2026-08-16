import { WorkerFactory } from "../src/js/classes/WorkerFactory";

class FakeWorker {
    constructor() {
        this.terminate = jest.fn();
        this.postMessage = jest.fn();
    }
}

class TestWorkerFactory extends WorkerFactory {
    constructor(params, workerCount = 3) {
        super(params);
        this.workerCount = workerCount;
        this.createdWorkers = [];
    }

    createWorker() {
        const worker = new FakeWorker();
        this.createdWorkers.push(worker);
        return worker;
    }

    getWorkersPayload() {
        return Array.from({ length: this.workerCount }, (_, index) => ({ index: index }));
    }

    getResult() {
        return this.workers.map((item) => item.result.value);
    }
}

beforeEach(() => {
    global.UI = { debug: jest.fn() };
});

afterEach(() => {
    delete global.UI;
});

test("the first worker error aborts pending work and suppresses success", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback });

    factory.run({});
    const [completedWorker, failedWorker, pendingWorker] = factory.createdWorkers;
    const latePendingMessage = pendingWorker.onmessage;
    const duplicateFailure = failedWorker.onerror;

    completedWorker.onmessage({ data: { value: "partial" } });
    const preventDefault = jest.fn();
    failedWorker.onerror({ message: "GPU adapter was lost", preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenCalledWith({
        worker: 1,
        error: "GPU adapter was lost",
    });
    expect(completedWorker.terminate).not.toHaveBeenCalled();
    expect(failedWorker.terminate).toHaveBeenCalledTimes(1);
    expect(pendingWorker.terminate).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    latePendingMessage({ data: { value: "late result" } });
    duplicateFailure({ message: "duplicate error" });

    expect(callback).not.toHaveBeenCalled();
    expect(errorCallback).toHaveBeenCalledTimes(1);
});

test("a successful run settles once and ignores later worker events", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback }, 2);

    factory.run({});
    const [firstWorker, secondWorker] = factory.createdWorkers;
    const lateSecondMessage = secondWorker.onmessage;
    const lateSecondDecodeError = secondWorker.onmessageerror;

    firstWorker.onmessage({ data: { value: 10 } });
    secondWorker.onmessage({ data: { value: 20 } });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([10, 20]);

    lateSecondMessage({ data: { value: 30 } });
    lateSecondDecodeError({ message: "late decode error" });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(errorCallback).not.toHaveBeenCalled();
});

test("a postMessage failure follows the same fatal error path", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback }, 2);
    const originalCreateWorker = factory.createWorker.bind(factory);

    factory.createWorker = () => {
        const worker = originalCreateWorker();
        if (factory.createdWorkers.length === 1) {
            worker.postMessage.mockImplementation(() => {
                throw new Error("Payload could not be cloned");
            });
        }
        return worker;
    };

    factory.run({});

    expect(errorCallback).toHaveBeenCalledWith({
        worker: 0,
        error: "Payload could not be cloned",
    });
    expect(factory.createdWorkers[0].terminate).toHaveBeenCalledTimes(1);
    expect(factory.createdWorkers[1].terminate).toHaveBeenCalledTimes(1);
    expect(factory.createdWorkers[1].postMessage).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
});

test("events from a terminated run cannot settle or abort its replacement", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback }, 1);

    factory.run({ run: "old" });
    const oldWorker = factory.createdWorkers[0];
    const staleMessage = oldWorker.onmessage;
    const staleError = oldWorker.onerror;

    factory.run({ run: "new" });
    const newWorker = factory.createdWorkers[1];

    staleMessage({ data: { value: "stale" } });
    staleError({ message: "stale failure" });

    expect(callback).not.toHaveBeenCalled();
    expect(errorCallback).not.toHaveBeenCalled();

    newWorker.onmessage({ data: { value: "fresh" } });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(["fresh"]);
    expect(errorCallback).not.toHaveBeenCalled();
});

test("payload preparation failures use the fatal error path", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback }, 1);
    factory.getWorkersPayload = () => {
        throw new Error("Could not prepare worker payloads");
    };

    expect(() => factory.run({})).not.toThrow();
    expect(errorCallback).toHaveBeenCalledWith({
        worker: -1,
        error: "Could not prepare worker payloads",
    });
    expect(callback).not.toHaveBeenCalled();
});

test("worker construction failures use the fatal error path", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback }, 1);
    factory.createWorker = () => {
        throw new Error("Worker creation blocked by CSP");
    };

    expect(() => factory.run({})).not.toThrow();
    expect(errorCallback).toHaveBeenCalledWith({
        worker: 0,
        error: "Worker creation blocked by CSP",
    });
    expect(callback).not.toHaveBeenCalled();
});

test("start callback failures use the fatal error path before work is posted", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({
        callback,
        errorCallback,
        startCallback: () => {
            throw new Error("Progress UI could not start");
        },
    }, 1);

    expect(() => factory.run({})).not.toThrow();
    expect(errorCallback).toHaveBeenCalledWith({
        worker: -1,
        error: "Progress UI could not start",
    });
    expect(factory.createdWorkers[0].terminate).toHaveBeenCalledTimes(1);
    expect(factory.createdWorkers[0].postMessage).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
});

test("message decoding failures use the fatal error path", () => {
    const callback = jest.fn();
    const errorCallback = jest.fn();
    const factory = new TestWorkerFactory({ callback, errorCallback }, 1);

    factory.run({});
    const worker = factory.createdWorkers[0];
    worker.onmessage({ data: undefined });

    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback.mock.calls[0][0]).toEqual({
        worker: 0,
        error: expect.stringMatching(/progress/),
    });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
});
