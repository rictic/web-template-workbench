/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

export const DEV_MODE = true;
export const ENABLE_EXTRA_SECURITY_HOOKS = true;
export const NODE_MODE = false;

export const domPartsSupported = typeof ChildNodePart !== 'undefined';

export const useDomParts = domPartsSupported;
