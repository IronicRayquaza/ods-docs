function errorChunks(file, text) {
  const lines = text.split('\n');
  const out = [];
  const RE = /\b(log_error|error|die|fail|err|warn|throw|Write-AIError|Write-AIWarn|Write-Warning)\s+"([^"]{15,})"/;
  
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(RE);
    if (m) {
      const notes = [];
      let j = i - 1;
      while (j >= 0 && j >= i - 8 && lines[j].trim().startsWith('#')) {
        notes.unshift(lines[j].trim().replace(/^#+\s?/, ''));
        j = j - 1;
      }
      const code = lines.slice(Math.max(0, i - 3), i + 2).join('\n');
      out.push({file: file, heading: 'Error: ' + m[2], line: i + 1, text: m[2] + '\n\n' + (notes.length > 0 ? notes.join(' ') + '\n\n' : '') + code, kind: 'error'});
    }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { errorChunks };