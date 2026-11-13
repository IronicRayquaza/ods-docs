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
      headline: 'Supported, and Windows setup picks the model',
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
    headline = 'Not on this machine';
  } else if (blockers.length) {
    level = 'caution';
    headline = 'Yes, once you free up disk space';
  } else if (support && /experimental/i.test(support.status)) {
    level = 'caution';
    headline = 'Experimental on this machine';
  } else if (cautious || !support) {
    level = 'caution';
    headline = 'Yes, with a few things to know';
  } else {
    level = 'good';
    headline = 'Yes. ODS runs on this machine.';
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
  const state = { os: '', kind: '', mem: 0, ram: 16, disk: null };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const gb = (mb) => (mb / 1024).toFixed(mb < 10240 ? 1 : 0) + ' GB';

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

  function choice(name, value, label, hint, checked) {
    return '<label class="choice"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>'
      + '<span><strong>' + esc(label) + '</strong>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span></label>';
  }

  function select(id, list, value, unit) {
    return '<select id="' + id + '">' + list.map(v => '<option value="' + v + '"' + (v === value ? ' selected' : '') + '>' + v + ' ' + unit + '</option>').join('') + '</select>';
  }

  function drawForm() {
    const kinds = data.kinds.filter(k => k.os.includes(state.os));
    if (!kinds.some(k => k.id === state.kind)) state.kind = state.os ? kinds[0].id : '';
    const kind = checkKind(data, state.kind);
    let html = '<fieldset><legend><span class="step">1</span>Your computer runs</legend><div class="choices os">'
      + data.oses.map(o => choice('os', o.id, o.label, '', o.id === state.os)).join('') + '</div></fieldset>';
    if (state.os) {
      html += '<fieldset><legend><span class="step">2</span>Its graphics</legend><div class="choices">'
        + kinds.map(k => choice('kind', k.id, k.label, k.hint, k.id === state.kind)).join('') + '</div></fieldset>';
    }
    if (state.os && data.computed[state.os + '|' + state.kind]) {
      state.ram = nearest(kind.ram, state.ram);
      html += '<fieldset><legend><span class="step">3</span>Its memory and disk</legend><div class="fields">';
      if (kind.mem) {
        state.mem = nearest(kind.mem, state.mem || 8);
        html += '<label class="field"><span>Graphics memory (VRAM)</span>' + select('mem', kind.mem, state.mem, 'GB') + '</label>';
      } else {
        state.mem = 0;
      }
      html += '<label class="field"><span>' + (kind.memoryType === 'unified' ? 'Memory (shared with the GPU)' : 'Memory (RAM)') + '</span>' + select('ram', kind.ram, state.ram, 'GB') + '</label>'
        + '<label class="field"><span>Free disk space</span><span class="unit-input"><input id="disk" type="number" min="0" max="100000" inputmode="numeric" placeholder="e.g. 120" value="' + (state.disk === null ? '' : state.disk) + '"><span>GB</span></span></label>'
        + '</div>' + howTo(state.os) + '</fieldset>';
    }
    form.innerHTML = html;
  }

  function howTo(os) {
    const tips = {
      windows: 'Open Task Manager (Ctrl+Shift+Esc), then Performance. <b>GPU</b> shows the card and its "Dedicated GPU memory"; <b>Memory</b> shows RAM. File Explorer → This PC shows free disk space.',
      macos: 'Apple menu → About This Mac shows the chip and memory. System Settings → General → Storage shows free disk space.',
      linux: 'Run <code>nvidia-smi</code> (NVIDIA) or <code>lspci | grep -i vga</code> for the card, <code>free -g</code> for RAM and <code>df -h ~</code> for free disk space.'
    };
    return '<details class="howto"><summary>Where do I find these?</summary><p>' + tips[os] + '</p></details>';
  }

  function drawResult() {
    if (!state.os) {
      out.innerHTML = '<div class="result-empty"><p class="big">Pick your system to start.</p><p>Three questions, then you see what ODS would install on your computer and what it needs.</p></div>';
      return;
    }
    const r = assess(data, state);
    const icon = { good: '✓', caution: '!', bad: '×', info: 'i' }[r.level];
    let html = '<div class="verdict verdict-' + r.level + '"><span class="verdict-icon" aria-hidden="true">' + icon + '</span><div><h2>' + esc(r.headline) + '</h2><p>' + esc(r.lead) + '</p></div></div>';
    if (r.model) {
      html += '<div class="model"><p class="label">ODS would install</p><p class="model-name">' + esc(r.model.name) + (r.model.specialty ? ' <span class="pill">' + esc(r.model.specialty) + '</span>' : '') + '</p>'
        + '<dl class="facts"><div><dt>Download</dt><dd>' + gb(r.model.sizeMb) + '</dd></div><div><dt>Context</dt><dd>' + Math.round(r.model.context / 1024) + 'K tokens</dd></div><div><dt>Installer tier</dt><dd>' + esc(r.tier) + '</dd></div></dl>'
        + (r.alternatives.length ? '<p class="alts">Other models that fit: ' + r.alternatives.map(esc).join(', ') + '. You can switch models later.</p>' : '')
        + '<details class="why"><summary>Why this model, in ODS\'s words</summary><p>' + esc(r.reason) + '</p></details></div>';
    }
    if (r.items.length) {
      html += '<ul class="checks">' + r.items.map(i => '<li class="check-' + i.status + '"><span class="dot" aria-hidden="true"></span>' + esc(i.text) + '</li>').join('') + '</ul>';
    }
    if (r.support) {
      html += '<div class="support"><p class="label">ODS support matrix: ' + esc(r.support.name) + ' · <strong>' + esc(r.support.status) + '</strong></p><p>' + r.support.detailsHtml + '</p>'
        + '<p><a href="docs/support-matrix.html">Read the full support matrix</a></p></div>';
    } else if (state.kind !== 'intel-mac') {
      html += '<div class="support"><p class="label">ODS support matrix</p><p>The support matrix has no row for this machine. ODS runs it on the CPU path above.</p><p><a href="docs/support-matrix.html">Read the full support matrix</a></p></div>';
    }
    const blocked = r.level === 'bad';
    html += '<div class="cta">' + (blocked ? '' : '<a class="button" href="docs/' + r.guide + '.html">' + (state.kind === 'arc' ? 'Intel Arc guide' : 'Install guide for ' + esc(data.oses.find(o => o.id === state.os).label)) + ' →</a>')
      + '<a class="button secondary" href="' + esc(data.discord) + '">Ask on Discord</a></div>';
    out.innerHTML = html;
  }

  function readInputs(event) {
    const t = event.target;
    if (t.name === 'os') { state.os = t.value; drawForm(); }
    else if (t.name === 'kind') { state.kind = t.value; drawForm(); }
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
  drawForm();
  drawResult();
}
