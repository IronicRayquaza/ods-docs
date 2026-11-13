const test = require('node:test');
const assert = require('node:assert');
const { renderMarkdown } = require('./markdown.js');

const ctx = { resolve: (url, isImage) => (isImage ? 'IMG:' : 'LINK:') + url };
const html = (md, extra) => renderMarkdown(md, Object.assign({}, ctx, extra)).html;

test('headings get ids and are listed with their source line', () => {
  const r = renderMarkdown('# Title\n\ntext\n\n## Setup\n\n## Setup', ctx);
  assert.deepStrictEqual(r.headings.map(h => [h.level, h.id, h.line]), [[1, 'title', 1], [2, 'setup', 5], [2, 'setup-1', 7]]);
  assert.ok(r.html.includes('<h2 id="setup-1">'));
});

test('a # inside a code fence is not a heading', () => {
  const r = renderMarkdown('```bash\n# comment\nls <dir>\n```', ctx);
  assert.strictEqual(r.headings.length, 0);
  assert.ok(r.html.includes('<pre><code class="language-bash"># comment\nls &lt;dir&gt;</code></pre>'));
});

test('inline formatting, links and images', () => {
  const out = html('Run **ods** with `--x <y>`, see [the FAQ](FAQ.md) and ![logo](a.png).');
  assert.ok(out.includes('<strong>ods</strong>'));
  assert.ok(out.includes('<code>--x &lt;y&gt;</code>'));
  assert.ok(out.includes('<a href="LINK:FAQ.md">the FAQ</a>'));
  assert.ok(out.includes('<img src="IMG:a.png" alt="logo"'));
});

test('snake_case words are not turned into italics', () => {
  assert.ok(!html('set N_GPU_LAYERS and LLM_MODEL_NAME').includes('<em>'));
  assert.ok(html('this is _important_ here').includes('<em>important</em>'));
});

test('raw HTML is never passed through', () => {
  const out = html('<p align="center"><img src="x.png"></p>\n\nHello <script>alert(1)</script> <device> <b>bold</b>');
  assert.ok(!out.includes('<script'));
  assert.ok(!out.includes('<img src="x.png"'));
  assert.ok(out.includes('&lt;device&gt;'));
  assert.ok(out.includes('<b>bold</b>'));
});

test('link targets are escaped and javascript is left to the resolver', () => {
  const out = html('[x](a"onmouseover=b)', { resolve: (u) => u });
  assert.ok(out.includes('href="a&quot;onmouseover=b"'));
});

test('tables, with pipes inside code', () => {
  const out = html('| Cmd | Use |\n|---|:---:|\n| `a | b` | pipe |\n| x | y |');
  assert.ok(out.includes('<th>Cmd</th>'));
  assert.ok(out.includes('<th style="text-align:center">Use</th>'));
  assert.ok(out.includes('<td><code>a | b</code></td>'));
  assert.strictEqual((out.match(/<tr>/g) || []).length, 3);
});

test('nested and ordered lists, task items', () => {
  const out = html('1. First\n   - inner\n2. Second\n\n- [x] done\n- [ ] todo');
  assert.ok(out.includes('<ol>\n<li>First\n<ul>\n<li>inner</li>\n</ul></li>\n<li>Second</li>\n</ol>'));
  assert.ok(out.includes('<input type="checkbox" disabled checked> done'));
  assert.ok(out.includes('<input type="checkbox" disabled> todo'));
});

test('a code fence inside a list item stays in the item', () => {
  const out = html('1. Run:\n\n   ```bash\n   ./install.sh\n   ```\n\n2. Wait');
  assert.ok(out.includes('<li><p>Run:</p>\n<pre><code class="language-bash">./install.sh</code></pre></li>'));
});

test('callouts and quotes', () => {
  assert.ok(html('> [!WARNING]\n> Back up first.').includes('<div class="callout callout-warning"><p class="callout-title">Warning</p><p>Back up first.</p></div>'));
  assert.ok(html('> just a quote').includes('<blockquote><p>just a quote</p></blockquote>'));
});

test('a link whose text is its own file name shows the doc title', () => {
  const out = html('See [FAQ.md](FAQ.md) or [the FAQ](FAQ.md).', { titleFor: (u) => (u === 'FAQ.md' ? 'ODS FAQ' : null) });
  assert.ok(out.includes('>ODS FAQ</a> or'));
  assert.ok(out.includes('>the FAQ</a>'));
});
