// The messages ODS's scripts print when something goes wrong, so a pasted
// error can be traced to the line that printed it.
//
// The ai_* helpers are the installers' own (ai_bad on Linux, ai_err on
// macOS, ai_warn on both); the rest are the plain shell and PowerShell ones.
const PRINTERS = 'log_error|log_warn|ai_bad|ai_err|ai_warn|error|die|fail|err|warn|throw|Write-AIError|Write-AIWarn|Write-Warning';
const RE = new RegExp('(?:^|[^A-Za-z0-9_-])(' + PRINTERS + ')\\s+(?:"([^"]{15,})"|\'([^\']{15,})\')');

// A doc the message, or the lines printed right after it, sends people to:
// "See docs/INSTALL-TROUBLESHOOTING.md#container-build-dns", a GitHub URL to
// one, or "ods/docs/WINDOWS-QUICKSTART.md". Paths come back from the repo
// root ("ods/docs/X.md#anchor").
const DOC_REF = /(?:^|[\s"'(`/])((?:ods\/)?docs\/[A-Za-z0-9_./-]+\.md)(#[a-z0-9_-]+)?/g;
const FOLLOWING = 6;
const BLOCK_END = /^\s*$|^\s*(\}|fi\b|done\b|esac\b|return\b|exit\b)/;
// Only a line that sends the reader somewhere counts, not one that just
// names the file ("docs/SUPPORT-MATRIX.md missing").
const POINTER = /\b(see|recovery|explains|guide|docs:|read)\b/i;
// These stop the script, so nothing after them is printed.
const STOPS = ['throw', 'die', 'fail', 'error'];
// A new failure starts a different message; a warning after one is advice
// for it ("Recovery: see docs/...").
const FAILURE = new RegExp('(?:^|[^A-Za-z0-9_-])(log_error|ai_bad|ai_err|error|die|fail|err|throw|Write-AIError)\\s+["\']');

function docRefs(lines, i, printer) {
  const refs = [];
  const last = STOPS.includes(printer) ? i : Math.min(lines.length - 1, i + FOLLOWING);
  for (let j = i; j <= last; j++) {
    if (j > i && (BLOCK_END.test(lines[j]) || FAILURE.test(lines[j]))) break;
    if (lines[j].trim().startsWith('#') || !POINTER.test(lines[j])) continue;
    for (const m of lines[j].matchAll(DOC_REF)) {
      const ref = (m[1].startsWith('ods/') ? m[1] : 'ods/' + m[1]) + (m[2] || '');
      if (!refs.includes(ref)) refs.push(ref);
    }
  }
  return refs;
}

function errorChunks(file, text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(RE);
    if (!m) continue;
    const message = m[2] || m[3];
    const notes = [];
    let j = i - 1;
    while (j >= 0 && j >= i - 8 && lines[j].trim().startsWith('#')) {
      notes.unshift(lines[j].trim().replace(/^#+\s?/, ''));
      j = j - 1;
    }
    const code = lines.slice(Math.max(0, i - 3), i + 2).join('\n');
    const chunk = { file: file, heading: 'Error: ' + message, line: i + 1, text: message + '\n\n' + (notes.length > 0 ? notes.join(' ') + '\n\n' : '') + code, kind: 'error' };
    const refs = docRefs(lines, i, m[1]);
    if (refs.length > 0) chunk.refs = refs;
    out.push(chunk);
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { errorChunks, docRefs };
