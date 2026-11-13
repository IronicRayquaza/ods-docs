// HTML for the generated pages: one page per doc, and the home page.
// Everything here is a pure function of its inputs; build.js writes the files.

const { esc } = require('./markdown.js');

const REPO = 'https://github.com/Osmantic/ODS';
const DISCORD = 'https://discord.gg/4ntNp9MAwC';
const SITE_REPO = 'https://github.com/IronicRayquaza/ods-docs';

function sourceUrl(build, path, line) {
  return REPO + '/blob/' + build.sha + '/' + path + (path.endsWith('.md') ? '?plain=1' : '') + (line ? '#L' + line : '');
}

function shortDate(iso) {
  return iso.slice(0, 10);
}

function head(title, description, prefix) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
    + '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(title) + '</title>\n'
    + (description ? '<meta name="description" content="' + esc(description) + '">\n' : '')
    + '<link rel="icon" type="image/png" sizes="64x64" href="' + prefix + 'favicon.png">\n'
    + '<link rel="apple-touch-icon" href="' + prefix + 'apple-touch-icon.png">\n'
    + '<link rel="stylesheet" href="' + prefix + 'style.css">\n'
    + '</head>\n';
}

function topBar(prefix, query) {
  return '<header class="top">'
    + '<button class="menu-button" type="button" aria-controls="sidebar" aria-expanded="false">Menu</button>'
    + '<a class="brand" href="' + prefix + 'index.html"><img src="' + prefix + 'ods-logo.png" alt="" width="39" height="24"><span>ODS Docs</span></a>'
    + '<form class="top-search" action="' + prefix + 'index.html" method="get" role="search">'
    + '<input name="q" type="search" placeholder="Search the docs or paste an error" aria-label="Search the docs"' + (query ? ' value="' + esc(query) + '"' : '') + '>'
    + '</form>'
    + '<nav class="top-links" aria-label="Elsewhere"><a class="will-it-run" href="' + prefix + 'check.html">Will it run?</a><a href="' + REPO + '">GitHub</a><a href="' + DISCORD + '">Discord</a></nav>'
    + '</header>\n';
}

function sidebar(groups, prefix, current) {
  return '<nav class="sidebar" id="sidebar" aria-label="All docs">'
    + groups.map(g => '<div class="side-group"><p class="side-title">' + esc(g.title) + '</p><ul>'
      + g.docs.map(d => '<li><a href="' + prefix + 'docs/' + d.slug + '.html" data-slug="' + d.slug + '"' + (d.slug === current ? ' aria-current="page"' : '') + '>' + esc(d.title) + '</a></li>').join('')
      + '</ul></div>').join('')
    + '</nav>\n';
}

function footer(build) {
  return '<footer class="site-footer">'
    + '<p>Built from <a href="' + REPO + '/tree/' + build.sha + '">Osmantic/ODS ' + build.sha.slice(0, 7) + '</a> on ' + shortDate(build.date) + '. '
    + 'Every page is the ODS documentation as written in that commit; nothing here is generated or rewritten.</p>'
    + '<p>A community project, not an official Osmantic site. Docs content is Apache-2.0 from <a href="' + REPO + '">Osmantic/ODS</a>. '
    + '<a href="' + SITE_REPO + '">Site source</a>.</p>'
    + '</footer>\n';
}

const MENU_SCRIPT = '<script>(function(){var b=document.querySelector(".menu-button"),s=document.getElementById("sidebar");'
  + 'if(!b||!s)return;b.addEventListener("click",function(){var o=s.classList.toggle("open");b.setAttribute("aria-expanded",o?"true":"false");});})();</script>\n';

const COPY_SCRIPT = '<script>(function(){'
  + 'var copySvg=\'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>\';'
  + 'var checkSvg=\'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>\';'
  + 'function addCopyButtons(root){'
  + 'root.querySelectorAll(".prose pre, .card pre").forEach(function(pre){'
  + 'if(pre.querySelector(".copy-btn"))return;'
  + 'var btn=document.createElement("button");'
  + 'btn.type="button";btn.className="copy-btn";btn.setAttribute("aria-label","Copy code");'
  + 'btn.innerHTML=copySvg+\'<span>Copy</span>\';'
  + 'btn.addEventListener("click",function(){'
  + 'var code=pre.querySelector("code");'
  + 'var text=(code?code.innerText:pre.innerText).trim();'
  + 'navigator.clipboard.writeText(text).then(function(){'
  + 'btn.innerHTML=checkSvg+\'<span>Copied!</span>\';btn.classList.add("copied");'
  + 'setTimeout(function(){btn.innerHTML=copySvg+\'<span>Copy</span>\';btn.classList.remove("copied");},2000);'
  + '});'
  + '});'
  + 'pre.appendChild(btn);'
  + '});'
  + '}'
  + 'addCopyButtons(document);'
  + 'var res=document.getElementById("results");'
  + 'if(res){new MutationObserver(function(){addCopyButtons(res);}).observe(res,{childList:true,subtree:true});}'
  + '})();</script>\n';

const TOC_SPY_SCRIPT = '<script>(function(){'
  + 'var links=Array.from(document.querySelectorAll(".toc a"));'
  + 'if(!links.length)return;'
  + 'var targets=links.map(function(a){'
  + 'var id=decodeURIComponent(a.getAttribute("href").slice(1));'
  + 'return{a:a,el:document.getElementById(id)};'
  + '}).filter(function(t){return t.el;});'
  + 'if(!targets.length)return;'
  + 'function spy(){'
  + 'var top=window.scrollY+110;'
  + 'var cur=null;'
  + 'for(var i=0;i<targets.length;i++){'
  + 'if(targets[i].el.getBoundingClientRect().top+window.scrollY<=top){cur=targets[i].a;}'
  + '}'
  + 'links.forEach(function(l){l.classList.remove("active");l.removeAttribute("aria-current");});'
  + 'if(cur){cur.classList.add("active");cur.setAttribute("aria-current","true");}'
  + '}'
  + 'window.addEventListener("scroll",spy,{passive:true});'
  + 'spy();'
  + '})();</script>\n';

function toc(headings) {
  const items = headings.filter(h => h.level === 2 || h.level === 3);
  if (items.length < 2) return '<aside class="toc empty" aria-hidden="true"></aside>\n';
  return '<aside class="toc" aria-label="On this page"><p class="side-title">On this page</p><ul>'
    + items.map(h => '<li class="toc-' + h.level + '"><a href="#' + esc(h.id) + '">' + esc(h.text) + '</a></li>').join('')
    + '</ul></aside>\n';
}

function reportUrl(entry, build) {
  const title = 'Docs: ' + entry.title;
  const body = 'Page: ' + entry.path + ' (at ' + build.sha.slice(0, 7) + ')\n\nWhat is wrong or missing:\n\n';
  return REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
}

function neighbours(groups, slug) {
  const flat = [];
  for (const g of groups) for (const d of g.docs) flat.push(d);
  const k = flat.findIndex(d => d.slug === slug);
  return { prev: k > 0 ? flat[k - 1] : null, next: k >= 0 && k < flat.length - 1 ? flat[k + 1] : null };
}

function docPage(o) {
  // o: { entry, html, headings, groups, build }
  const e = o.entry;
  const prefix = '../';
  const group = o.groups.find(g => g.id === e.category);
  const n = neighbours(o.groups, e.slug);
  const pager = '<nav class="pager" aria-label="Next and previous">'
    + (n.prev ? '<a class="prev" href="' + n.prev.slug + '.html"><span>Previous</span>' + esc(n.prev.title) + '</a>' : '<span></span>')
    + (n.next ? '<a class="next" href="' + n.next.slug + '.html"><span>Next</span>' + esc(n.next.title) + '</a>' : '<span></span>')
    + '</nav>';
  return head(e.title + ' · ODS Docs', e.description, prefix)
    + '<body>\n' + topBar(prefix, '')
    + '<div class="layout">\n' + sidebar(o.groups, prefix, e.slug)
    + '<main class="doc">'
    + '<p class="crumbs"><a href="' + prefix + 'index.html#' + esc(e.category) + '">' + esc(group ? group.title : e.category) + '</a></p>'
    + '<article class="prose">' + o.html + '</article>'
    + '<div class="doc-meta">'
    + '<a href="' + sourceUrl(o.build, e.path) + '">View ' + esc(e.path) + ' on GitHub</a>'
    + '<a href="' + esc(reportUrl(e, o.build)) + '">Report a problem with this page</a>'
    + '</div>'
    + pager
    + '</main>\n' + toc(o.headings)
    + '</div>\n' + footer(o.build) + MENU_SCRIPT + COPY_SCRIPT + TOC_SPY_SCRIPT
    + '</body>\n</html>\n';
}

function homePage(o) {
  // o: { groups, build, startHtml, count }
  const prefix = '';
  const browse = o.groups.map(g => '<section class="cat" id="' + esc(g.id) + '"><h3>' + esc(g.title) + '</h3><p>' + esc(g.description) + '</p><ul>'
    + g.docs.map(d => '<li><a href="docs/' + d.slug + '.html">' + esc(d.title) + '</a></li>').join('')
    + '</ul></section>').join('');
  return head('ODS Docs: guides and error lookup for ODS', 'Search every ODS guide or paste an ODS error, and read the matching docs, quoted from the Osmantic/ODS repo.', prefix)
    + '<body class="home">\n' + topBar(prefix, '')
    + '<div class="layout">\n' + sidebar(o.groups, prefix, null)
    + '<main class="doc">'
    + '<section class="hero"><h1>ODS Docs</h1>'
    + '<p class="lead">Every ODS guide in one place, readable and searchable. Paste an error or a whole install log to find the script that printed it and the docs that fix it.</p>'
    + '<div class="searchbox">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>'
    + '<textarea id="q" rows="1" placeholder="Search ODS, or paste an error or a whole log" aria-label="Search ODS" autocomplete="off"></textarea>'
    + '<button id="clear" type="button" aria-label="Clear search" hidden>×</button>'
    + '</div>'
    + '<div id="platforms" class="chips" role="group" aria-label="Show results for"></div>'
    + '<p id="count" aria-live="polite"></p>'
    + '<div id="results"></div>'
    + '</section>'
    + '<div id="home">'
    + '<a class="promo" href="check.html"><span class="promo-body"><span class="promo-title">Will ODS run on my machine?</span>'
    + '<span class="promo-text">See the model ODS would install on your computer, and the disk it needs, before you download anything.</span></span>'
    + (o.example ? '<span class="promo-example">' + esc(o.example.machine) + ' → <strong>' + esc(o.example.model) + '</strong></span>' : '')
    + '<span class="promo-arrow" aria-hidden="true">→</span></a>'
    + '<h2>Common tasks</h2><div id="recipes"></div>'
    + '<h2>Start here by job</h2><div class="prose start">' + o.startHtml + '</div>'
    + '<h2>Browse the manual</h2><p class="muted">' + o.count + ' guides from the ODS repo, in ' + o.groups.length + ' sections.</p><div class="cats">' + browse + '</div>'
    + '</div>'
    + '</main>\n'
    + '</div>\n' + footer(o.build) + MENU_SCRIPT + COPY_SCRIPT
    + '<script src="data.js"></script>\n<script src="search.js"></script>\n<script src="platform.js"></script>\n<script src="snippet.js"></script>\n'
    + '<script src="recipes.js"></script>\n<script src="render.js"></script>\n<script src="logsplit.js"></script>\n<script src="app.js"></script>\n'
    + '</body>\n</html>\n';
}

function checkPage(o) {
  // o: { build }
  const prefix = '';
  return head('Will ODS run on my machine? · ODS Docs', 'Find out what ODS would install on your computer, and what it needs, before you download anything.', prefix)
    + '<body class="check">\n' + topBar(prefix, '')
    + '<main class="check-page">'
    + '<header class="check-head"><h1>Will ODS run on my machine?</h1>'
    + '<p>Describe your computer and see what ODS would install on it, worked out by ODS\'s own installer code. <a href="#how-this-works">How this works</a></p></header>'
    + '<div class="checker"><form id="check-form" class="check-form" onsubmit="return false"></form>'
    + '<section id="check-result" class="check-result" aria-labelledby="check-verdict"></section></div>'
    + '<p id="check-status" class="sr-only" aria-live="polite"></p>'
    + '<div class="prose check-notes"><h2 id="how-this-works">How this works</h2>'
    + '<p>Nothing on this page is guessed. When the site is built, it runs ODS\'s own installer code for every machine you can describe here: '
    + '<code>classify-hardware.sh</code> for the hardware class and tier, <code>auto_select_tier</code> on macOS, <code>select-model.py</code> for the model, and '
    + '<code>preflight-engine.sh</code> for the memory, disk and platform checks, with the arguments the installers pass. The support status is quoted from the '
    + '<a href="docs/support-matrix.html">ODS support matrix</a>. All of it comes from <a href="' + REPO + '/tree/' + o.build.sha + '">Osmantic/ODS ' + o.build.sha.slice(0, 7) + '</a>.</p>'
    + '<p>The real installer measures your hardware directly, so its answer can differ a little: memory other programs are already using, several GPUs, or a model you choose yourself all change the pick. '
    + 'The model shown is the one for the default setup (Ubuntu 24.04 or Debian 12, Windows with WSL2, or macOS), which uses the largest model that fits.</p></div>'
    + '</main>\n'
    + footer(o.build)
    + '<script src="checker-data.js"></script>\n<script src="check.js"></script>\n'
    + '</body>\n</html>\n';
}

if (typeof module !== 'undefined') module.exports = { checkPage, docPage, homePage, DISCORD, sourceUrl, reportUrl, neighbours, toc };
