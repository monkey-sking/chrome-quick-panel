# 隐私政策 / Privacy Policy

最后更新：2026-10-30

## 中文

「书签 / 历史 快捷面板」（以下简称"本扩展"）不收集、不上传、不共享任何用户数据。

- 本扩展读取的书签、同步设备列表与面板窗口地址，仅在本地内存中用于渲染弹出面板，关闭面板后即释放。
- 本扩展不包含任何统计、埋点、广告或远程代码，不向任何服务器发起网络请求。
- 本扩展不使用 Cookie，不读取网页内容，不注入脚本到任何网站。
- 所有数据始终留在用户本机，不会离开浏览器。
- 本扩展使用 `chrome.storage.local` 仅保存一个字段（上一次展示的是历史面板还是书签面板），用于实现点击图标交替切换；该数据只留在本机，可随时在本仓库提交 issue 咨询清除方式。

权限用途：

- `tabs`：读取窗口 / 标签页地址，用于判断面板窗口是否已打开并聚焦，避免重复开窗。
- `sessions`：读取已同步设备列表，用于「您的设备」。
- `bookmarks`：读取和搜索本地书签。
- `storage`：本机保存上一次展示的面板类型，用于点击图标时交替切换。
- `contextMenus`：在工具栏图标的右键菜单中提供入口。
- `favicon`：使用 Chrome 本地缓存的网站图标，不联网。

如有疑问，请在本仓库提交 issue。

## English

This extension does not collect, transmit, or share any user data.

It stores exactly one local key (`chrome.storage.local`) recording which panel was shown last, so toolbar clicks can alternate between the history and bookmarks panels. Nothing ever leaves the machine.

- Bookmarks, the synced device list, and panel window URLs are read into memory only to render the popup, and are released when it closes.
- There is no analytics, telemetry, advertising, or remote code, and the extension makes no network requests.
- No cookies are used, page content is never read, and no scripts are injected into websites.
- All data stays on the user's machine.

Permissions: `tabs` (read window/tab URLs to detect and focus an already-open panel window), `sessions` (render synced devices), `bookmarks` (read/search bookmarks), `storage` (remember the last shown panel locally for click-to-alternate), `contextMenus` (toolbar right-click menu), `favicon` (render site icons from Chrome's local cache).
