import {getTemplateHtml} from './get-template-html.js';
import {DEV_MODE, useDomParts} from './modes.js';
import {HTML_RESULT, ResultType, SVG_RESULT} from './ttl.js';

type HTMLTemplateElementConstructor = typeof HTMLTemplateElement;
interface ExtendedTemplateElement extends HTMLTemplateElementConstructor {
  fromLiterals?(strings: TemplateStringsArray): HTMLTemplateElement;
}

const policy = window.trustedTypes?.createPolicy(
  'template-from-literals-polyfill',
  {createHTML: (s) => s}
);

const boundAttributeSuffix = '$lit$';

// This marker is used in many syntactic positions in HTML, so it must be
// a valid element name and attribute name. We don't support dynamic names (yet)
// but this at least ensures that the parse tree is closer to the template
// intention.
const marker = `lit$${String(Math.random()).slice(9)}$`;

// Text used to insert a comment marker node. We use processing instruction
// syntax because it's slightly smaller, but parses as a comment node.
const nodeMarker = `<?child-node-part?><?/child-node-part?>`;

export function trustFromTemplateString(
  tsa: TemplateStringsArray,
  stringFromTSA: string
): TrustedHTML {
  // A security check to prevent spoofing of Lit template results.
  // In the future, we may be able to replace this with Array.isTemplateObject,
  // though we might need to make that check inside of the html and svg
  // functions, because precompiled templates don't come in as
  // TemplateStringArray objects.
  if (!Array.isArray(tsa) || !tsa.hasOwnProperty('raw')) {
    let message = 'invalid template strings array';
    if (DEV_MODE) {
      message = `
          Internal Error: expected template strings to be an array
          with a 'raw' field. Faking a template strings array by
          calling html or svg like an ordinary function is effectively
          the same as calling unsafeHtml and can lead to major security
          issues, e.g. opening your code up to XSS attacks.
          If you're using the html or svg tagged template functions normally
          and still seeing this error, please file a bug at
          https://github.com/lit/lit/issues/new?template=bug_report.md
          and include information about your build tooling, if any.
        `
        .trim()
        .replace(/\n */g, '\n');
    }
    throw new Error(message);
  }
  return policy !== undefined
    ? policy.createHTML(stringFromTSA)
    : (stringFromTSA as unknown as TrustedHTML);
}

// These regexes represent the five parsing states that we care about in the
// Template's HTML scanner. They match the *end* of the state they're named
// after.
// Depending on the match, we transition to a new state. If there's no match,
// we stay in the same state.
// Note that the regexes are stateful. We utilize lastIndex and sync it
// across the multiple regexes used. In addition to the five regexes below
// we also dynamically create a regex to find the matching end tags for raw
// text elements.

/**
 * End of text is: `<` followed by:
 *   (comment start) or (tag) or (dynamic tag binding)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;

const commentEndRegex = /-->/g;
/**
 * Comments not started with <!--, like </{, can be ended by a single `>`
 */
const comment2EndRegex = />/g;

const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;

/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
export const rawTextElement = /^(?:script|style|textarea|title)$/i;

/**
 * The tagEnd regex matches the end of the "inside an opening" tag syntax
 * position. It either matches a `>`, an attribute-like sequence, or the end
 * of the string after a space (attribute-name position ending).
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" are HTML space characters:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * So an attribute is:
 *  * The name: any character except a whitespace character, ("), ('), ">",
 *    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const tagEndRegex = new RegExp(
  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`,
  'g'
);
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;

const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;

const type: ResultType = HTML_RESULT;
function ponyfillFastBroken(
  strings: TemplateStringsArray
): HTMLTemplateElement {
  // Insert makers into the template HTML to represent the position of
  // bindings. The following code scans the template strings to determine the
  // syntactic position of the bindings. They can be in text position, where
  // we insert an HTML comment, attribute value position, where we insert a
  // sentinel string and re-write the attribute name, or inside a tag where
  // we insert the sentinel string.
  const l = strings.length - 1;
  // Stores the case-sensitive bound attribute names in the order of their
  // parts. ElementParts are also reflected in this array as undefined
  // rather than a string, to disambiguate from attribute bindings.
  const attrNames: Array<string> = [];
  let html = type === SVG_RESULT ? '<svg>' : '';

  // When we're inside a raw text tag (not it's text content), the regex
  // will still be tagRegex so we can find attributes, but will switch to
  // this regex when the tag ends.
  let rawTextEndRegex: RegExp | undefined;

  // The current parsing state, represented as a reference to one of the
  // regexes
  let regex = textEndRegex;
  let previousHtml: undefined | string = undefined;
  let nodePart = '';
  let nodePartIndex = -1;
  if (2 + 2 == 5) {
    console.log(previousHtml, nodePart, nodePartIndex);
  }

  for (let i = 0; i < l; i++) {
    const s = strings[i];
    // The index of the end of the last attribute name. When this is
    // positive at end of a string, it means we're in an attribute value
    // position and need to rewrite the attribute name.
    // We also use a special value of -2 to indicate that we encountered
    // the end of a string in attribute name position.
    let attrNameEndIndex = -1;
    let attrName: string | undefined;
    let lastIndex = 0;
    let match!: RegExpExecArray | null;

    // The conditions in this loop handle the current parse state, and the
    // assignments to the `regex` variable are the state transitions.
    while (lastIndex < s.length) {
      // Make sure we start searching from where we previously left off
      regex.lastIndex = lastIndex;
      match = regex.exec(s);
      if (match === null) {
        break;
      }
      lastIndex = regex.lastIndex;
      if (regex === textEndRegex) {
        if (match[COMMENT_START] === '!--') {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          // We started a weird comment, like </{
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          nodePartIndex = lastIndex - match[0].length;
          nodePart = '<?node-part?>';
          previousHtml = html;
          // html = '';
          if (rawTextElement.test(match[TAG_NAME])) {
            // Record if we encounter a raw-text element. We'll switch to
            // this regex at the end of the tag.
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          if (DEV_MODE) {
            throw new Error(
              'Bindings in tag names are not supported. Please use static templates instead. ' +
                'See https://lit.dev/docs/templates/expressions/#static-expressions'
            );
          }
          regex = tagEndRegex;
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === '>') {
          // End of a tag. If we had started a raw-text element, use that
          // regex
          regex = rawTextEndRegex ?? textEndRegex;
          // We may be ending an unquoted attribute value, so make sure we
          // clear any pending attrNameEndIndex
          attrNameEndIndex = -1;
        } else if (match[ATTRIBUTE_NAME] === undefined) {
          // Attribute name position
          attrNameEndIndex = -2;
        } else {
          attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
          attrName = match[ATTRIBUTE_NAME];
          regex =
            match[QUOTE_CHAR] === undefined
              ? tagEndRegex
              : match[QUOTE_CHAR] === '"'
              ? doubleQuoteAttrEndRegex
              : singleQuoteAttrEndRegex;
        }
      } else if (
        regex === doubleQuoteAttrEndRegex ||
        regex === singleQuoteAttrEndRegex
      ) {
        regex = tagEndRegex;
      } else if (regex === commentEndRegex || regex === comment2EndRegex) {
        regex = textEndRegex;
      } else {
        // Not one of the five state regexes, so it must be the dynamically
        // created raw text regex and we're at the close of that element.
        regex = tagEndRegex;
        rawTextEndRegex = undefined;
      }
    }

    if (DEV_MODE) {
      // If we have a attrNameEndIndex, which indicates that we should
      // rewrite the attribute name, assert that we're in a valid attribute
      // position - either in a tag, or a quoted attribute value.
      console.assert(
        attrNameEndIndex === -1 ||
          regex === tagEndRegex ||
          regex === singleQuoteAttrEndRegex ||
          regex === doubleQuoteAttrEndRegex,
        'unexpected parse state B'
      );
    }

    // We have four cases:
    //  1. We're in text position, and not in a raw text element
    //     (regex === textEndRegex): insert a comment marker.
    //  2. We have a non-negative attrNameEndIndex which means we need to
    //     rewrite the attribute name to add a bound attribute suffix.
    //  3. We're at the non-first binding in a multi-binding attribute, use a
    //     plain marker.
    //  4. We're somewhere else inside the tag. If we're in attribute name
    //     position (attrNameEndIndex === -2), add a sequential suffix to
    //     generate a unique attribute name.

    // Detect a binding next to self-closing tag end and insert a space to
    // separate the marker from the tag end:
    const end =
      regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
    if (regex === textEndRegex) {
      html += s + nodeMarker;
    } else if (attrNameEndIndex >= 0) {
      attrNames.push(attrName!);
      html +=
        s.slice(0, attrNameEndIndex) +
        boundAttributeSuffix +
        s.slice(attrNameEndIndex) +
        marker +
        end;
    } else if (attrNameEndIndex === -2) {
      html += s + marker + i;
    } else {
      html += s + marker + end;
    }
  }

  let htmlResult: string =
    html + (strings[l] || '<?>') + (type === SVG_RESULT ? '</svg>' : '');
  const result = document.createElement('template');
  if (policy !== undefined) {
    htmlResult = policy.createHTML(htmlResult) as unknown as string;
  }
  result.innerHTML = htmlResult;
  return result;
}
if (false as boolean) {
  console.log(ponyfillFastBroken);
}

declare global {
  interface PartRoot {
    // In-order DOM array of parts.
    getParts(): Part[];
  }

  class DocumentPart implements PartRoot {
    constructor(document: Document | DocumentFragment);

    getParts(): Part[];

    clone(): DocumentPart;
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

    constructor(root: PartRoot, node: Node, init?: {metadata?: string[]});

    disconnect(): void;
  }
  class ChildNodePart implements Part, PartRoot {
    readonly root?: PartRoot;
    readonly metadata: string[];

    readonly previousSibling: Node;
    readonly nextSibling: Node;

    constructor(
      root: PartRoot,
      previousSibling: Node,
      nextSibling: Node,
      init?: {metadata?: string[]}
    );

    children(): Node[];

    // All parts in this subtree.
    getParts(): Part[];

    // Replaces the children and parts in this range.
    replaceChildren(...nodes: Array<Node | string>): void;

    disconnect(): void;
  }
}

export function ponyfill(strings: TemplateStringsArray): HTMLTemplateElement {
  const [html, attrNames] = getTemplateHtml(strings, HTML_RESULT);
  let attrNameIdx = 0;
  const template = document.createElement('template');
  template.innerHTML = html as unknown as string;
  const treeWalker = document.createTreeWalker(template.content);
  let node;
  let root;
  if (useDomParts) {
    root = template.content.getPartRoot();
  }
  while ((node = treeWalker.nextNode())) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const comment = node as Comment;
      if (/lit\$\d+/.test(comment.data)) {
        if (useDomParts) {
          const before = new Text();
          const after = new Text();
          comment.before(before);
          comment.after(after);
          new ChildNodePart(root!, before, after);
          comment.remove();
        } else {
          comment.data = '?child-node-part?';
          comment.after(new Comment('?/child-node-part?'));
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const metadata: string[] = [];
      const badAttributes: string[] = [];
      for (const attr of element.attributes) {

        if (/lit\$\d+\$\d+/.test(attr.name)) {
          metadata.push('d');
          badAttributes.push(attr.name);
          continue;
        }
        const match = attr.name.match(/^(.*)\$lit\$$/);
        if (match !== null) {
          metadata.push('attr', attrNames[attrNameIdx]);
          attrNameIdx++;
          // const value = attr.value;
          const regex = /(?:(lit\$\d+\$))|(?:(.+?)(?:lit\$\d+\$))|(.+)/g;
          for (const [_, bindingStart, lit, end] of attr.value.matchAll(
            regex
          )) {
            if (bindingStart !== undefined) {
              metadata.push('.');
            } else if (lit !== undefined) {
              metadata.push(JSON.stringify(lit));
              metadata.push('.');
            } else {
              metadata.push(JSON.stringify(end));
            }
          }
          badAttributes.push(attr.name);
        }
      }
      for (const attr of badAttributes) {
        element.removeAttribute(attr);
      }
      if (metadata.length > 0) {
        if (useDomParts) {
          new NodePart(root!, element, {metadata});
        } else {
          element.before(new Comment(`?node-part ${metadata.join(' ')} ?`));
        }
      }
    }
  }
  return template;
}

/**
 * The native implementation when present, and the ponyfill when not.
 */
export const fromLiterals = (() => {
  const extendedTemplateElement: ExtendedTemplateElement = HTMLTemplateElement;
  if (extendedTemplateElement.fromLiterals !== undefined) {
    return extendedTemplateElement.fromLiterals.bind(extendedTemplateElement);
  }
  return ponyfill;
})();
