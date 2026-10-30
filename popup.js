'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const MODE_KEY = 'lastPanelMode';

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
let hoverTimer = 0;
const renderedModes = { history: false, bookmarks: false };

document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  $('#search-icon').innerHTML = ICONS.search;
  $('#history-open-page .row-icon').innerHTML = ICONS.history;
  $('#open-bookmark-manager').innerHTML = ICONS.manager;
  if (!/Mac/i.test(navigator.platform || '')) {
    $('#history-shortcut').textContent = 'Ctrl+Y';
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // 设备浮层开着时按 Esc 先收起浮层，再按一次才关掉整个弹窗。
    if (closeDevicePane()) return;
    window.close();
  });

  $('#mode-history').addEventListener('click', () => void showMode('history'));
  $('#mode-bookmarks').addEventListener('click', () => void showMode('bookmarks'));

  // 鼠标在浮层里时不要收起，移出去之后才收。
  const pane = $('#device-pane');
  pane.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
  pane.addEventListener('mouseleave', scheduleCloseDevicePane);

  const mode = await resolveMode();
  await showMode(mode, { remember: false });
}

async function resolveMode() {
  const param = new URLSearchParams(location.search).get('mode');
  if (param === 'history' || param === 'bookmarks') {
    await rememberMode(param);
    return param;
  }

  const stored = await safeCall(() => chrome.storage.local.get(MODE_KEY), {});
  const next = stored && stored[MODE_KEY] === 'history' ? 'bookmarks' : 'history';
  await rememberMode(next);
  return next;
}

async function showMode(mode, { remember = true } = {}) {
  const next = mode === 'history' ? 'history' : 'bookmarks';

  closeDevicePane();
  $('#history-view').hidden = next !== 'history';
  $('#bookmarks-view').hidden = next !== 'bookmarks';
  for (const button of document.querySelectorAll('.mode-btn')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === next));
  }

  if (remember) await rememberMode(next);
  if (renderedModes[next]) return;

  renderedModes[next] = true;
  if (next === 'history') await renderHistory();
  else await renderBookmarks();
}

async function rememberMode(mode) {
  await safeCall(() => chrome.storage.local.set({ [MODE_KEY]: mode }), undefined);
}

/* ---------- 历史面板 ---------- */

async function renderHistory() {
  $('#history-open-page').addEventListener('click', () => openInTab('chrome://history/'));

  const devices = await safeCall(() => chrome.sessions.getDevices({ maxResults: 25 }), []);
  const deviceList = $('#device-list');
  deviceList.replaceChildren();
  const sorted = (devices || [])
    .filter((device) => device && device.deviceName)
    .sort((a, b) => deviceLastModified(b) - deviceLastModified(a));
  // 没有同步标签页的设备对用户没有操作价值，和原生页面一样不占位置。
  const usable = sorted.filter((device) => deviceTabs(device.sessions || []).length);
  if (!usable.length) {
    deviceList.append(emptyRow('未开启同步，暂时看不到其他设备'));
  } else {
    for (const device of usable.slice(0, 12)) deviceList.append(deviceRow(device));
  }
}

// 设备是一层入口：点它就弹出该设备的独立面板，列出这台设备上的标签页，
// 不要再在列表里就地展开，面板高度会失控。
function deviceRow(device) {
  const sessions = device.sessions || [];
  const tabs = deviceTabs(sessions);

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'row device-row';
  row.title = `查看 ${device.deviceName} 上打开的标签页`;

  const icon = document.createElement('span');
  icon.className = 'row-icon';
  icon.innerHTML = deviceIcon(device.deviceName);
  row.append(icon);

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = device.deviceName;
  row.append(label);

  const lastModified = deviceLastModified(device);
  const time = relativeTime(lastModified);
  if (time) {
    const timeEl = document.createElement('span');
    timeEl.className = 'row-time';
    timeEl.textContent = time;
    row.append(timeEl);
  }

  const count = document.createElement('span');
  count.className = 'row-count';
  count.textContent = String(tabs.length);
  row.append(count);

  const chevron = document.createElement('span');
  chevron.className = 'row-chevron';
  chevron.innerHTML = ICONS.chevron;
  row.append(chevron);

  row.setAttribute(
    'aria-label',
    `${device.deviceName}，${time || '时间未知'}，${tabs.length} 个标签页`
  );
  // 和原生一样：鼠标移到设备上，旁边就滑出这台设备的标签页面板。
  row.addEventListener('mouseenter', () => showDevicePane(device, tabs, row));
  row.addEventListener('mouseleave', scheduleCloseDevicePane);
  row.addEventListener('focus', () => showDevicePane(device, tabs, row));
  row.addEventListener('click', () => showDevicePane(device, tabs, row));
  return row;
}

function showDevicePane(device, tabs, anchor) {
  clearTimeout(hoverTimer);

  $('#device-title').textContent = device.deviceName;
  $('#device-title').title = device.deviceName;
  $('#device-time').textContent = relativeTime(deviceLastModified(device));

  const list = $('#device-tabs');
  list.replaceChildren();
  if (!tabs.length) list.append(emptyRow('这台设备没有可打开的标签页'));
  else for (const tab of tabs) list.append(sessionRow(tab));

  const pane = $('#device-pane');
  pane.hidden = false;
  placeDevicePane(pane, anchor);
  // 重新挂一次动画类，让每次滑出都有动画。
  pane.classList.remove('enter');
  void pane.offsetWidth;
  pane.classList.add('enter');
}

// 面板贴着鼠标所在的那一行出现，并且尽量完整地留在弹窗可视范围内。
function placeDevicePane(pane, anchor) {
  const viewportH = window.innerHeight || 580;
  pane.style.maxHeight = `${Math.max(140, viewportH - 12)}px`;
  if (!anchor) return;

  const rect = anchor.getBoundingClientRect();
  const height = pane.offsetHeight;
  const desired = rect.top - 6;
  const limit = viewportH - height - 6;
  pane.style.top = `${Math.round(Math.min(Math.max(6, desired), Math.max(6, limit)))}px`;
}

function scheduleCloseDevicePane() {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => closeDevicePane(), 220);
}

// 返回 true 表示确实收起了一个设备浮层，Escape 的调用方据此决定要不要继续关整个弹窗。
function closeDevicePane() {
  clearTimeout(hoverTimer);
  const pane = $('#device-pane');
  if (!pane || pane.hidden) return false;
  pane.hidden = true;
  pane.classList.remove('enter');
  return true;
}

// 其他设备的会话既可能是单个标签页，也可能是一整个窗口（window.tabs）。
function deviceTabs(sessions) {
  const tabs = [];
  for (const session of sessions) {
    if (!session) continue;
    if (session.tab && session.tab.url) tabs.push(session.tab);
    for (const tab of (session.window && session.window.tabs) || []) {
      if (tab && tab.url) tabs.push(tab);
    }
  }
  return tabs;
}

function deviceLastModified(device) {
  return (device.sessions || []).reduce(
    (latest, session) => Math.max(latest, toMillis(session && session.lastModified)),
    0
  );
}

// sessions API 对同源同步设备返回秒级时间戳，本机会话可能已是毫秒，统一成毫秒。
function toMillis(value) {
  if (!value) return 0;
  return value > 1e12 ? value : value * 1000;
}

function sessionRow(tab) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'row';
  row.title = tab.url;
  row.append(favicon(tab.url, tab.title || tab.url));

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = tab.title || prettyUrl(tab.url);
  row.append(label);

  row.addEventListener('click', () => openInTab(tab.url));
  return row;
}

function deviceIcon(name) {
  if (/ipad|tablet|平板/i.test(name)) return ICONS.tablet;
  if (/iphone|ipod|pixel|phone|手机|android|galaxy|redmi|honor|huawei|mi\s|k\d0/i.test(name)) {
    return ICONS.phone;
  }
  return ICONS.computer;
}

function relativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 0) return '';
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
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

function groupShell(title, count, open, showCount = true) {
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

  if (showCount) {
    const countEl = document.createElement('span');
    countEl.className = 'row-count';
    countEl.textContent = String(count);
    summary.append(countEl);
  }

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
    const host = messageHost();
    host.prepend(emptyRow(`无法直接打开 ${url}，请在地址栏手动输入`));
  }
}

// 出错提示要插到用户当前真正看得到的那个列表里。
function messageHost() {
  if (!$('#history-view').hidden) {
    const pane = $('#device-pane');
    return pane && !pane.hidden ? $('#device-tabs') : $('#device-list');
  }
  return $('#bookmark-body');
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
