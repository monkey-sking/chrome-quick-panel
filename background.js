'use strict';

const POPUP_PAGE = 'popup.html';
const PANEL_WIDTH = 430;
const PANEL_HEIGHT = 620;

const MENU_ITEMS = [
  { id: 'history-panel', title: '历史记录面板' },
  { id: 'bookmarks-panel', title: '书签面板' },
  { id: 'menu-separator', type: 'separator' },
  { id: 'open-history', title: '打开历史记录页面' },
  { id: 'open-bookmarks', title: '打开书签管理器' },
];

// Service Worker 每次启动都重建菜单：onInstalled / onStartup 偶尔不会及时触发，
// 一旦漏掉，右键菜单里就只剩 Chrome 自带的条目，看起来像「右键没有历史面板」。
buildMenus();

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setPopup({ popup: POPUP_PAGE });
  buildMenus();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.action.setPopup({ popup: POPUP_PAGE });
  buildMenus();
});

function buildMenus() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create(
        { ...item, contexts: ['action'] },
        () => void chrome.runtime.lastError
      );
    }
  });
}

chrome.contextMenus.onClicked.addListener((info) => {
  switch (info.menuItemId) {
    case 'history-panel':
      void openPanel('history');
      break;
    case 'bookmarks-panel':
      void openPanel('bookmarks');
      break;
    case 'open-history':
      void openTab('chrome://history/');
      break;
    case 'open-bookmarks':
      void openTab('chrome://bookmarks/');
      break;
  }
});

// 目前没有快捷键的话，用 commands 直接一步开面板。
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-history-panel') void openPanel('history');
    if (command === 'open-bookmarks-panel') void openPanel('bookmarks');
  });
}

// Chrome 不允许扩展拦截工具栏图标的右键，右键一定先弹 Chrome 自己的菜单，
// 所以这里负责菜单项被点中之后弹出面板，并且不依赖会被回收的 Service Worker 内存状态。
async function openPanel(mode) {
  const url = chrome.runtime.getURL(`${POPUP_PAGE}?mode=${mode}`);

  try {
    const existing = await findPanelWindow(url);
    if (existing && existing.id != null) {
      await chrome.windows.update(existing.id, { focused: true, drawAttention: true });
      return;
    }
  } catch (error) {
    console.warn('[quick-panel] 查找已打开的面板失败', error);
  }

  const options = {
    url,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    focused: true,
  };

  // 某些窗口状态下 type: 'popup' 会创建失败，退回普通窗口再退回标签页。
  for (const type of ['popup', 'normal']) {
    try {
      await chrome.windows.create({ ...options, type });
      return;
    } catch (error) {
      console.warn(`[quick-panel] 以 ${type} 窗口打开面板失败`, error);
    }
  }

  await openTab(url);
}

async function findPanelWindow(url) {
  const windows = await chrome.windows.getAll({ populate: true });
  return windows.find((win) => (win.tabs || []).some((tab) => tab.url === url));
}

async function openTab(url) {
  try {
    await chrome.tabs.create({ url });
  } catch (error) {
    console.warn('[quick-panel] 无法打开', url, error);
  }
}
