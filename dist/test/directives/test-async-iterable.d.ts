/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * An async iterable that can have values pushed into it for testing code
 * that consumes async iterables. This iterable can only be safely consumed
 * by one listener.
 */
export declare class TestAsyncIterable<T> implements AsyncIterable<T> {
    /**
     * A Promise that resolves with the next value to be returned by the
     * async iterable returned from iterable()
     */
    private _nextValue;
    private _resolveNextValue;
    [Symbol.asyncIterator](): AsyncGenerator<Awaited<T>, void, unknown>;
    /**
     * Pushes a new value and returns a Promise that resolves when the value
     * has been emitted by the iterator. push() must not be called before
     * a previous call has completed, so always await a push() call.
     */
    push(value: T): Promise<void>;
}
//# sourceMappingURL=test-async-iterable.d.ts.map