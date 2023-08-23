/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { RenderOptions } from './render.js';
import { TemplateResult } from './ttl.js';
export declare const isIterable: (value: unknown) => value is Iterable<unknown>;
declare const ATTRIBUTE_PART = 1;
declare const CHILD_PART = 2;
declare const ELEMENT_PART = 6;
declare const COMMENT_PART = 7;
export type Template = ManualTemplate | DomPartsTemplate;
export declare class ManualTemplate {
    /** @internal */
    el: HTMLTemplateElement;
    parts: Array<TemplatePart>;
    constructor({ strings, ['_$litType$']: type }: TemplateResult, _options?: RenderOptions);
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
export declare class ManualTemplateInstance {
    template: Template;
    parts: Array<Part | undefined>;
    constructor(template: Template);
    clone(options: RenderOptions): Node;
}
export declare class DomPartsTemplate {
    /** @internal */
    el: HTMLTemplateElement;
    readonly parts: Array<TemplatePart>;
    constructor({ strings, ['_$litType$']: type }: TemplateResult, _options?: RenderOptions);
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
export declare class DomPartsTemplateInstance {
    template: Template;
    parts: Array<Part | undefined>;
    constructor(template: DomPartsTemplate);
    clone(options: RenderOptions): Document | DocumentFragment;
}
export type TemplateInstance = DomPartsTemplateInstance | ManualTemplateInstance;
type AttributeTemplatePart = {
    readonly type: typeof ATTRIBUTE_PART;
    readonly index: number;
    readonly name: string;
    readonly ctor: typeof AttributePart;
    readonly strings: ReadonlyArray<string>;
};
type ChildTemplatePart = {
    readonly type: typeof CHILD_PART;
    readonly index: number;
};
type ElementTemplatePart = {
    readonly type: typeof ELEMENT_PART;
    readonly index: number;
};
type CommentTemplatePart = {
    readonly type: typeof COMMENT_PART;
    readonly index: number;
};
/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
type TemplatePart = ChildTemplatePart | AttributeTemplatePart | ElementTemplatePart | CommentTemplatePart;
export type Part = ChildPart | AttributePart;
export declare class ChildPart {
    readonly type = 2;
    readonly options: RenderOptions;
    committedValue: unknown;
    startNode: ChildNode;
    endNode: ChildNode | null;
    constructor(startNode: ChildNode, endNode: ChildNode | null, _parent: TemplateInstance | ChildPart | undefined, options: RenderOptions);
}
export declare class AttributePart {
    readonly type: 1 | 3 | 4 | 5;
    readonly element: HTMLElement;
    readonly name: string;
    readonly options: RenderOptions | undefined;
    /**
     * If this attribute part represents an interpolation, this contains the
     * static strings of the interpolation. For single-value, complete bindings,
     * this is undefined.
     */
    readonly strings?: ReadonlyArray<string>;
    /** @internal */
    value: unknown | Array<unknown>;
    constructor(element: HTMLElement, name: string, strings: ReadonlyArray<string>);
}
export {};
//# sourceMappingURL=template.d.ts.map