/* NIFTY & BEYOND — unified reader.
   Vanilla, no build step. Hash routing so GitHub Pages needs no rewrites.
   Data: data/reports.json (daily briefs) + data/sectors.json (sector desk scaffold).
   The daily report and the RRG app are embedded in-place via iframe. No market data
   is read in this shell — every number lives inside the linked report / RRG app. */

'use strict';

const state = {
  reports: [],
  sectors: [],
  siteBase: 'https://rajan1973.github.io/',   // canonical public home of the reports (external links)
  embedBase: 'https://rajan1973.github.io/',  // where the report iframe pulls from (see resolveEmbedBase)
  bloggerUrl: 'https://nifty-vanakkam.blogspot.com',
  quarter: 'Q1 FY27',
  route: { name: 'home', param: null },
  search: { open: false, q: '', sel: 0 },
  archive: { q: '', kind: 'all', layout: 'cards' },
  ready: false,
  error: null,
};

const KIND_LABEL = { daily: 'Daily brief', expiry: 'Expiry special', fo: 'F&O analysis', weekly: 'Weekly review' };

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const kid of [].concat(kids)) if (kid != null) n.append(kid);
  return n;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const join = (base, p) => (/^https?:/i.test(p) ? p : (base === '/' ? '' : base.replace(/\/$/, '')) + '/' + p.replace(/^\//, ''));
// iframe source. In production the app ships in the SAME repo as reports/ and sectors/,
// so on GitHub Pages AND on Vercel these are same-origin ("/reports/…", "/sectors/…") and the
// frame can auto-size. On localhost there is nothing local to serve, so fall back to the
// absolute GitHub Pages URL (cross-origin → the frame keeps its own scrollbar).
const embedUrl = (p) => join(state.embedBase, p);
// canonical public URL — always the real GitHub Pages page, for "open in new tab".
const pageUrl = (p) => join(state.siteBase, p);

function resolveEmbedBase(configured) {
  const host = location.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '';
  return local ? state.siteBase : (configured || '/');
}

/* ---------- routing ---------- */
function parseHash() {
  const h = (location.hash || '#/').replace(/^#\/?/, '');
  const [name, param] = h.split('/');
  const known = ['home', 'report', 'rotation', 'sectors', 'archive'];
  return { name: known.includes(name) ? name : 'home', param: param || null };
}
function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', () => { state.route = parseHash(); render(); window.scrollTo(0, 0); });

/* ---------- data ---------- */
async function boot() {
  state.route = parseHash();
  try {
    const [r, s] = await Promise.all([
      fetch('data/reports.json').then((x) => { if (!x.ok) throw new Error('reports.json ' + x.status); return x.json(); }),
      fetch('data/sectors.json').then((x) => { if (!x.ok) throw new Error('sectors.json ' + x.status); return x.json(); }),
    ]);
    state.reports = r.reports || [];
    state.sectors = s.sectors || [];
    state.siteBase = r.site_base || state.siteBase;
    state.embedBase = resolveEmbedBase(r.embed_base);
    state.bloggerUrl = r.blogger || state.bloggerUrl;
    state.quarter = s.quarter || state.quarter;
    state.ready = true;
  } catch (e) {
    state.error = e.message || String(e);
  }
  render();
  wireGlobalKeys();
}

/* ---------- shell ---------- */
const NAV = [
  { id: 'home', href: '#/', num: '01', label: "Today's close", count: () => '' },
  { id: 'report', href: '#/report', num: '02', label: 'Daily report', count: () => String(state.reports.length) },
  { id: 'rotation', href: '#/rotation', num: '03', label: 'Rotation · RRG', count: () => 'live' },
  { id: 'sectors', href: '#/sectors', num: '04', label: 'Sector research', count: () => String(state.sectors.length) },
  { id: 'archive', href: '#/archive', num: '05', label: 'Archive', count: () => String(state.reports.length) },
];

function sidebar() {
  const active = state.route.name;
  return el('aside', { class: 'sidebar' }, [
    el('div', { class: 'brand-plate' }, [
      el('img', { src: 'assets/logo.webp', alt: 'Nifty & Beyond — what the index doesn’t tell you', width: '640', height: '463' }),
    ]),
    el('button', { class: 'search-trigger', type: 'button', onclick: () => openSearch() }, [
      el('span', { class: 'k', text: '⌕' }),
      el('span', { class: 'lbl', text: 'Search everything' }),
      el('span', { class: 'kbd', text: navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K' }),
    ]),
    el('nav', { class: 'nav' }, NAV.map((n) =>
      el('a', { href: n.href, class: n.id === active ? 'active' : '' }, [
        el('span', { class: 'num', text: n.num }),
        el('span', { class: 'lbl', text: n.label }),
        el('span', { class: 'cnt', text: n.count() }),
      ])
    )),
    el('div', { class: 'sidebar-foot' }, [
      el('div', { class: 'rule' }),
      el('a', { class: 'ext', href: state.bloggerUrl, target: '_blank', rel: 'noopener', text: 'Blogger ↗' }),
      el('a', { class: 'ext', href: 'https://github.com/Rajan1973/Rajan1973.github.io', target: '_blank', rel: 'noopener', text: 'GitHub ↗' }),
      el('div', { class: 'disc', text: 'Educational and research use only. Not investment advice.' }),
    ]),
  ]);
}

function pageHead(kicker, title, meta) {
  return el('header', { class: 'page-head' }, [
    el('div', { class: 'titles' }, [
      el('div', { class: 'kicker', text: kicker }),
      el('h1', { class: 'page-title', text: title }),
    ]),
    meta ? el('div', { class: 'head-meta' }, meta.map((m) =>
      el('div', {}, [
        el('div', { class: 'lab', text: m.lab }),
        el('div', { class: 'val' + (m.gold ? ' gold' : ''), text: m.val }),
      ])
    )) : null,
  ]);
}

/* ---------- views ---------- */
function render() {
  const root = $('#app');
  root.textContent = '';

  if (state.error) {
    root.append(sidebar(), el('main', { class: 'main' }, [
      pageHead('NIFTY & BEYOND', 'Something is missing'),
      el('div', { class: 'state-msg', html:
        `Could not load the manifest — <code>${esc(state.error)}</code>.<br>` +
        `Serve this folder over HTTP (not <code>file://</code>): <code>python -m http.server</code> or any static server.` }),
    ]));
    return;
  }
  if (!state.ready) {
    root.append(sidebar(), el('main', { class: 'main' }, [el('div', { class: 'state-msg', text: 'Loading…' })]));
    return;
  }

  const view = { home: viewHome, report: viewReport, rotation: viewRotation, sectors: viewSectors, archive: viewArchive }[state.route.name];
  root.append(sidebar(), view());
  if (state.search.open) root.append(searchOverlay());
}

function viewHome() {
  const latest = state.reports[0];
  const rest = state.reports.slice(1, 7);
  const main = el('main', { class: 'main' }, [
    pageHead('Post-market intelligence', 'The close, read in full', [
      { lab: 'Latest', val: latest ? latest.date_short : '—' },
      { lab: 'Editions', val: String(state.reports.length), gold: true },
    ]),
    el('div', { class: 'view' }, [
      el('div', { class: 'home-grid' }, [
        el('section', { class: 'hero' }, [
          latest ? el('div', { class: 'hero-latest' }, [
            el('div', { class: 'eyebrow' }, [
              el('span', { text: 'Latest edition' }),
              el('span', { class: 'badge ' + latest.k, text: latest.kind }),
            ]),
            el('h2', { class: 'hl', text: latest.headline }),
            el('div', { class: 'dateline', text: latest.date_long }),
            el('div', { class: 'chips' }, (latest.tags || []).map((t) => el('span', { class: 'chip', text: t }))),
            el('span', { class: 'cta', text: 'Read the full report →', onclick: () => go('#/report/' + latest.id) }),
          ]) : null,
          el('div', { class: 'hero-side' }, [
            jumpCard('Daily report', 'Every edition, read inside the shell — no tab-hopping.', '#/report'),
            jumpCard('Rotation · RRG', 'Live weekly relative-rotation graph for Nifty indices and your own watchlists.', '#/rotation'),
            jumpCard('Sector research', (() => {
              const p = state.sectors.filter((s) => s.status === 'published' && s.path).length;
              return p ? p + ' of ' + state.sectors.length + ' ' + state.quarter + ' sector reviews are live.'
                       : state.sectors.length + ' ' + state.quarter + ' sector reviews — wired, awaiting publication.';
            })(), '#/sectors'),
          ]),
        ]),
        el('section', {}, [
          el('div', { class: 'sec-row' }, [
            el('h2', { class: 'sec', text: 'Recent editions' }),
            el('a', { href: '#/archive', class: 'hint', text: 'Full archive →' }),
          ]),
          el('div', { class: 'recent' }, rest.map((r) =>
            el('a', { href: '#/report/' + r.id }, [
              el('span', { class: 'rd', text: r.date_short }),
              el('span', { class: 'rk k-' + r.k, text: r.kind }),
              el('span', { class: 'rt', text: r.headline }),
              el('span', { class: 'ra', text: '→' }),
            ])
          )),
        ]),
      ]),
    ]),
  ]);
  return main;
}

function jumpCard(title, desc, href) {
  return el('div', { class: 'jump', onclick: () => go(href) }, [
    el('div', { class: 'jt', text: title }),
    el('div', { class: 'jd', text: desc }),
    el('div', { class: 'arr', text: '↗' }),
  ]);
}

/* Generic embedded-document frame with same-origin auto-height + cross-origin fallback. */
function docFrame(src, titleText, sizedLabel) {
  const frame = el('iframe', { class: 'report-frame', src, loading: 'eager', title: titleText });
  const hint = el('div', { class: 'frame-hint', text: 'Opens below · scroll within the frame' });
  const fit = () => {
    try {
      const nh = frame.contentDocument.documentElement.scrollHeight;
      if (nh > 400) { frame.style.height = nh + 'px'; frame.style.minHeight = '0'; hint.textContent = sizedLabel; return true; }
    } catch (_) { /* cross-origin */ }
    return false;
  };
  frame.addEventListener('load', () => {
    if (fit()) {
      [300, 900, 2000].forEach((t) => setTimeout(fit, t));
      window.addEventListener('resize', debounce(fit, 200));
    } else {
      hint.textContent = 'Opens below · scroll within the frame · full page ↗';
    }
  });
  return { frame, hint };
}

function viewReport() {
  const id = state.route.param || (state.reports[0] && state.reports[0].id);
  const rep = state.reports.find((r) => r.id === id) || state.reports[0];
  const main = el('main', { class: 'main' });
  if (!rep) { main.append(el('div', { class: 'state-msg', text: 'No reports in the manifest yet.' })); return main; }

  const select = el('select', { onchange: (e) => go('#/report/' + e.target.value) },
    state.reports.map((r) => el('option', { value: r.id, selected: r.id === rep.id ? 'selected' : null },
      r.date_short + '  ·  ' + r.kind)));

  const { frame, hint } = docFrame(embedUrl(rep.path), 'NIFTY & BEYOND — ' + rep.date_long, 'Report · ' + rep.date_long);

  main.append(
    pageHead('Daily brief', rep.headline, [
      { lab: 'Session', val: rep.date_short },
      { lab: 'Format', val: rep.kind, gold: true },
    ]),
    el('div', { class: 'report-bar' }, [
      select,
      el('span', { class: 'spacer' }),
      el('a', { class: 'linkout', href: pageUrl(rep.path), target: '_blank', rel: 'noopener', text: 'Open on GitHub Pages ↗' }),
      el('a', { class: 'linkout', href: state.bloggerUrl, target: '_blank', rel: 'noopener', text: 'Blogger ↗' }),
    ]),
    hint,
    el('div', { class: 'frame-wrap' }, [frame]),
  );
  return main;
}

function viewRotation() {
  return el('main', { class: 'main' }, [
    pageHead('Relative rotation', 'Where the money is moving', [
      { lab: 'Timeframe', val: 'Weekly' },
      { lab: 'Engine', val: 'v2 · JdK', gold: true },
    ]),
    el('div', { class: 'rrg-note', html:
      'Weekly Relative Rotation Graph — Nifty sectoral and broad-market indices, index constituents, and your own watchlists, measured against a benchmark. ' +
      'Points read straight from the read-only RRG&nbsp;V2 dataset; the app does not recompute. ' +
      '<a href="rotation/user-manual.html" target="_blank" rel="noopener">User manual ↗</a> · ' +
      '<a href="rotation/" target="_blank" rel="noopener">Open full-screen ↗</a>' }),
    el('iframe', { class: 'rrg-frame', src: 'rotation/', title: 'India RRG — Relative Rotation', loading: 'eager' }),
  ]);
}

function viewSectors() {
  if (state.route.param) return viewSectorDoc(state.route.param);

  const pub = state.sectors.filter((s) => s.status === 'published' && s.path);
  const grid = el('div', { class: 'sector-grid' }, state.sectors.map((s) => {
    const published = s.status === 'published' && s.path;
    const card = el('div', { class: 'sector-card' + (published ? ' published' : '') }, [
      el('div', { class: 'sc-top' }, [
        el('div', { class: 'sc-name', text: s.name }),
        el('div', { class: 'sc-q', text: s.quarter || state.quarter }),
      ]),
      el('div', { class: 'sc-note', text: s.note || '' }),
      el('div', { class: 'sc-foot' }, [
        el('span', { text: published ? 'Published' : 'Review pending' }),
        el('span', { class: 'go', text: published ? 'Open review →' : 'Wired' }),
      ]),
    ]);
    if (published) card.addEventListener('click', () => go('#/sectors/' + s.id));
    return card;
  }));

  const lede = pub.length
    ? pub.length + ' of ' + state.sectors.length + ' ' + state.quarter + ' sector reviews are live. Each opens in place; the ladder doubles as the index.'
    : 'No sector review has been published yet. Every sector below is wired to receive one — each review attaches in place as it is generated.';

  return el('main', { class: 'main' }, [
    pageHead('Sector earnings reviews', 'Sector research desk', [
      { lab: 'Quarter', val: state.quarter },
      { lab: 'Live', val: pub.length + ' / ' + state.sectors.length, gold: true },
    ]),
    el('div', { class: 'view' }, [
      el('p', { class: 'lede', text: lede }),
      grid,
    ]),
  ]);
}

function viewSectorDoc(id) {
  const s = state.sectors.find((x) => x.id === id);
  const main = el('main', { class: 'main' });
  if (!s || s.status !== 'published' || !s.path) {
    main.append(pageHead('Sector research', 'Not found'),
      el('div', { class: 'state-msg', html: 'No published review for <code>' + esc(id) + '</code>. <a href="#/sectors">Back to the desk →</a>' }));
    return main;
  }
  const published = state.sectors.filter((x) => x.status === 'published' && x.path);
  const select = el('select', { onchange: (e) => go('#/sectors/' + e.target.value) },
    published.map((x) => el('option', { value: x.id, selected: x.id === s.id ? 'selected' : null }, x.name)));

  // sectors/ ships inside this app (deployed with it), so it is same-origin everywhere
  // incl. localhost — reference it relative and let the frame auto-size.
  const { frame, hint } = docFrame(s.path, (s.title || s.name), s.name + ' · ' + (s.quarter || state.quarter));

  main.append(
    pageHead('Sector earnings review', s.name, [
      { lab: 'Quarter', val: s.quarter || state.quarter },
      { lab: 'Desk', val: 'rajan-sector', gold: true },
    ]),
    el('div', { class: 'report-bar' }, [
      el('a', { class: 'linkout', href: '#/sectors', text: '← All sectors' }),
      select,
      el('span', { class: 'spacer' }),
      el('a', { class: 'linkout', href: pageUrl(s.path), target: '_blank', rel: 'noopener', text: 'Open full page ↗' }),
    ]),
    hint,
    el('div', { class: 'frame-wrap' }, [frame]),
  );
  return main;
}

function viewArchive() {
  const a = state.archive;
  const kinds = [['all', 'All'], ['daily', 'Daily'], ['expiry', 'Expiry'], ['weekly', 'Weekly'], ['fo', 'F&O']];
  const q = a.q.trim().toLowerCase();
  const filtered = state.reports.filter((r) =>
    (a.kind === 'all' || r.k === a.kind) &&
    (!q || (r.headline + ' ' + r.date_long + ' ' + r.kind + ' ' + (r.tags || []).join(' ')).toLowerCase().includes(q))
  );

  const controls = el('div', { class: 'archive-controls' }, [
    el('div', { class: 'filter-box' }, [
      el('span', { class: 'k', text: '⌕' }),
      el('input', {
        type: 'text', value: a.q, placeholder: 'Filter by date, headline, stock or metric',
        oninput: (e) => { a.q = e.target.value; rerenderArchiveBody(); },
      }),
    ]),
    el('div', { class: 'seg' }, [
      segBtn('Cards', a.layout === 'cards', () => { a.layout = 'cards'; render(); }),
      segBtn('List', a.layout === 'list', () => { a.layout = 'list'; render(); }),
    ]),
    el('div', { class: 'kind-filters' }, kinds.map(([k, lbl]) =>
      el('button', { class: a.kind === k ? 'on' : '', onclick: () => { a.kind = k; render(); }, text: lbl })
    )),
  ]);

  const body = el('div', { id: 'arc-body' });
  fillArchiveBody(body, filtered, a.layout);

  return el('main', { class: 'main' }, [
    pageHead('Every report published', 'Archive', [
      { lab: 'Editions', val: String(state.reports.length) },
    ]),
    el('div', { class: 'view' }, [controls, body]),
  ]);
}

function segBtn(label, on, onclick) { return el('button', { class: on ? 'on' : '', onclick, text: label }); }

function rerenderArchiveBody() {
  const a = state.archive;
  const q = a.q.trim().toLowerCase();
  const filtered = state.reports.filter((r) =>
    (a.kind === 'all' || r.k === a.kind) &&
    (!q || (r.headline + ' ' + r.date_long + ' ' + r.kind + ' ' + (r.tags || []).join(' ')).toLowerCase().includes(q))
  );
  const body = $('#arc-body');
  if (body) { body.textContent = ''; fillArchiveBody(body, filtered, a.layout); }
}

function fillArchiveBody(body, list, layout) {
  if (!list.length) { body.append(el('div', { class: 'state-msg', text: 'Nothing matches that filter.' })); return; }
  if (layout === 'cards') {
    body.append(el('div', { class: 'arc-cards' }, list.map((r) =>
      el('div', { class: 'arc-card', onclick: () => go('#/report/' + r.id) }, [
        el('div', { class: 'ac-head tint-' + r.k }, [
          el('span', { class: 'ac-kind k-' + r.k, text: r.kind }),
          el('span', { class: 'ac-date', text: r.date_short }),
        ]),
        el('div', { class: 'ac-body' }, [
          el('div', { class: 'ac-hl', text: r.headline }),
          el('div', { class: 'ac-tags' }, (r.tags || []).slice(0, 4).map((t) => el('span', { class: 'ac-tag', text: t }))),
        ]),
      ])
    )));
  } else {
    body.append(el('div', { class: 'arc-list' }, list.map((r) =>
      el('div', { class: 'arc-row', onclick: () => go('#/report/' + r.id) }, [
        el('span', { class: 'rd', text: r.date_short }),
        el('span', { class: 'rk k-' + r.k, text: r.kind }),
        el('span', { class: 'rt', text: r.headline }),
        el('span', { class: 'rtag', text: (r.tags || [])[0] || '' }),
        el('span', { class: 'ra', text: '↗' }),
      ])
    )));
  }
  body.append(el('div', { class: 'arc-count', text: list.length + ' of ' + state.reports.length + ' reports · GitHub Pages' }));
}

/* ---------- search ---------- */
function buildIndex() {
  const out = [];
  out.push(
    { kind: 'Go', label: "Today's close", meta: 'Home', hay: 'home today close overview dashboard', act: () => go('#/') },
    { kind: 'Go', label: 'Daily report', meta: 'Latest edition', hay: 'daily report brief eod post market close nifty', act: () => go('#/report') },
    { kind: 'Go', label: 'Rotation · RRG', meta: 'Weekly graph', hay: 'rrg rotation relative strength momentum sector rotation graph', act: () => go('#/rotation') },
    { kind: 'Go', label: 'Sector research', meta: 'Earnings reviews', hay: 'sector research earnings review desk', act: () => go('#/sectors') },
    { kind: 'Go', label: 'Archive', meta: 'All reports', hay: 'archive history all reports past editions', act: () => go('#/archive') },
  );
  for (const r of state.reports) {
    const ymd = r.id.slice(0, 10).replace(/-/g, '');
    const mentions = r.mentions || [];
    out.push({
      kind: r.k === 'fo' ? 'F&O' : r.kind.split(' ')[0],
      label: r.headline, meta: r.date_short + ' · ' + r.kind,
      names: mentions,
      hay: [r.headline, r.date_long, r.date_short, r.id, ymd, r.kind, ...(r.tags || []), ...mentions].join(' ').toLowerCase(),
      act: () => go('#/report/' + r.id),
    });
  }
  for (const s of state.sectors) {
    const live = s.status === 'published' && s.path;
    const covers = s.covers || [];
    out.push({
      kind: 'Sector', label: s.name,
      meta: (s.quarter || state.quarter) + ' · ' + (live ? 'published' : 'pending'),
      names: covers,
      hay: [s.name, s.title, s.note, 'sector review earnings', ...covers].join(' ').toLowerCase(),
      act: () => go(live ? '#/sectors/' + s.id : '#/sectors'),
    });
  }
  return out;
}

function tokenize(s) { return s.toLowerCase().split(/[^a-z0-9&.:+₹%-]+/).filter(Boolean); }

function scoreItem(item, tokens, phrase) {
  const label = item.label.toLowerCase();
  const meta = item.meta.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (!item.hay.includes(t)) return -1;           // AND — every token must appear somewhere
    if (label.includes(t)) score += 6;
    else if (meta.includes(t)) score += 3;
    else score += 1;
  }
  if (phrase && item.hay.includes(phrase)) score += 4;
  if (phrase && label.includes(phrase)) score += 6;
  if (item.kind === 'Go') score += 1;
  return score;
}

function openSearch() { state.search = { open: true, q: '', sel: 0 }; render(); setTimeout(() => { const i = $('#search-input'); if (i) i.focus(); }, 0); }
function closeSearch() { state.search.open = false; render(); }

function searchResults() {
  const q = state.search.q.trim().toLowerCase();
  const idx = buildIndex();
  if (!q) return idx.filter((i) => i.kind === 'Go').concat(idx.filter((i) => i.kind !== 'Go').slice(0, 4)).slice(0, 24);
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const scored = idx
    .map((i) => ({ i, s: scoreItem(i, tokens, q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 24);
  return scored.map(({ i }) => {
    // surface which listed company matched (sector reviews and daily briefs)
    if (i.names && i.names.length) {
      const hit = [...new Set(i.names.filter((c) => tokens.some((t) => c.toLowerCase().includes(t))))];
      if (hit.length) {
        const verb = i.kind === 'Sector' ? 'covers ' : 'names ';
        return { ...i, meta: i.meta.split(' · ')[0] + ' · ' + verb + hit.slice(0, 3).join(', ') + (hit.length > 3 ? ' +' + (hit.length - 3) : '') };
      }
    }
    return i;
  });
}

/* Build a fragment with query tokens wrapped in <mark>. Longest tokens first so
 * "apollo hosp" highlights "hosp" inside a word already covered by "apollo". */
function markMatches(text, tokens) {
  const frag = document.createDocumentFragment();
  const toks = [...tokens].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!toks.length) { frag.append(text); return frag; }
  const re = new RegExp('(' + toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig');
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    frag.append(el('mark', { text: m[0] }));
    last = m.index + m[0].length;
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

function searchOverlay() {
  const hits = searchResults();
  const toks = tokenize(state.search.q.trim());
  if (state.search.sel >= hits.length) state.search.sel = Math.max(0, hits.length - 1);
  const list = el('div', { class: 'search-results' }, hits.map((h, i) =>
    el('div', { class: 'sr' + (i === state.search.sel ? ' sel' : ''), onclick: () => { closeSearch(); h.act(); } }, [
      el('span', { class: 'sr-kind', text: h.kind }),
      el('span', { class: 'sr-label' }, [markMatches(h.label, toks)]),
      el('span', { class: 'sr-meta' }, [markMatches(h.meta, toks)]),
    ])
  ));
  const panel = el('div', { class: 'search-panel', onclick: (e) => e.stopPropagation() }, [
    el('div', { class: 'sp-input' }, [
      el('span', { class: 'k', text: '⌕' }),
      el('input', {
        id: 'search-input', type: 'text', value: state.search.q,
        placeholder: 'Search reports, sectors, screens…', autocomplete: 'off',
        oninput: (e) => { state.search.q = e.target.value; state.search.sel = 0; refreshSearch(); },
        onkeydown: (e) => {
          const n = searchResults().length;
          if (e.key === 'ArrowDown') { e.preventDefault(); state.search.sel = Math.min(n - 1, state.search.sel + 1); refreshSearch(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); state.search.sel = Math.max(0, state.search.sel - 1); refreshSearch(); }
          else if (e.key === 'Enter') { const h = searchResults()[state.search.sel]; if (h) { closeSearch(); h.act(); } }
        },
      }),
      el('span', { class: 'sp-esc', text: 'ESC', onclick: () => closeSearch() }),
    ]),
    list,
    el('div', { class: 'search-foot', text: (state.search.q ? hits.length + ' matches' : 'Reports, sectors and screens') + ' · enter opens' }),
  ]);
  return el('div', { class: 'overlay', onclick: () => closeSearch() }, [panel]);
}

function refreshSearch() {
  const root = $('#app');
  const old = $('.overlay', root);
  if (old) old.replaceWith(searchOverlay());
  const i = $('#search-input');
  if (i) { i.focus(); const v = i.value; i.value = ''; i.value = v; }
}

function wireGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); state.search.open ? closeSearch() : openSearch(); }
    else if (e.key === 'Escape' && state.search.open) closeSearch();
  });
}

/* ---------- util ---------- */
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

boot();
