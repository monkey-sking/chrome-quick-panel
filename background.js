'use strict';

const POPUP_PAGE = 'popup.html';

const MENU_ITEMS = [
  { id: 'history-panel', title: '历史记录面板' },
  { id: 'bookmarks-panel', title: '书签面板' },
  { id: 'menu-separator', type: 'separator' },
  { id: 'open-history', title: '打开历史记录页面' },
  { id: 'open-bookmarks', title: '打开书签管理器' },
];

// 弹窗打开时向后台询问该显示哪个面板，取走后立刻复位为书签，
// 保证左键永远是书签，只有右键菜单里的「历史记录面板」才是历史。
let pendingMode = 'bookmarks';

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'get-mode') {
    sendResponse({ mode: pendingMode });
    pendingMode = 'bookmarks';
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  switch (info.menuItemId) {
    case 'history-panel':
      pendingMode = 'history';
      await openPanel();
      break;
    case 'bookmarks-panel':
      pendingMode = 'bookmarks';
      await openPanel();
      break;
    case 'open-history':
      await openUrl('chrome://history/');
      break;
    case 'open-bookmarks':
      await openUrl('chrome://bookmarks/');
      break;
  }
});

async function openPanel() {
  if (chrome.action.openPopup) {
    try {
      await chrome.action.openPopup();
      return;
    } catch (error) {
      console.warn('[quick-panel] openPopup 失败，改用独立弹窗', error);
    }
  }
  const url = `${POPUP_PAGE}?mode=${pendingMode}`;
  pendingMode = 'bookmarks';
  await chrome.windows.create({ url, type: 'popup', width: 430, height: 620 });
}

async function openUrl(url) {
  try {
    await chrome.tabs.create({ url });
  } catch (error) {
    console.warn('[quick-panel] 无法打开', url, error);
  }
}
