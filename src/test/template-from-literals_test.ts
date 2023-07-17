import {useDomParts} from '../modes.js';
import {ponyfill, fromLiterals} from '../template-from-literals.js';
import {assert} from '@esm-bundle/chai';

const html = (strings: TemplateStringsArray, ..._: unknown[]) => strings;

const x = null;
const testCases = [
  {
    name: 'no bindings',
    input: html`<div></div>`,
    expected: `<div></div>`,
  },
  {
    name: 'child binding',
    input: html`<div>${x}</div>`,
    expected: `<div><!--?child-node-part?--><!--?/child-node-part?--></div>`,
  },
  {
    name: 'element binding',
    input: html`<div ${x}></div>`,
    expected: `<!--?node-part d ?--><div></div>`,
  },
  {
    name: 'attribute binding',
    input: html`<div x=${x}></div>`,
    expected: `<!--?node-part attr x . ?--><div></div>`,
  },
  {
    name: 'complex attribute binding',
    input: html`<div x="a ${x} b ${x} c"></div>`,
    expected: `<!--?node-part attr x "a " . " b " . " c" ?--><div></div>`,
  },
  {
    name: 'many bindings',
    input: html`<div x="a ${x} b ${x} c" ${x} v=${x}>${x}foo ${x} bar ${x}${x}</div>`,
    expected: `<!--?node-part attr x "a " . " b " . " c" d attr v . ?--><div><!--?child-node-part?--><!--?/child-node-part?-->foo <!--?child-node-part?--><!--?/child-node-part?--> bar <!--?child-node-part?--><!--?/child-node-part?--><!--?child-node-part?--><!--?/child-node-part?--></div>`,
  },
];

for (const {name, input, expected} of testCases) {
  test(name, () => {
    if (useDomParts) {
      // ironically, these tests are only useful when DOM parts aren't
      // implemented in the browser, because when they are we don't want to
      // insert processing instructions, we just create the parts imperatively.
      return;
    }
    const templ = ponyfill(input);
    assert.deepEqual(
      templ.innerHTML,
      expected,
      `unexpected HTMLTemplateElement.fromLiterals ponyfill output`
    );

    // native implementation!
    if (fromLiterals !== ponyfill) {
      const templ = fromLiterals(input);
      assert.deepEqual(
        templ.innerHTML,
        expected,
        `unexpected native HTMLTemplateElement.fromLiterals output`
      );
    }
  });
}
