const input = document.getElementById('q');
const clearButton = document.getElementById('clear');
const count = document.getElementById('count');
const recipesBox = document.getElementById('recipes');
const homeBox = document.getElementById('home');
const results = document.getElementById('results');
const chipsBox = document.getElementById('platforms');
let timer = null;
let platform = '';

function fitBox() {
  input.style.height = 'auto';
  const full = input.scrollHeight + 2;
  input.style.height = Math.min(full, 160) + 'px';
  input.style.overflowY = full > 160 ? 'auto' : 'hidden';
  clearButton.hidden = input.value === '';
}

function showRecipes() {
  recipesBox.innerHTML = '';
  for (let i = 0; i < RECIPES.length; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = RECIPES[i].title;
    btn.onclick = () => runRecipe(i);
    recipesBox.appendChild(btn);
  }
}

function showChips() {
  const all = [{ id: '', label: 'All platforms' }].concat(PLATFORMS);
  chipsBox.innerHTML = '';
  for (const p of all) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = p.label;
    btn.setAttribute('aria-pressed', p.id === platform ? 'true' : 'false');
    btn.onclick = () => {
      platform = p.id;
      showChips();
      runQuery(input.value);
    };
    chipsBox.appendChild(btn);
  }
}

function showResults(list, terms, label) {
  homeBox.hidden = true;
  if (list.length === 0) {
    results.innerHTML = emptyHtml(label) + helpHtml(label);
    count.textContent = '';
    return;
  }
  count.textContent = list.length + ' matching sections from the ODS repo';
  results.innerHTML = list.map(r => cardHtml(r.chunk, terms, BUILD.sha)).join('') + helpHtml(label);
}

function runQuery(query) {
  const q = query.trim();
  history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);
  if (!q) {
    results.innerHTML = '';
    count.textContent = '';
    homeBox.hidden = false;
    return;
  }
  const docs = forPlatform(DOCS, platform);
  const lines = errorLines(q);
  if (lines.length > 0) {
    showResults(mergeResults(lines.map(l => pickResults(search(docs, l, 60), 4)), 20), tokenize(lines.join(' ')), q);
    return;
  }
  showResults(pickResults(search(docs, q, 60), 20), tokenize(q), q);
}

function runRecipe(i) {
  const r = RECIPES[i];
  input.value = r.query;
  fitBox();
  const docs = DOCS.filter(c => r.files.includes(c.file));
  let list = search(docs, r.query, 20);
  if (list.length === 0) {
    list = docs.slice(0, 20).map(c => ({ chunk: c, score: 0 }));
  }
  history.replaceState(null, '', '?q=' + encodeURIComponent(r.query));
  showResults(list, tokenize(r.query), r.query);
}

function clearAll() {
  clearTimeout(timer);
  input.value = '';
  fitBox();
  runQuery('');
  input.focus();
}

input.addEventListener('input', () => {
  fitBox();
  clearTimeout(timer);
  timer = setTimeout(() => runQuery(input.value), 200);
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') clearAll();
});

clearButton.addEventListener('click', clearAll);

showRecipes();
showChips();
const start = new URLSearchParams(location.search).get('q');
if (start) {
  input.value = start;
  runQuery(start);
} else {
  input.focus();
}
fitBox();
