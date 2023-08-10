/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const identityFunction = (value) => value;
const noopSanitizer = (_node, _name, _type) => identityFunction;
/** Sets the global sanitizer factory. */
const setSanitizer = (newSanitizer) => {
    if (sanitizerFactoryInternal !== noopSanitizer) {
        throw new Error(`Attempted to overwrite existing lit-html security policy.` +
            ` setSanitizeDOMValueFactory should be called at most once.`);
    }
    sanitizerFactoryInternal = newSanitizer;
};
/**
 * Only used in internal tests, not a part of the public API.
 */
const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
    sanitizerFactoryInternal = noopSanitizer;
};
const createSanitizer = (node, name, type) => {
    return sanitizerFactoryInternal(node, name, type);
};
const sanitizerActive = () => sanitizerFactoryInternal !== noopSanitizer;
let sanitizerFactoryInternal = noopSanitizer;

export { _testOnlyClearSanitizerFactoryDoNotCallOrElse, createSanitizer, noopSanitizer, sanitizerActive, setSanitizer };
//# sourceMappingURL=sanitizer.js.map
