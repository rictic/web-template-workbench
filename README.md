# web-template-workbench

This is a featureful HTML template system to use for investigating new proposals for web rendering and templating APIs.

It's originally based on lit-html to piggy-back on its test suite and benchmarks, but in this repo we can freely make changes without concern for backwards compatibility.

## DOM Parts prototype

To hack on this code base with Chrome Canary's DOM Parts prototype, check out this repo, then run:

```sh
npm ci

# in one terminal
npm run build:ts --watch


# in another terminal
npx wtr "development/test/index_test.js" --config ./web-test-runner.config.js --watch
```

Then open http://localhost:8000/ in Chrome Canary with the Experimental Web Platform Features flag enabled and select `index_test.js` to see run lit-html's extensive test suite against a DOM Parts based implementation.

Note that we do feature detection, so if you open it with a normal browser it will run with the production implementation. Note also that many of the tests are failing because we're using a hacky work around for https://lit.dev/playground/#gist=fed0fb43c92cd1198e66f84b34ad48d4 that inserts additional `<div>`s.

Known issues with this prototype:

- Rendering inside of comments is broken
- Rendering inside of raw text nodes is broken

Known rough edges in DOM Parts:

- ChildNodePart ordering is based on the parent, but previousSibling would be better. Should be fixed in Canary on July 18th or 19th or so.
- ChildNodePart can't be a direct child of a DocumentFragment. This is a trickier fix.
