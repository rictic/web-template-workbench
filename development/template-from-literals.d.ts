/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { ResultType } from './ttl.js';
declare global {
    interface PartRoot {
        getParts(): Part[];
    }
    class DocumentPart implements PartRoot {
        constructor(rootContainer: Document | DocumentFragment);
        getParts(): Part[];
        clone(): DocumentPart;
        readonly rootContainer: Document | DocumentFragment;
    }
    interface Document {
        getPartRoot(): DocumentPart;
    }
    interface DocumentFragment {
        getPartRoot(): DocumentPart;
    }
    interface Part {
        readonly root?: PartRoot;
        readonly metadata: string[];
        disconnect(): void;
    }
    class NodePart implements Part {
        readonly root?: PartRoot;
        readonly metadata: string[];
        readonly node: Node;
        constructor(root: PartRoot, node: Node, init?: {
            metadata?: string[];
        });
        disconnect(): void;
    }
    class ChildNodePart implements Part, PartRoot {
        readonly root?: PartRoot;
        readonly metadata: string[];
        readonly previousSibling: ChildNode;
        readonly nextSibling: ChildNode;
        constructor(root: PartRoot, previousSibling: Node, nextSibling: Node, init?: {
            metadata?: string[];
        });
        children(): Node[];
        getParts(): Part[];
        replaceChildren(...nodes: Array<Node | string>): void;
        disconnect(): void;
    }
}
/**
 * A crack at a simple ponyfill of
 * https://github.com/WICG/webcomponents/issues/1019 extended with an encoding
 * for attribute and element bindings in the returned NodePart's metadata.
 *
 * See the tests at ./test/template-from-literals_test.ts for more info.
 */
export declare function templateFromLiterals(strings: TemplateStringsArray, type: ResultType | undefined, useDomParts: boolean): HTMLTemplateElement;
//# sourceMappingURL=template-from-literals.d.ts.map