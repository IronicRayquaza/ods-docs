// Which operating system a section is about, so Windows users can hide
// Linux steps and so on. '' means "any" (the section is always shown).

const PLATFORMS = [
  { id: 'windows', label: 'Windows', file: /WINDOWS|WSL|\.ps1$|\/windows\//i, heading: /\bwindows\b|\bwsl2?\b/i },
  { id: 'macos', label: 'macOS', file: /MACOS|\/macos\/|M1-OFFLINE/i, heading: /\bmacos\b|\bmac\b|apple silicon/i },
  { id: 'linux', label: 'Linux', file: /LINUX/i, heading: /\blinux\b|\bubuntu\b|\bdebian\b|\bfedora\b|\barch\b/i }
];

function platformOf(file, heading) {
  for (const p of PLATFORMS) {
    if (p.file.test(file)) return p.id;
  }
  const hits = PLATFORMS.filter(p => p.heading.test(heading || ''));
  return hits.length === 1 ? hits[0].id : '';
}

// Keep sections for the chosen platform and sections for any platform.
function forPlatform(docs, id) {
  if (!id) return docs;
  return docs.filter(c => !c.p || c.p === id);
}

if (typeof module !== 'undefined') module.exports = { PLATFORMS, platformOf, forPlatform };
