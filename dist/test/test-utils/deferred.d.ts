/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * A helper for creating Promises that can be resolved or rejected after
 * initial creation.
 */
export declare class Deferred<T> {
    readonly promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    constructor();
}
//# sourceMappingURL=deferred.d.ts.map