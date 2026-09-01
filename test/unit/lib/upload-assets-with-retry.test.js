import uploadAssetsWithRetry from '../../../src/lib/upload-assets-with-retry';

test('uploads every asset when they all succeed on the first try', async () => {
    const assets = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
    const uploaded = [];
    const uploadOne = asset => {
        uploaded.push(asset.id);
        return Promise.resolve();
    };
    await uploadAssetsWithRetry(assets, uploadOne, {concurrency: 2, retries: 0, retryDelayMs: 0});
    expect(uploaded.sort()).toEqual(['a', 'b', 'c']);
});

test('never has more than `concurrency` uploads in flight at the same time', async () => {
    const assets = [{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}];
    let inFlight = 0;
    let maxInFlight = 0;
    const uploadOne = () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise(resolve => setTimeout(() => {
            inFlight--;
            resolve();
        }, 5));
    };
    await uploadAssetsWithRetry(assets, uploadOne, {concurrency: 2, retries: 0, retryDelayMs: 0});
    expect(maxInFlight).toBeLessThanOrEqual(2);
});

test('retries a failing asset up to `retries` times before succeeding', async () => {
    const asset = {id: 'flaky'};
    let attempts = 0;
    const uploadOne = () => {
        attempts++;
        if (attempts < 3) return Promise.reject(new Error('transient 500'));
        return Promise.resolve();
    };
    await uploadAssetsWithRetry([asset], uploadOne, {concurrency: 1, retries: 2, retryDelayMs: 1});
    expect(attempts).toBe(3);
});

test('propagates the error once an asset exhausts all its retries', async () => {
    const asset = {id: 'always-fails'};
    let attempts = 0;
    const uploadOne = () => {
        attempts++;
        return Promise.reject(new Error('permanent 500'));
    };
    let caught = null;
    try {
        await uploadAssetsWithRetry([asset], uploadOne, {concurrency: 1, retries: 2, retryDelayMs: 1});
    } catch (err) {
        caught = err;
    }
    expect(caught && caught.message).toBe('permanent 500');
    expect(attempts).toBe(3); // intento inicial + 2 reintentos
});

test('one asset exhausting its retries does not stop the others from uploading', async () => {
    const assets = [{id: 'bad'}, {id: 'good-1'}, {id: 'good-2'}];
    const succeeded = [];
    const uploadOne = asset => {
        if (asset.id === 'bad') return Promise.reject(new Error('permanent 500'));
        succeeded.push(asset.id);
        return Promise.resolve();
    };
    let caught = null;
    try {
        await uploadAssetsWithRetry(assets, uploadOne, {concurrency: 3, retries: 1, retryDelayMs: 1});
    } catch (err) {
        caught = err;
    }
    expect(caught && caught.message).toBe('permanent 500');
    expect(succeeded.sort()).toEqual(['good-1', 'good-2']);
});
