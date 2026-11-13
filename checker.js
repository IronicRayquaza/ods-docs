// "Will ODS run on my machine?": the machines the checker knows about, and
// the pure helpers around the answers. The answers themselves come from
// ODS's own scripts at build time (oracle.js), never from rules written here.

// Each kind of graphics the page offers. `mem` is the GPU memory choices in
// GB (discrete cards) and `ram` the system memory choices in GB. For unified
// memory (Apple, Strix Halo, DGX Spark) and CPU-only machines, RAM is the
// memory the model uses, so there is no `mem`.
const KINDS = [
  { id: 'nvidia', label: 'NVIDIA graphics card', hint: 'GeForce, RTX, Quadro', os: ['linux', 'windows'], vendor: 'nvidia', memoryType: 'discrete', mem: [2, 3, 4, 6, 8, 10, 11, 12, 16, 20, 24, 32, 40, 48, 80, 96], ram: [8, 16, 32, 64, 128] },
  { id: 'amd', label: 'AMD Radeon graphics card', hint: 'RX 6000, 7000, 9000', os: ['linux', 'windows'], vendor: 'amd', memoryType: 'discrete', mem: [4, 8, 12, 16, 20, 24, 32, 48], ram: [8, 16, 32, 64, 128] },
  { id: 'strix', label: 'AMD Ryzen AI Max', hint: 'Strix Halo, Radeon 8060S', os: ['linux', 'windows'], vendor: 'amd', memoryType: 'unified', ram: [32, 64, 96, 128] },
  { id: 'spark', label: 'NVIDIA DGX Spark', hint: 'Grace Blackwell GB10', os: ['linux'], vendor: 'nvidia', memoryType: 'unified', ram: [128], arch: 'aarch64' },
  { id: 'arc', label: 'Intel Arc graphics card', hint: 'A770, A750, A380', os: ['linux'], vendor: 'intel', memoryType: 'discrete', mem: [6, 8, 12, 16], ram: [8, 16, 32, 64, 128] },
  { id: 'cpu', label: 'No graphics card', hint: 'built-in graphics only', os: ['linux', 'windows'], vendor: 'none', memoryType: 'none', ram: [8, 16, 32, 48, 64, 96, 128] },
  { id: 'apple', label: 'Apple Silicon', hint: 'M1, M2, M3, M4', os: ['macos'], vendor: 'apple', memoryType: 'unified', ram: [8, 16, 18, 24, 32, 36, 48, 64, 96, 128, 192, 256], arch: 'arm64' },
  { id: 'intel-mac', label: 'Intel Mac', hint: 'Macs from before late 2020', os: ['macos'], vendor: 'none', memoryType: 'none', ram: [8, 16, 32, 64], arch: 'x86_64' }
];

const OSES = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' }
];

// The "What Works Today" row of docs/SUPPORT-MATRIX.md that covers each machine.
// null: the matrix has no row for it (the page says so).
function supportRowFor(os, kind) {
  if (os === 'windows') return 'Windows (Docker Desktop + WSL2)';
  if (os === 'macos') return kind === 'apple' ? 'macOS (Apple Silicon)' : null;
  return {
    nvidia: 'Linux + NVIDIA (CUDA)',
    spark: 'Linux + NVIDIA (CUDA)',
    strix: 'Linux + AMD Strix Halo (llama.cpp, Vulkan)',
    amd: 'Linux + AMD discrete GPU',
    arc: 'Linux + Intel Arc (SYCL)'
  }[kind] || null;
}

// Windows with an AMD GPU runs llama-server.exe natively and picks its model
// in the Windows setup, which the build can't run, so those machines get the
// support row and a pointer to the Windows guide instead of a computed answer.
function isComputed(os, kind) {
  return !(os === 'windows' && (kind === 'amd' || kind === 'strix'));
}

// Every machine the build asks ODS about.
function gridPoints() {
  const points = [];
  for (const k of KINDS) {
    for (const os of k.os) {
      if (!isComputed(os, k.id)) continue;
      for (const mem of k.mem || [0]) {
        for (const ram of k.ram) points.push({ os: os, kind: k.id, mem: mem, ram: ram });
      }
    }
  }
  return points;
}

function pointKey(p) {
  return [p.os, p.kind, p.mem, p.ram].join('|');
}

// The rows of the "What Works Today" table: { platform: { status, details } }.
function parseSupportMatrix(md) {
  const section = md.match(/^## What Works Today\s*$([\s\S]*?)(?=^## )/m);
  if (!section) throw new Error('docs/SUPPORT-MATRIX.md has no "## What Works Today" section; update parseSupportMatrix() in checker.js');
  const rows = {};
  for (const line of section[1].split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 5 || /^-+$/.test(cells[1]) || cells[1] === 'Platform') continue;
    const name = cells[1].replace(/\*\*/g, '');
    rows[name] = { status: cells[2].replace(/\*\*/g, ''), details: cells[3] };
  }
  return rows;
}

// How sure the answer is, from the matrix status word.
function levelOf(status) {
  if (/^(fully supported|supported)$/i.test(status)) return 'good';
  if (/experimental|validation required/i.test(status)) return 'caution';
  return 'caution';
}

// "... recommendation (16GB)." -> 16
function thresholdFrom(message) {
  const m = String(message || '').match(/\((\d+)GB\)\.?$/);
  if (!m) throw new Error('No "(NGB)" threshold in preflight message: ' + message);
  return Number(m[1]);
}

// Disk the selected model needs, the way ODS's phase 04 checks it:
// the model rounded up to whole GB, plus 15 GB for the Docker images.
function modelDiskGb(sizeMb) {
  return Math.ceil(sizeMb / 1024) + 15;
}

if (typeof module !== 'undefined') module.exports = { KINDS, OSES, supportRowFor, isComputed, gridPoints, pointKey, parseSupportMatrix, levelOf, thresholdFrom, modelDiskGb };
