// "Will ODS run on my machine?" in the browser. assess() turns the build's
// answers (checker-data.js) and the visitor's choices into what the page
// shows; the rest of the file draws the form and the result.

const CHECK_GUIDES = { windows: 'windows-quickstart', macos: 'macos-quickstart', linux: 'quickstart' };
const RUNS_ON = {
  nvidia: 'your NVIDIA GPU (CUDA)',
  amd: 'your AMD GPU (llama.cpp)',
  apple: 'the Apple GPU (Metal)',
  intel: 'your Intel Arc GPU (SYCL)',
  cpu: 'the CPU only (no GPU acceleration, so replies are slower)'
};

function checkKind(data, id) {
  return data.kinds.find(k => k.id === id);
}

function checkKey(i) {
  return [i.os, i.kind, i.mem || 0, i.ram].join('|');
}

function diskNeed(a) {
  const model = a.model ? Math.ceil(a.model.sizeMb / 1024) + 15 : 0;
  return Math.max(a.diskMin || 0, model);
}

function assess(data, input) {
  const kind = checkKind(data, input.kind);
  const rowName = data.supportRows[input.os + '|' + input.kind];
  const support = rowName ? Object.assign({ name: rowName }, data.support[rowName]) : null;
  const guide = input.kind === 'arc' ? 'intel-arc-guide' : CHECK_GUIDES[input.os];

  if (!data.computed[input.os + '|' + input.kind]) {
    return {
      level: 'info',
      headline: 'Supported. Windows setup picks the model.',
      lead: 'On Windows, ODS runs an AMD GPU through llama.cpp\'s llama-server.exe and chooses the model during Windows setup. This checker can\'t run that part of setup yet, so it can\'t name the model.',
      support: support, items: [], guide: guide
    };
  }

  const a = data.results[checkKey(input)];
  if (!a) throw new Error('No answer for ' + checkKey(input));
  const items = [];

  if (a.ramMin !== null && a.ramMin !== undefined) {
    const ok = input.ram >= a.ramMin;
    items.push({
      status: ok ? 'pass' : 'warn',
      text: ok
        ? input.ram + ' GB of RAM meets ODS\'s recommendation for this machine (' + a.ramMin + ' GB).'
        : input.ram + ' GB of RAM is below ODS\'s recommendation for this machine (' + a.ramMin + ' GB). The installer warns but carries on; extra services may not fit.'
    });
  }

  const need = diskNeed(a);
  if (need > 0) {
    if (input.disk === null || input.disk === undefined || isNaN(input.disk)) {
      items.push({ status: 'note', text: 'Needs about ' + need + ' GB of free disk space for the model and the Docker images.' });
    } else if (input.disk >= need) {
      items.push({ status: 'pass', text: input.disk + ' GB free is enough (ODS needs about ' + need + ' GB).' });
    } else {
      items.push({ status: 'blocker', text: 'ODS needs about ' + need + ' GB free, and you have ' + input.disk + ' GB. The installer stops until there is room.', disk: true });
    }
  }

  for (const c of a.checks) items.push({ status: c.status, text: c.message + (c.action ? ' ' + c.action : '') });

  const blockers = items.filter(i => i.status === 'blocker');
  const cautious = (support && /experimental|validation required/i.test(support.status)) || items.some(i => i.status === 'warn');
  let level;
  let headline;
  if (!a.model || blockers.some(b => !b.disk)) {
    level = 'bad';
    headline = 'Not on this machine.';
  } else if (blockers.length) {
    level = 'caution';
    headline = 'Yes, once you free up disk space.';
  } else if (support && /experimental/i.test(support.status)) {
    level = 'caution';
    headline = 'Experimental on this machine.';
  } else if (cautious || !support) {
    level = 'caution';
    headline = 'Yes, with a few things to know.';
  } else {
    level = 'good';
    headline = 'Yes, ODS runs on this machine.';
  }

  return {
    level: level,
    headline: headline,
    lead: a.model ? 'ODS would run on ' + (RUNS_ON[a.backend] || a.backend) + '.' : (a.noModel || ''),
    support: support,
    model: a.model || null,
    reason: a.reason || '',
    alternatives: a.alternatives || [],
    tier: kind.id === 'intel-mac' ? null : a.tier,
    backend: a.backend,
    items: items,
    guide: guide
  };
}

if (typeof module !== 'undefined') module.exports = { assess, checkKey, diskNeed };

// ---------- page ----------

if (typeof document !== 'undefined') {
  const data = CHECKER;
  const form = document.getElementById('check-form');
  const out = document.getElementById('check-result');
  const status = document.getElementById('check-status');
  const state = { os: '', kind: '', mem: 0, ram: 16, disk: null };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const gb = (mb) => (mb / 1024).toFixed(mb < 10240 ? 1 : 0) + ' GB';
  const ICONS = {
    pass: '<path d="M4 8.5l2.5 2.5L12 5.5"/>',
    good: '<path d="M4 8.5l2.5 2.5L12 5.5"/>',
    warn: '<path d="M8 4.5v4.5M8 11.5v.01"/>',
    caution: '<path d="M8 4.5v4.5M8 11.5v.01"/>',
    blocker: '<path d="M5 5l6 6M11 5l-6 6"/>',
    bad: '<path d="M5 5l6 6M11 5l-6 6"/>',
    info: '<path d="M8 7.5v4M8 4.5v.01"/>',
    note: '<path d="M5 8h6"/>'
  };
  const icon = (kind) => '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[kind] + '</svg>';

  function nearest(list, value) {
    let best = list[0];
    for (const v of list) if (v <= value) best = v;
    return best;
  }

  function guessOs() {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/win/i.test(p)) return 'windows';
    if (/mac/i.test(p)) return 'macos';
    if (/linux/i.test(p)) return 'linux';
    return '';
  }

  function select(id, list, value) {
    return '<select id="' + id + '">' + list.map(v => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + v + ' GB</option>').join('') + '</select>';
  }

  // The form is three groups. Each is redrawn only when an earlier choice
  // changes it, so the control someone is using never loses focus.
  function drawSkeleton() {
    form.innerHTML = '<fieldset class="group"><legend>System</legend><div class="segmented" role="presentation">'
      + data.oses.map(o => '<label><input type="radio" name="os" value="' + o.id + '"' + (o.id === state.os ? ' checked' : '') + '><span>' + esc(o.label) + '</span></label>').join('')
      + '</div></fieldset><div id="kind-group"></div><div id="mem-group"></div>';
  }

  function drawKinds() {
    const box = document.getElementById('kind-group');
    if (!state.os) { box.innerHTML = ''; return; }
    const kinds = data.kinds.filter(k => k.os.includes(state.os));
    if (!kinds.some(k => k.id === state.kind)) state.kind = kinds[0].id;
    box.innerHTML = '<fieldset class="group"><legend>Graphics</legend><div class="list">'
      + kinds.map(k => '<label><input type="radio" name="kind" value="' + k.id + '"' + (k.id === state.kind ? ' checked' : '') + '>'
        + '<span class="name">' + esc(k.label) + '</span><span class="hint">' + esc(k.hint) + '</span>'
        + '<svg class="tick" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg></label>').join('')
      + '</div></fieldset>';
  }

  function drawMemory() {
    const box = document.getElementById('mem-group');
    if (!state.os || !data.computed[state.os + '|' + state.kind]) { box.innerHTML = ''; return; }
    const kind = checkKind(data, state.kind);
    state.ram = nearest(kind.ram, state.ram);
    state.mem = kind.mem ? nearest(kind.mem, state.mem || 8) : 0;
    box.innerHTML = '<fieldset class="group"><legend>Memory and disk</legend><div class="fields">'
      + (kind.mem ? '<label class="field"><span>Graphics memory</span>' + select('mem', kind.mem, state.mem) + '</label>' : '')
      + '<label class="field"><span>' + (kind.memoryType === 'unified' ? 'Unified memory' : 'System memory') + '</span>' + select('ram', kind.ram, state.ram) + '</label>'
      + '<label class="field"><span>Free disk</span><span class="unit-input"><input id="disk" type="number" min="0" max="100000" inputmode="numeric" placeholder="Optional" value="' + (state.disk === null ? '' : state.disk) + '"><span>GB</span></span></label>'
      + '</div>' + howTo(state.os) + '</fieldset>';
  }

  function howTo(os) {
    const tips = {
      windows: 'Open Task Manager (Ctrl+Shift+Esc) and choose Performance. <b>GPU</b> shows the card and its dedicated GPU memory, and <b>Memory</b> shows system memory. File Explorer → This PC shows free disk space.',
      macos: 'Apple menu → About This Mac shows the chip and memory. System Settings → General → Storage shows free disk space.',
      linux: 'Run <code>nvidia-smi</code> (NVIDIA) or <code>lspci | grep -i vga</code> for the card, <code>free -g</code> for memory and <code>df -h ~</code> for free disk space.'
    };
    return '<details class="howto"><summary>Where to find these</summary><p>' + tips[os] + '</p></details>';
  }

  function row(label, value) {
    return '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>';
  }

  function drawResult() {
    if (!state.os) {
      out.innerHTML = '<p class="answer-empty">Choose your system to see the answer.</p>';
      status.textContent = '';
      return;
    }
    const r = assess(data, state);
    const osLabel = data.oses.find(o => o.id === state.os).label;
    let lead = esc(r.lead);
    if (r.model) lead = 'It would install <strong>' + esc(r.model.name) + '</strong> and run it on ' + esc(RUNS_ON[r.backend] || r.backend) + '.';

    let html = '<div class="answer answer-' + r.level + '"><h2 id="check-verdict"><span class="glyph">' + icon(r.level) + '</span>' + esc(r.headline) + '</h2>'
      + '<p>' + lead + '</p></div>';

    const rows = [];
    if (r.model) {
      rows.push(row('Model', esc(r.model.name) + (r.model.specialty ? ' <span class="muted">' + esc(r.model.specialty) + '</span>' : '')));
      rows.push(row('Download', gb(r.model.sizeMb)));
      rows.push(row('Context window', Math.round(r.model.context / 1024) + 'K tokens'));
      rows.push(row('Installer tier', esc(r.tier)));
      if (r.alternatives.length) rows.push(row('Also fits', r.alternatives.map(esc).join(', ')));
    }
    if (r.support) rows.push(row('Support', esc(r.support.status) + ' <span class="muted">' + esc(r.support.name) + '</span>'));
    else if (state.kind !== 'intel-mac') rows.push(row('Support', '<span class="muted">Not listed in the support matrix</span>'));
    if (rows.length) html += '<dl class="spec">' + rows.join('') + '</dl>';

    if (r.items.length) {
      html += '<h3 class="sub">Before you install</h3><ul class="checklist">'
        + r.items.map(i => '<li class="is-' + i.status + '"><span class="glyph">' + icon(i.status) + '</span><span>' + esc(i.text) + '</span></li>').join('') + '</ul>';
    }

    html += '<div class="actions">'
      + (r.level === 'bad' ? '' : '<a class="btn" href="docs/' + r.guide + '.html">' + (state.kind === 'arc' ? 'Read the Intel Arc guide' : 'Read the ' + esc(osLabel) + ' install guide') + '</a>')
      + '<a class="text-link" href="' + esc(data.discord) + '">Ask on Discord</a></div>';

    if (r.reason) html += '<details class="more"><summary>Why ODS picks this model</summary><p class="quote">' + esc(r.reason) + '</p></details>';
    if (r.support) html += '<details class="more"><summary>What the support matrix says</summary><p>' + r.support.detailsHtml + '</p><p><a href="docs/support-matrix.html">Read the full support matrix</a></p></details>';

    out.innerHTML = html;
    status.textContent = r.headline + (r.model ? ' ' + r.model.name + ', ' + gb(r.model.sizeMb) + ' download.' : '');
  }

  function readInputs(event) {
    const t = event.target;
    if (t.name === 'os') { state.os = t.value; drawKinds(); drawMemory(); }
    else if (t.name === 'kind') { state.kind = t.value; drawMemory(); }
    else if (t.id === 'mem') state.mem = Number(t.value);
    else if (t.id === 'ram') state.ram = Number(t.value);
    else if (t.id === 'disk') state.disk = t.value === '' ? null : Math.max(0, Math.floor(Number(t.value)));
    drawResult();
    remember();
  }

  function remember() {
    const q = new URLSearchParams();
    for (const k of ['os', 'kind', 'mem', 'ram', 'disk']) if (state[k] !== null && state[k] !== '' && state[k] !== 0) q.set(k, state[k]);
    history.replaceState(null, '', q.toString() ? '?' + q : location.pathname);
  }

  const q = new URLSearchParams(location.search);
  state.os = data.oses.some(o => o.id === q.get('os')) ? q.get('os') : guessOs();
  if (q.get('kind')) state.kind = q.get('kind');
  if (q.get('mem')) state.mem = Number(q.get('mem'));
  if (q.get('ram')) state.ram = Number(q.get('ram'));
  if (q.get('disk')) state.disk = Number(q.get('disk'));
  form.addEventListener('change', readInputs);
  form.addEventListener('input', (e) => { if (e.target.id === 'disk') readInputs(e); });
  drawSkeleton();
  drawKinds();
  drawMemory();
  drawResult();
}
