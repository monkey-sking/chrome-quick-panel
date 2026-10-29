'use strict';

const $ = (selector, root = document) => root.querySelector(selector);

const ICONS = {
  history:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1"/><path d="M3.6 4.4V9H8"/><path d="M12 7.9V12l2.9 1.8"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.2 4H4.4A2.4 2.4 0 0 0 2 6.4v11.2A2.4 2.4 0 0 0 4.4 20h15.2a2.4 2.4 0 0 0 2.4-2.4V8.4A2.4 2.4 0 0 0 19.6 6h-7.2L10.2 4Z"/></svg>',
  chevron:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 6 6 6-6 6"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>',
  manager:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4H20v5.5"/><path d="M20 4 12.8 11.2"/><path d="M19.6 14v5a1.6 1.6 0 0 1-1.6 1.6H5A1.6 1.6 0 0 1 3.4 19V6A1.6 1.6 0 0 1 5 4.4h5"/></svg>',
  computer:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="12" rx="1.8"/><path d="M9 20h6"/><path d="M12 16.5V20"/></svg>',
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10.9 5.4h2.2"/></svg>',
  tablet:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M11 18.2h2"/></svg>',
};

let searchTimer = 0;

document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  $('#search-icon').innerHTML = ICONS.search;
  $('#history-open-page .row-icon').innerHTML = ICONS.history;
  $('#open-bookmark-manager').innerHTML = ICONS.manager;
  if (!/Mac/i.test(navigator.platform || '')) {
    $('#history-shortcut').textContent = 'Ctrl+Y';
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.close();
  });

  const mode = await resolveMode();
  if (mode === 'history') {
    $('#history-view').hidden = false;
    await renderHistory();
  } else {
    $('#bookmarks-view').hidden = false;
    await renderBookmarks();
  }
}

async function resolveMode() {
  const param = new URLSearchParams(location.search).get('mode');
  if (param === 'history' || param === 'bookmarks') return param;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-mode' });
    return response && response.mode === 'history' ? 'history' : 'bookmarks';
  } catch {
    return 'bookmarks';
  }
}

/* ---------- 历史面板 ---------- */

async function renderHistory() {
  $('#history-open-page').addEventListener('click', () => openInTab('chrome://history/'));

  const tabs = await safeCall(() => chrome.tabs.query({}), []);
  const selfPrefix = chrome.runtime.getURL('');
  const seen = new Set();
  const items = (tabs || [])
    .filter(
      (tab) =>
        tab.url && !tab.url.startsWith(selfPrefix) && !tab.url.startsWith('chrome://newtab')
    )
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
    .filter((tab) => {
      const key = tab.url.split('#')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  const recentList = $('#recent-tabs');
  recentList.replaceChildren();
  if (!items.length) {
    recentList.append(emptyRow('没有最近打开的标签页'));
  } else {
    for (const tab of items) recentList.append(tabRow(tab));
  }

  const devices = await safeCall(() => chrome.sessions.getDevices({ maxResults: 25 }), []);
  const deviceList = $('#device-list');
  deviceList.replaceChildren();
  const usable = (devices || []).filter((device) => device && device.deviceName);
  if (!usable.length) {
    deviceList.append(emptyRow('未开启同步，暂时看不到其他设备'));
  } else {
    for (const device of usable.slice(0, 8)) deviceList.append(deviceRow(device));
  }
}

function tabRow(tab) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'row';
  row.title = tab.url;
  row.append(favicon(tab.url, tab.title || tab.url));

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = tab.title || prettyUrl(tab.url);
  row.append(label);

  row.addEventListener('click', async () => {
    try {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      window.close();
    } catch {
      openInTab(tab.url);
    }
  });
  return row;
}

function deviceRow(device) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'row';
  row.title = '在历史记录页面查看该设备的标签页';

  const icon = document.createElement('span');
  icon.className = 'row-icon';
  icon.innerHTML = deviceIcon(device.deviceName);
  row.append(icon);

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = device.deviceName;
  row.append(label);

  const chevron = document.createElement('span');
  chevron.className = 'row-chevron';
  chevron.innerHTML = ICONS.chevron;
  row.append(chevron);

  row.addEventListener('click', () => openInTab('chrome://history/'));
  return row;
}

function deviceIcon(name) {
  if (/ipad|tablet|平板/i.test(name)) return ICONS.tablet;
  if (/iphone|ipod|pixel|phone|手机|android|galaxy|redmi|honor|huawei|mi\s|k\d0/i.test(name)) {
    return ICONS.phone;
  }
  return ICONS.computer;
}

/* ---------- 书签面板 ---------- */

async function renderBookmarks() {
  $('#open-bookmark-manager').addEventListener('click', () => openInTab('chrome://bookmarks/'));
  const input = $('#bookmark-search');
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 120);
  });
  await renderBookmarkTree();
}

async function renderBookmarkTree() {
  const body = $('#bookmark-body');
  const [tree, recent] = await Promise.all([
    safeCall(() => chrome.bookmarks.getTree(), []),
    safeCall(() => chrome.bookmarks.getRecent(8), []),
  ]);

  body.replaceChildren();
  const roots = (tree && tree[0] && tree[0].children) || [];
  const populated = roots.filter((root) => (root.children || []).length);

  if (!populated.length && !(recent || []).length) {
    body.append(emptyRow('还没有书签'));
    return;
  }

  if ((recent || []).length) {
    body.append(flatGroup('最近添加', recent, { open: true }));
  }
  for (const root of populated) {
    body.append(folderGroup(root, { open: false }));
  }
}

function folderGroup(node, { open = false } = {}) {
  const children = node.children || [];
  const { details, bodyEl } = groupShell(node.title || '书签', countUrls(children), open);

  for (const child of children) {
    if (child.url) {
      bodyEl.append(bookmarkRow(child));
    } else if ((child.children || []).length) {
      const nested = folderGroup(child, { open: false });
      nested.classList.add('nested');
      bodyEl.append(nested);
    }
  }
  return details;
}

function flatGroup(title, nodes, { open = true } = {}) {
  const items = nodes.filter((node) => node.url);
  const { details, bodyEl } = groupShell(title, items.length, open);
  for (const item of items) bodyEl.append(bookmarkRow(item));
  return details;
}

function groupShell(title, count, open) {
  const details = document.createElement('details');
  details.className = 'group';
  details.open = open;

  const summary = document.createElement('summary');
  summary.className = 'row group-head';

  const icon = document.createElement('span');
  icon.className = 'row-icon';
  icon.innerHTML = ICONS.folder;
  summary.append(icon);

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = title;
  summary.append(label);

  const countEl = document.createElement('span');
  countEl.className = 'row-count';
  countEl.textContent = String(count);
  summary.append(countEl);

  const chevron = document.createElement('span');
  chevron.className = 'row-chevron';
  chevron.innerHTML = ICONS.chevron;
  summary.append(chevron);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'group-body';

  details.append(summary, bodyEl);
  return { details, bodyEl };
}

function bookmarkRow(node) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'row bookmark-row';
  row.title = `${node.title}\n${node.url}`;
  row.append(favicon(node.url, node.title || node.url));

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = node.title || prettyUrl(node.url);
  row.append(label);

  row.addEventListener('click', () => openInTab(node.url));
  return row;
}

async function runSearch() {
  const query = $('#bookmark-search').value.trim();
  const body = $('#bookmark-body');

  if (!query) {
    await renderBookmarkTree();
    return;
  }

  const results = await safeCall(() => chrome.bookmarks.search(query), []);
  const hits = (results || []).filter((node) => node.url);

  body.replaceChildren();
  if (!hits.length) {
    body.append(emptyRow(`没有找到包含“${query}”的书签`));
    return;
  }
  for (const hit of hits.slice(0, 80)) body.append(bookmarkRow(hit));
}

/* ---------- 公共 ---------- */

function favicon(url, fallbackText) {
  const img = document.createElement('img');
  img.className = 'favicon';
  img.alt = '';
  img.src = chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
  img.addEventListener('error', () => img.replaceWith(letterAvatar(fallbackText || url)), {
    once: true,
  });
  return img;
}

function letterAvatar(text) {
  const span = document.createElement('span');
  span.className = 'avatar';
  const raw = String(text).replace(/^https?:\/\//, '').trim();
  span.textContent = raw[0] || '?';
  return span;
}

function emptyRow(text) {
  const div = document.createElement('div');
  div.className = 'empty';
  div.textContent = text;
  return div;
}

function prettyUrl(url) {
  return String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function countUrls(nodes) {
  let total = 0;
  for (const node of nodes) {
    if (node.url) total += 1;
    else total += countUrls(node.children || []);
  }
  return total;
}

async function openInTab(url) {
  try {
    await chrome.tabs.create({ url });
    window.close();
  } catch (error) {
    console.warn('[quick-panel] 打开失败', url, error);
    const host = $('#history-view').hidden ? $('#bookmark-body') : $('#recent-tabs');
    host.prepend(emptyRow(`无法直接打开 ${url}，请在地址栏手动输入`));
  }
}

async function safeCall(fn, fallback) {
  try {
    const value = await fn();
    return value === undefined ? fallback : value;
  } catch (error) {
    console.warn('[quick-panel]', error);
    return fallback;
  }
}
