const { test } = require('node:test');
const assert = require('node:assert');
const { RECIPES } = require('./recipes.js');
const { isCatalogDoc } = require('./catalog.js');

// build.js also stops if a recipe file is missing from the ODS checkout.
test('every recipe has a title, a query and files that get a page', () => {
  for (const recipe of RECIPES) {
    assert.ok(recipe.title);
    assert.ok(recipe.query);
    assert.ok(recipe.files.length > 0);
    for (const f of recipe.files) assert.ok(isCatalogDoc(f), f);
  }
});
