const $ = (s, r = document) => r.querySelector(s);
const api = (p, o = {}) => fetch('/api' + p, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && JSON.stringify(o.body) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (n) => Math.round(n * 100) + '%';
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const badge = (s) => `<span class="badge s-${esc(s)}">${esc(s)}</span>`;

let tab = 'dashboard', contacts = [], openId = null, config = {};

function show(t) {
  tab = t;
  for (const s of document.querySelectorAll('main > section')) s.hidden = s.id !== t;
  for (const b of document.querySelectorAll('nav button')) b.classList.toggle('on', b.dataset.tab === t);
  if (t === 'campaigns') { openId = null; $('#listView').hidden = false; $('#detail').hidden = true; }
  refresh();
}
document.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => show(b.dataset.tab));
document.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => show(b.dataset.go));

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((r) => {
    const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim());
    o.phone = o.phone || o.phone_number || o.mobile || o.number || '';
    o.name = o.name || o.full_name || [o.first_name, o.last_name].filter(Boolean).join(' ');
    o.first_name = o.first_name || (o.name || '').split(' ')[0];
    return o;
  });
}
function setContacts(list) {
  contacts = list;
  const cols = list.length ? Object.keys(list[0]).filter((k) => k !== 'first_name') : [];
  $('#chips').innerHTML = (list.length ? [...new Set(['first_name', ...cols])] : ['first_name', 'name']).map((c) => `<span class="chip" data-v="${c}">{{${c}}}</span>`).join('');
  $('#preview').innerHTML = list.length
    ? `<p class="muted">${list.length} contacts loaded</p><div class="tablewrap"><table><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${list.slice(0, 50).map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</table></div>`
    : '';
  renderPreview();
}
$('#chips').onclick = (e) => { const v = e.target.dataset.v; if (!v) return; const t = $('#first'); t.setRangeText(`{{${v}}}`, t.selectionStart, t.selectionEnd, 'end'); t.focus(); renderPreview(); };
function renderPreview() {
  const c = contacts[0] || { name: 'Jane Doe', first_name: 'Jane' };
  $('#render').textContent = $('#first').value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => c[k] ?? '');
}
$('#first').oninput = renderPreview;
$('#paste').oninput = () => setContacts(parseCSV($('#paste').value));
const readFile = (f) => f && f.text().then((t) => { $('#paste').value = t; setContacts(parseCSV(t)); });
$('#drop').onclick = () => $('#file').click();
$('#file').onchange = (e) => readFile(e.target.files[0]);
$('#drop').ondragover = (e) => { e.preventDefault(); $('#drop').classList.add('over'); };
$('#drop').ondragleave = () => $('#drop').classList.remove('over');
$('#drop').ondrop = (e) => { e.preventDefault(); $('#drop').classList.remove('over'); readFile(e.dataTransfer.files[0]); };
$('#sample').onclick = () => {
  const names = ['Jane Doe', 'Rahul Sharma', 'Maria Garcia', 'Chen Wei', 'Olivia Smith', 'Ahmed Khan', 'Sophie Martin', 'Liam Brown', 'Priya Patel', 'Noah Wilson', 'Emma Davis', 'Lucas Silva'];
  const t = 'name,phone,company\n' + names.map((n, i) => `${n},+1415555${String(1000 + i * 37).slice(0, 4)},Company ${i + 1}`).join('\n') + '\nBad Number,12ab,Nowhere\nJane Doe,+14155551000,Dup Inc';
  $('#paste').value = t; setContacts(parseCSV(t));
};

$('#launch').onclick = async () => {
  $('#err').textContent = '';
  try {
    const win = $('#win').value && { start: +$('#win').value.split('-')[0], end: +$('#win').value.split('-')[1] };
    const c = await api('/campaigns', { method: 'POST', body: {
      name: $('#name').value.trim() || 'Untitled campaign', contacts, script: $('#script').value, firstMessage: $('#first').value,
      voice: $('#voice').value, language: $('#lang').value, concurrency: +$('#conc').value, defaultCountry: $('#cc').value || '1',
      window: win || null, speed: +$('#speed').value, simulate: !config.live || $('#sim').checked } });
    await api(`/campaigns/${c.id}/start`, { method: 'POST' });
    contacts = []; $('#paste').value = ''; setContacts([]);
    show('campaigns'); openCampaign(c.id);
  } catch (e) { $('#err').textContent = e.message; }
};

// ---------- views ----------
const item = (c) => `<div class="item" data-id="${c.id}"><div class="grow"><b>${esc(c.name)}</b> ${badge(c.status)}<br>
  <small>${c.stats.done}/${c.stats.total} calls · ${pct(c.stats.answerRate)} answered · ${c.stats.interested} interested</small>
  <div class="bar"><i style="width:${c.stats.total ? pct(c.stats.done / c.stats.total) : 0}"></i></div></div></div>`;
const bindItems = (el) => el.querySelectorAll('.item').forEach((i) => i.onclick = () => { show('campaigns'); openCampaign(i.dataset.id); });

async function refresh() {
  if (tab === 'dashboard') {
    const [s, l] = await Promise.all([api('/stats'), api('/campaigns')]);
    const cards = [['Campaigns', s.campaigns], ['Total calls', s.calls], ['Completed', s.done], ['Answer rate', pct(s.answerRate)], ['Interested', s.interested], ['Talk time', s.talkMinutes + ' min'], ['In progress', s.active]];
    $('#statCards').innerHTML = cards.map(([k, v]) => `<div class="card"><b>${v}</b><span>${k}</span></div>`).join('');
    $('#recent').innerHTML = l.slice(0, 5).map(item).join('') || '<p class="muted">No campaigns yet.</p>';
    bindItems($('#recent'));
  } else if (tab === 'campaigns') {
    if (openId) return renderDetail();
    const l = await api('/campaigns');
    $('#all').innerHTML = l.map(item).join('') || '<p class="muted">No campaigns yet.</p>';
    bindItems($('#all'));
  }
}
function openCampaign(id) { openId = id; $('#listView').hidden = true; $('#detail').hidden = false; renderDetail(); }

async function renderDetail() {
  let c;
  try { c = await api('/campaigns/' + openId); } catch { return show('campaigns'); }
  const s = c.stats;
  const outcomes = [['Interested', s.interested], ['Callback', s.callback], ['Not interested', s.notInterested], ['Voicemail', s.voicemail], ['No answer', s.noAnswer], ['Failed', s.failed]];
  const max = Math.max(1, ...outcomes.map((o) => o[1]));
  const scroll = $('#detail .tablewrap')?.scrollTop || 0;
  $('#detail').innerHTML = `
    <button class="ghost sm" id="back">← All campaigns</button>
    <h1>${esc(c.name)} ${badge(c.status)}</h1>
    <p class="muted">Voice ${esc(c.voice)} · ${esc(c.language)} · ${c.concurrency} parallel</p>
    <div class="toolbar">
      ${['draft', 'paused', 'scheduled'].includes(c.status) ? '<button class="primary" data-a="start">▶ Start</button>' : ''}
      ${c.status === 'running' ? '<button class="sm" data-a="pause">⏸ Pause</button>' : ''}
      ${['running', 'paused'].includes(c.status) ? '<button class="sm danger" data-a="stop">■ Stop</button>' : ''}
      <a href="/api/campaigns/${c.id}/export.csv"><button class="sm">⬇ Export CSV</button></a>
      <button class="sm danger" data-a="del">Delete</button>
    </div>
    <div class="cards">${[['Progress', `${s.done}/${s.total}`], ['Active now', s.active], ['Answer rate', pct(s.answerRate)], ['Interested', s.interested], ['Talk time', fmt(s.talkSeconds)]].map(([k, v]) => `<div class="card"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
    <div class="bar" style="height:10px;margin:14px 0"><i style="width:${s.total ? pct(s.done / s.total) : 0}"></i></div>
    <div class="grid2"><div class="panel"><h3>Outcomes</h3>${outcomes.map(([k, v]) => `<div class="muted">${k} · ${v}</div><div class="bar"><i style="width:${pct(v / max)}"></i></div>`).join('')}</div>
    <div class="panel"><h3>Agent</h3><p class="muted"><b>Opening:</b> ${esc(c.firstMessage)}</p><p class="muted"><b>Instructions:</b> ${esc(c.script)}</p></div></div>
    <div class="panel"><h3>Calls</h3><div class="tablewrap"><table><tr><th>Contact</th><th>Phone</th><th>Status</th><th>Outcome</th><th>Sentiment</th><th>Duration</th></tr>
    ${c.calls.map((k) => `<tr class="click" data-k="${k.id}"><td>${esc(k.name || '—')}</td><td>${esc(k.phone)}</td><td>${['dialing', 'ringing', 'in-progress'].includes(k.status) ? '<span class="pulse"></span> ' : ''}${badge(k.status)}</td><td>${k.outcome ? badge(k.outcome) : ''}</td><td>${k.sentiment ? badge(k.sentiment) : ''}</td><td>${k.duration ? fmt(k.duration) : ''}</td></tr>`).join('')}</table></div></div>`;
  $('#detail .tablewrap').scrollTop = scroll;
  $('#back').onclick = () => show('campaigns');
  $('#detail').querySelectorAll('[data-a]').forEach((b) => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === 'del') { if (!confirm('Delete this campaign?')) return; await api('/campaigns/' + c.id, { method: 'DELETE' }); return show('campaigns'); }
    await api(`/campaigns/${c.id}/${a}`, { method: 'POST' }); renderDetail();
  });
  $('#detail').querySelectorAll('tr[data-k]').forEach((r) => r.onclick = () => {
    const k = c.calls.find((x) => x.id === r.dataset.k);
    $('#modalBody').innerHTML = `<h3>${esc(k.name || k.phone)}</h3><p class="muted">${esc(k.phone)} · ${badge(k.status)} ${k.outcome ? badge(k.outcome) : ''}</p>
      ${k.summary ? `<p><b>Summary:</b> ${esc(k.summary)}</p>` : ''}
      ${k.transcript.length ? k.transcript.map((m) => `<div class="msg ${m.role}">${esc(m.text)}</div>`).join('') : '<p class="muted">No transcript available.</p>'}`;
    $('#modal').hidden = false;
  });
}
$('#close').onclick = () => $('#modal').hidden = true;
$('#modal').onclick = (e) => { if (e.target.id === 'modal') $('#modal').hidden = true; };

(async () => {
  config = await api('/config');
  $('#mode').textContent = config.live ? `Live · ${config.from}` : 'Simulation mode';
  $('#mode').className = 'pill ' + (config.live ? 'live' : 'sim');
  $('#liveNote').textContent = config.live ? 'Twilio is configured. Untick "Simulate" to place real calls — the opening line is spoken with text-to-speech.' : 'Running in simulation mode. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER to place real calls.';
  if (!config.live) $('#sim').disabled = true;
  setContacts([]);
  refresh();
  setInterval(() => { if (!$('#modal').hidden) return; refresh().catch(() => {}); }, 1500);
})();
