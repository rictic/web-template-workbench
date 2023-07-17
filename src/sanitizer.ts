import { ENABLE_EXTRA_SECURITY_HOOKS } from "./modes.js";

/**
 * Used to sanitize any value before it is written into the DOM. This can be
 * used to implement a security policy of allowed and disallowed values in
 * order to prevent XSS attacks.
 *
 * One way of using this callback would be to check attributes and properties
 * against a list of high risk fields, and require that values written to such
 * fields be instances of a class which is safe by construction. Closure's Safe
 * HTML Types is one implementation of this technique (
 * https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md).
 * The TrustedTypes polyfill in API-only mode could also be used as a basis
 * for this technique (https://github.com/WICG/trusted-types).
 *
 * @param node The HTML node (usually either a #text node or an Element) that
 *     is being written to. Note that this is just an exemplar node, the write
 *     may take place against another instance of the same class of node.
 * @param name The name of an attribute or property (for example, 'href').
 * @param type Indicates whether the write that's about to be performed will
 *     be to a property or a node.
 * @return A function that will sanitize this class of writes.
 */
export type SanitizerFactory = (
  node: Node,
  name: string,
  type: 'property' | 'attribute'
) => ValueSanitizer;

/**
 * A function which can sanitize values that will be written to a specific kind
 * of DOM sink.
 *
 * See SanitizerFactory.
 *
 * @param value The value to sanitize. Will be the actual value passed into
 *     the lit-html template literal, so this could be of any type.
 * @return The value to write to the DOM. Usually the same as the input value,
 *     unless sanitization is needed.
 */
export type ValueSanitizer = (value: unknown) => unknown;

const identityFunction: ValueSanitizer = (value: unknown) => value;
export const noopSanitizer: SanitizerFactory = (
  _node: Node,
  _name: string,
  _type: 'property' | 'attribute'
) => identityFunction;

/** Sets the global sanitizer factory. */
export const setSanitizer = (newSanitizer: SanitizerFactory) => {
  if (!ENABLE_EXTRA_SECURITY_HOOKS) {
    return;
  }
  if (sanitizerFactoryInternal !== noopSanitizer) {
    throw new Error(
      `Attempted to overwrite existing lit-html security policy.` +
        ` setSanitizeDOMValueFactory should be called at most once.`
    );
  }
  sanitizerFactoryInternal = newSanitizer;
};

/**
 * Only used in internal tests, not a part of the public API.
 */
export const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
  sanitizerFactoryInternal = noopSanitizer;
};

export const createSanitizer: SanitizerFactory = (node, name, type) => {
  return sanitizerFactoryInternal(node, name, type);
};

export const sanitizerActive = () =>
  sanitizerFactoryInternal !== noopSanitizer;

let sanitizerFactoryInternal: SanitizerFactory = noopSanitizer;
