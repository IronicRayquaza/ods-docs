// Asks ODS itself what it would do on each machine in checker.js's grid, by
// running the scripts the installer runs, from the ODS checkout being built:
//
//   ods/scripts/classify-hardware.sh   hardware class, backend and tier (Linux, WSL)
//   ods/installers/macos/lib/tier-map.sh   auto_select_tier (macOS)
//   ods/scripts/select-model.py        the model the installer downloads
//   ods/scripts/preflight-engine.sh    RAM and disk minimums, platform and GPU checks
//
// The selector gets the arguments the installers give it: --installable-only,
// the 64K context floor Hermes needs, and no model-size cap (the cap is off
// on the default Pixel route on Linux/WSL, and unset on macOS).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { KINDS, gridPoints, pointKey, thresholdFrom } = require('./checker.js');

const MIN_CONTEXT = '65536';
const TIER_KEYS = { T0: '0', T1: '1', T2: '2', T3: '3', T4: '4' };

function parseEnv(text) {
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function makeOracle(root) {
  const ods = path.join(root, 'ods');
  const bash = (args, opts) => execFileSync('bash', args, Object.assign({ cwd: ods, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }, opts));
  const cache = new Map();
  const once = (key, fn) => {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
  };

  function classify(vendor, memoryType, vramMb, ramMb) {
    return once('c|' + [vendor, memoryType, vramMb, ramMb].join('|'), () => parseEnv(bash(['scripts/classify-hardware.sh',
      '--gpu-vendor', vendor, '--memory-type', memoryType, '--vram-mb', String(vramMb), '--ram-mb', String(ramMb), '--env'])));
  }

  function macTier(ramGb) {
    return once('m|' + ramGb, () => bash(['-c', 'source installers/macos/lib/tier-map.sh && auto_select_tier "$1"', 'ods', String(ramGb)]).trim());
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ods-docs-preflight-'));
  function preflight(o, ramGb, diskGb) {
    const report = path.join(tmp, 'report.json');
    bash(['scripts/preflight-engine.sh', '--report', report, '--tier', o.tier, '--ram-gb', String(ramGb), '--disk-gb', String(diskGb),
      '--gpu-backend', o.backend, '--gpu-vram-mb', String(o.vramMb), '--platform-id', o.platformId,
      '--compose-overlays', o.overlays, '--script-dir', '.', '--host-arch', o.arch, '--env']);
    return JSON.parse(fs.readFileSync(report, 'utf8')).checks;
  }

  // The macOS installer doesn't run the preflight engine: it checks the
  // macOS version and the chip itself (install-macos.sh), and its only disk
  // check is the selected model plus 15 GB, which the page applies.
  function macChecks(arch) {
    return once('mac|' + arch, () => {
      const script = fs.readFileSync(path.join(ods, 'installers/macos/install-macos.sh'), 'utf8');
      const constants = fs.readFileSync(path.join(ods, 'installers/macos/lib/constants.sh'), 'utf8');
      const major = constants.match(/^MIN_MACOS_MAJOR=(\d+)/m);
      const version = script.match(/ai_err "(macOS \$\{MIN_MACOS_MAJOR\}\+ [^"]*?) Found: \$\{MACOS_VERSION\}"/);
      const chip = script.match(/# Apple Silicon check[\s\S]*?ai_err "(Apple Silicon \(arm64\) is required\.) Detected: \$\{APPLE_ARCH\}"\s*\n\s*ai_err "([^"]+)"/);
      if (!major || !version || !chip) throw new Error('install-macos.sh changed its macOS or Apple Silicon checks; update macChecks() in oracle.js');
      const checks = [{ status: 'note', message: version[1].replace('${MIN_MACOS_MAJOR}', major[1]), action: '' }];
      if (arch !== 'arm64') checks.push({ status: 'blocker', message: chip[1] + ' Detected: ' + arch + '.', action: chip[2] });
      return checks;
    });
  }

  // RAM and disk minimums for the tier, and every other warning or blocker.
  function limits(o) {
    if (o.platformId === 'macos') return { ramMin: null, diskMin: null, checks: macChecks(o.arch) };
    return once('p|' + JSON.stringify(o), () => {
      const low = preflight(o, 0, 0);
      const high = preflight(o, 100000, 100000);
      const byId = (list, id) => list.find(c => c.id === id);
      return {
        ramMin: thresholdFrom(byId(low, 'memory').message),
        diskMin: thresholdFrom(byId(low, 'disk').message),
        checks: high.filter(c => c.status !== 'pass' && !['memory', 'disk', 'compose-overlays'].includes(c.id)).map(c => ({ status: c.status, message: c.message, action: c.action }))
      };
    });
  }

  // What the installer works out before it picks a model.
  function hardware(p) {
    const k = KINDS.find(x => x.id === p.kind);
    if (k.id === 'apple' || k.id === 'intel-mac') {
      const tier = macTier(p.ram);
      return { tier: tier, backend: 'apple', memoryType: 'unified', vramMb: 0, platformId: 'macos', arch: k.arch, overlays: 'docker-compose.base.yml,docker-compose.apple.yml' };
    }
    const unified = k.memoryType === 'unified';
    const vramMb = (unified ? p.ram : p.mem) * 1024;
    const platformId = p.os === 'windows' ? 'wsl' : 'linux';
    const arch = k.arch || 'x86_64';
    if (k.id === 'arc') {
      // Detection doesn't identify Arc yet; SUPPORT-MATRIX.md says to pass
      // --tier ARC (12 GB or more) or --tier ARC_LITE, as 02-detection.sh splits them.
      return { tier: p.mem >= 12 ? 'ARC' : 'ARC_LITE', backend: 'intel', memoryType: 'discrete', vramMb: vramMb, platformId: platformId, arch: arch, overlays: 'docker-compose.base.yml,docker-compose.arc.yml' };
    }
    const hw = classify(k.vendor, k.memoryType, vramMb, p.ram * 1024);
    return {
      tier: TIER_KEYS[hw.HW_REC_TIER] || hw.HW_REC_TIER,
      backend: hw.HW_REC_BACKEND,
      memoryType: k.memoryType,
      vramMb: vramMb,
      platformId: platformId,
      arch: arch,
      overlays: hw.HW_REC_COMPOSE_OVERLAYS,
      hardwareClass: hw.HW_CLASS_ID
    };
  }

  function selectorArgs(h, p) {
    return ['--catalog', path.join(ods, 'config', 'model-library.json'), '--backend', h.backend, '--memory-type', h.memoryType,
      '--vram-mb', String(h.vramMb), '--ram-gb', String(p.ram), '--tier', h.tier, '--max-size-mb', '0',
      '--host-arch', h.arch, '--installable-only', '--min-context', MIN_CONTEXT];
  }

  function runSelector(jobs) {
    const out = execFileSync('python3', ['-I', path.join(__dirname, 'select_batch.py'), root], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(out);
  }

  return { hardware, limits, selectorArgs, runSelector, cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

function modelSummary(m) {
  return { id: m.id, name: m.name, specialty: m.specialty || '', description: m.description || '', sizeMb: m.size_mb, context: m.context_length, quantization: m.quantization || '' };
}

// { key: answer } for every machine in the grid.
function askOds(root) {
  const oracle = makeOracle(root);
  const points = gridPoints();
  const rows = points.map(p => {
    const h = oracle.hardware(p);
    return { p: p, h: h, limits: oracle.limits(h) };
  });
  const selectable = rows.filter(r => r.p.kind !== 'intel-mac');
  const answers = oracle.runSelector(selectable.map(r => oracle.selectorArgs(r.h, r.p)));
  const picks = new Map(selectable.map((r, i) => [r, answers[i]]));
  const results = {};
  for (const r of rows) {
    const a = picks.get(r);
    const entry = { tier: r.h.tier, backend: r.h.backend, ramMin: r.limits.ramMin, diskMin: r.limits.diskMin, checks: r.limits.checks };
    if (a && a.code === 0) {
      const d = JSON.parse(a.out);
      entry.model = modelSummary(d.selected);
      entry.reason = d.reason;
      entry.memoryGb = d.memory_capacity_gb;
      entry.memoryLabel = d.memory_label;
      entry.alternatives = d.alternatives.filter(x => x.id !== d.selected.id).map(x => x.name || x.id);
    } else if (a) {
      entry.noModel = a.err.replace(/^error:\s*/, '').trim();
    }
    results[pointKey(r.p)] = entry;
  }
  oracle.cleanup();
  return results;
}

module.exports = { askOds, parseEnv };
