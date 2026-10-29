'use strict';

const POPUP_PAGE = 'popup.html';

const MENU_ITEMS = [
  { id: 'history-panel', title: '历史记录面板' },
  { id: 'bookmarks-panel', title: '书签面板' },
  { id: 'menu-separator', type: 'separator' },
  { id: 'open-history', title: '打开历史记录页面' },
  { id: 'open-bookmarks', title: '打开书签管理器' },
];

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
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create(
        { ...item, contexts: ['action'] },
        () => void chrome.runtime.lastError
      );
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  switch (info.menuItemId) {
    case 'history-panel':
      await openPanel('history');
      break;
    case 'bookmarks-panel':
      await openPanel('bookmarks');
      break;
    case 'open-history':
      await openUrl('chrome://history/');
      break;
    case 'open-bookmarks':
      await openUrl('chrome://bookmarks/');
      break;
  }
});

// action.openPopup() 在部分 Chrome 版本会静默失败，因此右键菜单直接打开
// 带 mode 参数的独立面板窗口，避免依赖会被回收的 Service Worker 内存状态。
async function openPanel(mode) {
  const url = chrome.runtime.getURL(`${POPUP_PAGE}?mode=${mode}`);
  try {
    await chrome.windows.create({
      url,
      type: 'popup',
      width: 430,
      height: 620,
      focused: true,
    });
  } catch (error) {
    console.warn('[quick-panel] 无法打开面板', error);
  }
}

async function openUrl(url) {
  try {
    await chrome.tabs.create({ url });
  } catch (error) {
    console.warn('[quick-panel] 无法打开', url, error);
  }
}
