import { html, render, nothing } from "../dist/index.js";

const createContent = (width = 6, depth = 6, at = 0) => {
  at++;
  if (at >= depth) {
    return nothing;
  }
  const results = [];
  for (let i = 0; i < width; i++) {
    results.push(
      html`<section>${at}.${i}${createContent(width, depth, at)}</section>`
    );
  }
  return results;
};

// render(createContent(), document.body);
