// Today: the vault's home. It shows what's open, it doesn't nag: no overdue labels, no streaks.
// Everything here is read live from the notes on every load (the note cache in vault.js keeps
// that cheap); only the activity strip, which asks git, is kept for a few minutes.
// This replaces the snapshot that pages/_build/dashboard.py used to bake into pages/dashboard.html.
import { readFileSync, existsSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { section, VAULT } from './vault.js';
import { readTodos } from './todo.js';
import { readInbox } from './api.js';

const p2 = (x) => String(x).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const dayOf = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? null : d; };
const daysAgo = (s, today) => { const d = dayOf(s); return d ? Math.round((today - d) / 864e5) : null; };

// The receipt, sorted.md: one line per capture and where the sort put it.
export function readSorted() {
  const file = join(VAULT, 'sorted.md');
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^- \*\*(\d{4}-\d\d-\d\d)\*\*\s+(.*?)\s+→\s+(.*)$/.exec(line);
    if (!m) continue;
    const link = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(m[3]);
    out.push({ date: m[1], text: m[2], to: link ? link[1] : '', label: link ? (link[2] || link[1]) : m[3].replace(/[*_]/g, ''), merged: /merged/i.test(m[3]), raw: m[3] });
  }
  return out;
}

// Notes touched per day for the last four weeks, from git. Asked in the background and kept
// for five minutes, so a page load never waits on it.
let activity = { at: 0, day: '', touched: {} };
function tally(out) {
  const touched = {};
  let cur = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('@')) cur = line.slice(1);
    else if (cur && line.endsWith('.md') && !line.startsWith('.claude/') && !line.startsWith('pages/_')) (touched[cur] ||= new Set()).add(line);
  }
  return Object.fromEntries(Object.entries(touched).map(([d, s]) => [d, s.size]));
}
function refreshActivity(today) {
  if (Date.now() - activity.at < 5 * 60e3 && activity.day === iso(today)) return;
  const first = !activity.at;
  activity.at = Date.now(); activity.day = iso(today);
  const since = new Date(today); since.setDate(since.getDate() - 40);
  const args = ['-C', VAULT, 'log', `--since=${iso(since)}`, '--name-only', '--format=@%ad', '--date=short'];
  const opts = { maxBuffer: 8 * 1024 * 1024, timeout: 8000, encoding: 'utf8' };
  // The very first load waits for the answer once; after that it's refreshed behind the page.
  if (first) { try { activity.touched = tally(execFileSync('git', args, opts)); } catch {} return; }
  execFile('git', args, opts, (err, out) => { if (!err) activity.touched = tally(out); });
}

export function todayData(notes, now = new Date()) {
  const today = dayOf(iso(now));
  refreshActivity(today);
  const live = notes.filter((n) => !n.archived);
  const shelf = (s) => live.filter((n) => section(n) === s);
  const slim = (n) => ({ name: n.name, title: n.title, description: n.description, next: n.next || '', status: n.status || '',
    horizon: n.horizon || '', effort: n.effort || '', group: n.group || '', created: n.created || '', updated: n.updated || '', page: n.page || '' });

  const projects = shelf('projects').filter((n) => n.status === 'active').sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const ideas = shelf('ideas');

  // One idea back from the backlog: the same one all day, a different one tomorrow.
  const cold = ideas.filter((i) => (daysAgo(i.updated, today) ?? 0) >= 21);
  const pool = (cold.length ? cold : ideas).slice().sort((a, b) => a.name.localeCompare(b.name));
  const seed = parseInt(createHash('sha1').update(iso(today)).digest('hex').slice(0, 12), 16);
  const resurfaced = pool.length ? pool[seed % pool.length] : null;
  const category = resurfaced?.group ? notes.find((n) => n.type === 'category' && n.group === resurfaced.group) : null;

  // To do on the home page is only what was picked for today. When nothing is picked yet, the
  // next few in line come along as suggestions, one tap each; the whole list lives on /todo.
  const t = readTodos();
  const slimTodo = (i) => {
    const link = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/.exec(i.text);
    const text = i.text.replace(/\[\[[^\]]+\]\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\s.—-]+$/, '').trim();
    return { text, raw: i.text, link: link ? link[1] : '', done: i.done };
  };
  const items = t?.items || [];
  const openIn = (k) => items.filter((i) => !i.done && i.tier === k);
  const todos = items.filter((i) => i.tier === 'today' && (!i.done || t.fresh)).map(slimTodo);
  const suggest = todos.length ? [] : openIn('time').concat(openIn('new')).slice(0, 3).map(slimTodo);
  const todoMeta = { time: openIn('time').length, later: openIn('later').length, sort: openIn('new').length,
    picked: t?.picked || '', fresh: !!t?.fresh };

  const sorted = readSorted();
  const waiting = readInbox();
  const captured = (lo, hi) => sorted.filter((c) => { const a = daysAgo(c.date, today); return a >= lo && a < hi; }).length
    + waiting.filter((c) => { const a = daysAgo(c.at, today); return a >= lo && a < hi; }).length;

  const days = [];
  for (let i = 27; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(iso(d)); }
  const counts = days.map((d) => activity.touched[d] || 0);

  return {
    today: iso(today),
    resurfaced: resurfaced ? { ...slim(resurfaced), groupTitle: category?.title || '' } : null,
    projects: projects.map(slim),
    todos,
    suggest,
    todoMeta,
    waiting: waiting.slice().reverse().map((w) => ({ at: w.at, text: w.text })),
    landed: sorted.slice(-5).reverse().map(({ raw, ...c }) => c),
    activity: { days, counts, week: counts.slice(-7).reduce((a, b) => a + b, 0), lastWeek: counts.slice(-14, -7).reduce((a, b) => a + b, 0) },
    captured: { week: captured(0, 7), lastWeek: captured(7, 14) },
    ideaCount: ideas.length,
  };
}
