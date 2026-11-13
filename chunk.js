function splitMarkdown(file, text) {
  const lines = text.split('\n');
  let inFence = false;
  const chunks = [];
  let current = {file: file, heading: file, line: 1, body: []};
  
  function finish(c) {
    const body = c.body.join('\n').trim();
    if (body !== '') {
      chunks.push({file: c.file, heading: c.heading, line: c.line, text: body});
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      current.body.push(line);
    } else if (!inFence && line.match(/^#{1,3} /)) {
      finish(current);
      current = {
        file: file,
        heading: line.replace(/^#+\s*/, '').trim(),
        line: i + 1,
        body: []
      };
    } else {
      current.body.push(line);
    }
  }
  finish(current);
  return chunks;
}

if (typeof module !== 'undefined') module.exports = { splitMarkdown };