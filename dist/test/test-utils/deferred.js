/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * A helper for creating Promises that can be resolved or rejected after
 * initial creation.
 */
export class Deferred {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}
//# sourceMappingURL=deferred.js.map