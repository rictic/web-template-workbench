/// <reference types="trusted-types" />
import { ResultType } from './ttl.js';
export declare const boundAttributeSuffix = "$lit$";
export declare const marker: string;
export declare const markerMatch: string;
export declare function trustFromTemplateString(tsa: TemplateStringsArray, stringFromTSA: string): TrustedHTML;
/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
export declare const rawTextElement: RegExp;
/**
 * Returns an HTML string for the given TemplateStringsArray and result type
 * (HTML or SVG), along with the case-sensitive bound attribute names in
 * template order. The HTML contains comment markers denoting the `ChildPart`s
 * and suffixes on bound attributes denoting the `AttributeParts`.
 *
 * @param strings template strings array
 * @param type HTML or SVG
 * @return Array containing `[html, attrNames]` (array returned for terseness,
 *     to avoid object fields since this code is shared with non-minified SSR
 *     code)
 */
export declare const getTemplateHtml: (strings: TemplateStringsArray, type: ResultType) => [TrustedHTML, Array<string>];
//# sourceMappingURL=get-template-html.d.ts.map