import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3000;
const TWILIO = {
  sid: process.env.TWILIO_ACCOUNT_SID,
  token: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_FROM_NUMBER,
};
export const LIVE = !!(TWILIO.sid && TWILIO.token && TWILIO.from);

// ---------- storage ----------
let db = { campaigns: [] };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {}
let saveTimer;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DB_FILE, JSON.stringify(db), () => {}), 200);
};
// calls that were mid-flight when the server stopped cannot be resumed
for (const c of db.campaigns) {
  if (c.status === 'running') c.status = 'paused';
  for (const k of c.calls) if (['dialing', 'ringing', 'in-progress'].includes(k.status)) k.status = 'queued';
}

const uid = () => crypto.randomUUID().slice(0, 8);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- helpers ----------
export function normalizePhone(raw, defaultCountry = '1') {
  let s = String(raw || '').trim();
  const plus = s.startsWith('+');
  s = s.replace(/\D/g, '');
  if (!s) return null;
  if (!plus) {
    if (s.length === 10) s = defaultCountry + s;
    else if (s.startsWith('00')) s = s.slice(2);
  }
  return s.length >= 8 && s.length <= 15 ? '+' + s : null;
}

export function renderTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = vars[k] ?? vars[k.toLowerCase()];
    return v === undefined || v === '' ? '' : String(v);
  }).replace(/\s{2,}/g, ' ').trim();
}

function buildCalls(contacts, defaultCountry) {
  const seen = new Set();
  const calls = [];
  for (const c of contacts) {
    const phone = normalizePhone(c.phone, defaultCountry);
    const call = {
      id: uid(), name: c.name || '', phone: phone || String(c.phone || ''),
      vars: c, status: 'queued', outcome: null, sentiment: null,
      duration: 0, transcript: [], summary: '', startedAt: null, endedAt: null, attempts: 0,
    };
    if (!phone) { call.status = 'failed'; call.outcome = 'invalid number'; }
    else if (seen.has(phone)) { call.status = 'skipped'; call.outcome = 'duplicate'; }
    else seen.add(phone);
    calls.push(call);
  }
  return calls;
}

// ---------- simulated AI conversation ----------
const OUTCOMES = [
  ['interested', 0.28], ['callback', 0.14], ['not interested', 0.22],
  ['voicemail', 0.14], ['no answer', 0.14], ['busy', 0.05], ['failed', 0.03],
];
function pickOutcome() {
  let r = Math.random();
  for (const [o, p] of OUTCOMES) { if ((r -= p) < 0) return o; }
  return 'no answer';
}
const REPLIES = {
  interested: [
    ['Yes, I have a minute. Tell me more.', 'Great! The main benefit is that it saves your team hours every week. Would you like a demo?', 'Sure, that sounds useful. Send me the details.', 'Perfect, I\'ll send a confirmation right after this call. Thanks for your time!'],
    ['Oh, hi. What is this about?', 'I\'m calling to share something I think fits your needs. Can I take 30 seconds?', 'Okay, go ahead.', 'Wonderful. Shall I book a quick walkthrough this week?', 'Yes, Thursday works.'],
  ],
  callback: [
    ['I\'m a bit busy right now.', 'No problem at all. When would be a better time to reach you?', 'Maybe tomorrow afternoon.', 'Perfect, I\'ll call you tomorrow afternoon. Thank you!'],
  ],
  'not interested': [
    ['Who is this?', 'Briefly explaining why I\'m calling...', 'No thanks, I\'m not interested.', 'Understood, I appreciate your time. Have a great day!'],
    ['Please don\'t call again.', 'Of course, I\'ll make sure you are removed from our list. Sorry for the interruption.'],
  ],
};
function simulateConversation(call, c, outcome) {
  const vars = { ...call.vars, name: call.name, first_name: (call.name || '').split(' ')[0] };
  const t = [];
  if (outcome === 'voicemail') {
    t.push({ role: 'ai', text: renderTemplate(c.firstMessage, vars) + ' (voicemail) Please call us back at your convenience.' });
    return { transcript: t, summary: 'Left a voicemail.', sentiment: 'neutral' };
  }
  t.push({ role: 'ai', text: renderTemplate(c.firstMessage, vars) });
  const flow = pick(REPLIES[outcome]);
  flow.forEach((line, i) => t.push({ role: i % 2 === 0 ? 'contact' : 'ai', text: line }));
  const sentiment = outcome === 'interested' ? 'positive' : outcome === 'not interested' ? 'negative' : 'neutral';
  const summary = {
    interested: `${call.name || 'Contact'} showed interest and agreed to a follow-up.`,
    callback: `${call.name || 'Contact'} asked to be called back later.`,
    'not interested': `${call.name || 'Contact'} declined.`,
  }[outcome];
  return { transcript: t, summary, sentiment };
}

// ---------- call execution ----------
const active = new Map(); // callId -> true

function finish(c, call, outcome, extra = {}) {
  call.status = outcome === 'failed' ? 'failed' : (['no answer', 'busy'].includes(outcome) ? outcome : 'completed');
  call.outcome = outcome;
  call.endedAt = Date.now();
  Object.assign(call, extra);
  active.delete(call.id);
  save();
}

function runSimulated(c, call) {
  call.status = 'dialing'; call.startedAt = Date.now(); call.attempts++;
  const outcome = pickOutcome();
  const speed = c.speed || 1;
  const ring = rand(800, 2000) / speed;
  setTimeout(() => {
    if (c.status === 'stopped') return finish(c, call, 'failed', { summary: 'Cancelled' });
    call.status = 'ringing';
    setTimeout(() => {
      if (outcome === 'no answer' || outcome === 'busy' || outcome === 'failed') return finish(c, call, outcome, { duration: Math.round(rand(15, 30)) });
      call.status = 'in-progress';
      const dur = rand(2500, 6000) / speed;
      setTimeout(() => {
        const r = simulateConversation(call, c, outcome);
        finish(c, call, outcome, { ...r, duration: Math.round(dur * speed / 100) + 20 });
      }, dur);
    }, rand(1200, 3000) / speed);
  }, ring);
}

async function twilio(pathname, body) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO.sid}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TWILIO.sid}:${TWILIO.token}`).toString('base64'),
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? new URLSearchParams(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || res.statusText);
  return json;
}
const esc = (s) => s.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));

async function runLive(c, call) {
  call.status = 'dialing'; call.startedAt = Date.now(); call.attempts++;
  const vars = { ...call.vars, first_name: (call.name || '').split(' ')[0] };
  const say = esc(renderTemplate(c.firstMessage, vars));
  try {
    const res = await twilio('/Calls.json', {
      To: call.phone, From: TWILIO.from,
      Twiml: `<Response><Say language="${c.language}">${say}</Say><Pause length="1"/></Response>`,
    });
    call.sid = res.sid;
    call.transcript = [{ role: 'ai', text: renderTemplate(c.firstMessage, vars) }];
    const poll = async () => {
      try {
        const s = await twilio(`/Calls/${call.sid}.json`);
        call.status = { queued: 'dialing', ringing: 'ringing', 'in-progress': 'in-progress' }[s.status] || call.status;
        if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(s.status)) {
          const outcome = { completed: 'completed', busy: 'busy', 'no-answer': 'no answer' }[s.status] || 'failed';
          return finish(c, call, outcome, { duration: Number(s.duration) || 0, summary: 'Message delivered.' });
        }
        setTimeout(poll, 2000);
      } catch (e) { finish(c, call, 'failed', { summary: e.message }); }
    };
    setTimeout(poll, 2000);
  } catch (e) { finish(c, call, 'failed', { summary: e.message }); }
}

function inWindow(c) {
  if (!c.window) return true;
  const h = new Date().getHours();
  return h >= c.window.start && h < c.window.end;
}

function tick() {
  for (const c of db.campaigns) {
    if (c.status === 'scheduled' && c.scheduledAt && Date.now() >= c.scheduledAt) c.status = 'running';
    if (c.status !== 'running') continue;
    const inflight = c.calls.filter((k) => active.has(k.id)).length;
    const pending = c.calls.filter((k) => k.status === 'queued');
    if (!pending.length && !inflight) { c.status = 'completed'; c.completedAt = Date.now(); save(); continue; }
    if (!inWindow(c)) continue;
    for (const call of pending.slice(0, Math.max(0, c.concurrency - inflight))) {
      active.set(call.id, true);
      (LIVE && !c.simulate ? runLive : runSimulated)(c, call);
    }
  }
}
setInterval(tick, 500);

// ---------- stats ----------
export function summarize(c) {
  const by = {};
  let talk = 0, done = 0;
  for (const k of c.calls) {
    by[k.status] = (by[k.status] || 0) + 1;
    if (k.outcome) by['o:' + k.outcome] = (by['o:' + k.outcome] || 0) + 1;
    if (k.status === 'completed') talk += k.duration;
    if (!['queued', 'dialing', 'ringing', 'in-progress'].includes(k.status)) done++;
  }
  const answered = by.completed || 0;
  return {
    total: c.calls.length, done, answered, talkSeconds: talk,
    answerRate: done ? answered / done : 0,
    interested: by['o:interested'] || 0, callback: by['o:callback'] || 0,
    notInterested: by['o:not interested'] || 0, voicemail: by['o:voicemail'] || 0,
    noAnswer: by['o:no answer'] || 0, failed: (by.failed || 0), active: (by.dialing || 0) + (by.ringing || 0) + (by['in-progress'] || 0),
    queued: by.queued || 0,
  };
}
const listView = (c) => ({ id: c.id, name: c.name, status: c.status, createdAt: c.createdAt, language: c.language, voice: c.voice, stats: summarize(c) });

// ---------- http ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((ok, no) => {
  let b = ''; req.on('data', (d) => { b += d; if (b.length > 20e6) req.destroy(); });
  req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(e); } });
});
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p.startsWith('/api/')) {
      let m;
      if (p === '/api/config') return json(res, 200, { live: LIVE, from: LIVE ? TWILIO.from : null });
      if (p === '/api/campaigns' && req.method === 'GET') return json(res, 200, db.campaigns.map(listView).reverse());
      if (p === '/api/campaigns' && req.method === 'POST') {
        const b = await readBody(req);
        if (!b.name || !Array.isArray(b.contacts) || !b.contacts.length) return json(res, 400, { error: 'name and contacts are required' });
        const c = {
          id: uid(), name: String(b.name).slice(0, 100), status: 'draft', createdAt: Date.now(),
          script: b.script || '', firstMessage: b.firstMessage || 'Hi {{first_name}}, this is an AI assistant calling.',
          voice: b.voice || 'Ava', language: b.language || 'en-US', goal: b.goal || '',
          concurrency: Math.min(50, Math.max(1, +b.concurrency || 3)), speed: Math.min(20, Math.max(1, +b.speed || 1)),
          window: b.window || null, simulate: !!b.simulate, scheduledAt: b.scheduledAt || null,
          calls: buildCalls(b.contacts, b.defaultCountry || '1'),
        };
        db.campaigns.push(c); save();
        return json(res, 201, listView(c));
      }
      if ((m = p.match(/^\/api\/campaigns\/(\w+)$/))) {
        const c = db.campaigns.find((x) => x.id === m[1]);
        if (!c) return json(res, 404, { error: 'not found' });
        if (req.method === 'DELETE') { db.campaigns = db.campaigns.filter((x) => x !== c); save(); return json(res, 200, { ok: true }); }
        return json(res, 200, { ...listView(c), script: c.script, firstMessage: c.firstMessage, goal: c.goal, concurrency: c.concurrency, calls: c.calls.map(({ vars, ...k }) => k) });
      }
      if ((m = p.match(/^\/api\/campaigns\/(\w+)\/(start|pause|stop)$/)) && req.method === 'POST') {
        const c = db.campaigns.find((x) => x.id === m[1]);
        if (!c) return json(res, 404, { error: 'not found' });
        if (m[2] === 'start') {
          if (c.status === 'completed') return json(res, 400, { error: 'campaign already completed' });
          c.status = 'running';
        } else if (m[2] === 'pause') c.status = 'paused';
        else { c.status = 'stopped'; for (const k of c.calls) if (k.status === 'queued') { k.status = 'skipped'; k.outcome = 'cancelled'; } }
        save();
        return json(res, 200, listView(c));
      }
      if ((m = p.match(/^\/api\/campaigns\/(\w+)\/export\.csv$/))) {
        const c = db.campaigns.find((x) => x.id === m[1]);
        if (!c) return json(res, 404, { error: 'not found' });
        const rows = [['name', 'phone', 'status', 'outcome', 'sentiment', 'duration_s', 'summary'].join(',')];
        for (const k of c.calls) rows.push([k.name, k.phone, k.status, k.outcome, k.sentiment, k.duration, k.summary].map(csvCell).join(','));
        res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${c.name.replace(/\W+/g, '_')}.csv"` });
        return res.end(rows.join('\n'));
      }
      if (p === '/api/stats') {
        const all = db.campaigns.map(summarize);
        const sum = (f) => all.reduce((a, s) => a + s[f], 0);
        const done = sum('done');
        return json(res, 200, {
          campaigns: db.campaigns.length, calls: sum('total'), done, answered: sum('answered'),
          answerRate: done ? sum('answered') / done : 0, interested: sum('interested'),
          talkMinutes: Math.round(sum('talkSeconds') / 60), active: sum('active'),
        });
      }
      return json(res, 404, { error: 'unknown endpoint' });
    }
    // static
    const file = path.join(PUBLIC, p === '/' ? 'index.html' : path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { json(res, 400, { error: e.message }); }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Bulk AI Calling on http://localhost:${PORT} — ${LIVE ? 'LIVE (Twilio)' : 'simulation mode'}`));
}
