import { templateFromLiterals } from '../template-from-literals.js';
import { assert } from '@esm-bundle/chai';
const html = (strings, ..._) => strings;
const x = null;
const testCases = [
    {
        name: 'empty',
        input: html ` `,
        expected: ` `,
    },
    {
        name: 'no bindings',
        input: html `<div></div>`,
        expected: `<div></div>`,
    },
    {
        name: 'child binding',
        input: html `<div>${x}</div>`,
        expected: `<div><!--?child-node-part?--><!--?/child-node-part?--></div>`,
    },
    {
        name: 'element binding',
        input: html `<div ${x}></div>`,
        expected: `<!--?node-part d ?--><div></div>`,
    },
    {
        name: 'attribute binding',
        input: html `<div x=${x}></div>`,
        expected: `<!--?node-part attr x "" "" ?--><div></div>`,
    },
    {
        name: 'complex attribute binding',
        input: html `<div x="a ${x} b ${x} c"></div>`,
        expected: `<!--?node-part attr x "a " " b " " c" ?--><div></div>`,
    },
    {
        name: 'many bindings',
        input: html `<div x="a ${x} b ${x} c" ${x} v=${x}>${x}foo ${x} bar ${x}${x}</div>`,
        expected: `<!--?node-part attr x "a " " b " " c" d attr v "" "" ?--><div><!--?child-node-part?--><!--?/child-node-part?-->foo <!--?child-node-part?--><!--?/child-node-part?--> bar <!--?child-node-part?--><!--?/child-node-part?--><!--?child-node-part?--><!--?/child-node-part?--></div>`,
    },
    {
        name: 'unusual attribute names',
        input: html `<div .foo="${x}" @bar=${x} .bazQux=${x}></div>`,
        expected: `<!--?node-part attr .foo "" "" attr @bar "" "" attr .bazQux "" "" ?--><div></div>`,
    },
];
for (const { name, input, expected, only, skip } of testCases) {
    let testFn = test;
    if (only) {
        testFn = test.only;
    }
    else if (skip) {
        testFn = test.skip;
    }
    testFn(name, () => {
        // in a rather silly situation that needs to be cleaned up, these tests
        // are only useful when running _without_ DOM parts,
        // because when they are we don't want to insert processing instructions,
        // we just create the parts imperatively.
        const templ = templateFromLiterals(input, undefined, false);
        assert.deepEqual(templ.innerHTML, expected, `unexpected HTMLTemplateElement.fromLiterals ponyfill output`);
    });
}
//# sourceMappingURL=template-from-literals_test.js.map