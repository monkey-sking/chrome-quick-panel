<img src="icons/icon128.png" width="72" height="72" alt="图标">

# 书签 / 历史 快捷面板

![Manifest V3](https://img.shields.io/badge/Manifest%20V3-Chrome%20extension-4285F4?logo=googlechrome&logoColor=white)
![Chrome 120+](https://img.shields.io/badge/Chrome-120%2B-2b7de9?logo=googlechrome&logoColor=white)
![License](https://img.shields.io/github/license/monkey-sking/chrome-quick-panel)
![No host permissions](https://img.shields.io/badge/Permissions-No_host_permissions-brightgreen)
![Local only](https://img.shields.io/badge/Data-100%25_local-yellowgreen)
![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-coming_soon-lightgrey)

Chrome 工具栏上的一个小按钮：**每次点击在历史面板和书签面板之间交替打开**；也可以点面板顶部的「历史 / 书签」直接切换。快捷键 **⇧⌘Y** 仍可直接打开历史面板。

面板复刻了 Chrome 自带「历史记录」下拉的结构：打开历史记录页面 / 您的设备；鼠标移到某台设备上，旁边会像原生二级菜单一样滑出这台设备打开的标签页面板。

![历史面板](assets/preview-history.png)

![书签面板](assets/preview-bookmarks.png)

工具栏图标是「时钟（历史）+ 书签带」的组合，一眼能看出这个按钮管的是历史加书签。

## 为什么是复刻面板

Chrome 没有向扩展开放「打开自带历史记录下拉面板」的 API —— 那个面板属于浏览器界面，不是网页，扩展无法调用。所以这里用官方 API 复刻了同样的信息结构：

| 面板内容 | 数据来源 |
| --- | --- |
| 您的设备 | `chrome.sessions.getDevices()`（需登录 Chrome 并开启同步） |
| 设备标签页浮层 | 悬停在设备行上滑出，内容来自该设备的同步会话 |
| 打开历史记录页面 | `chrome://history/` |
| 书签 / 搜索 / 最近添加 | `chrome.bookmarks` |

## 功能

- **点击图标 → 交替打开历史 / 书签面板**
  - 第一次打开历史，第二次打开书签，之后循环
  - 面板顶部可手动切换，切换后会影响下一次点击的交替顺序
- **书签面板**
  - 顶部实时搜索书签
  - 「最近添加」默认展开，书签栏 / 其他书签可折叠，支持嵌套文件夹
  - 右上角图标直达书签管理器
  - 点击书签在新标签页打开
- **右键 → 扩展菜单（保留）**
  - 历史记录面板（独立小窗口，菜单第一项）
  - 书签面板
  - 打开历史记录页面
  - 打开书签管理器
- **快捷键（可用快捷键一步弹出，不需要先右键）**
  - `⇧⌘Y`（Windows / Linux：`Alt+Shift+H`）→ 历史记录面板
  - `⇧⌘U`（Windows / Linux：`Alt+Shift+B`）→ 书签面板
  - 可在 `chrome://extensions/shortcuts` 里改成自己喜欢的组合
- 浅色 / 深色主题自动跟随系统
- `Esc` 关闭面板

> 说明：点击图标交替切换不依赖左右键。右键点击工具栏图标时，Chrome 仍会先弹出自己的扩展菜单；这里保留了菜单项作为补充入口。

## 安装（加载已解压）

1. 打开 `chrome://extensions`
2. 右上角打开 **开发者模式**
3. 点 **加载已解压的扩展程序**，选择本仓库目录
4. 点工具栏的扩展拼图图标，把「书签 / 历史 快捷面板」**固定**到工具栏

## 开发

```bash
git clone https://github.com/monkey-sking/chrome-quick-panel.git
cd chrome-quick-panel
```

修改后在 `chrome://extensions` 里点扩展卡片上的刷新按钮即可生效。

重新生成图标（需要 Pillow）：

```bash
python3 tools/make_icons.py
```

打包上架用的 ZIP（自动去掉 `key` 字段，`dist/` 已加入 .gitignore）：

```bash
bash scripts/package.sh
```

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `tabs` | 读取窗口 / 标签页地址，用于判断面板窗口是否已经打开并直接聚焦，避免重复开窗 |
| `sessions` | 读取同步设备列表，用于「您的设备」 |
| `bookmarks` | 读取和搜索书签 |
| `storage` | 保存上一次显示的面板，用于点击图标时交替切换 |
| `contextMenus` | 工具栏图标的右键菜单 |
| `favicon` | 用 Chrome 本地缓存渲染网站图标，不联网 |

没有申请任何 host 权限，不注入页面，不读取网页内容，不发送任何数据。详见 [PRIVACY.md](PRIVACY.md)。

## 已知限制

- 「您的设备」依赖 Chrome 账号同步，未登录时显示空状态。
- 每台设备的标签页只在鼠标悬停（或键盘聚焦）设备行时滑出的浮层里显示，和 Chrome 原生二级菜单一致；没有可打开标签页的设备不显示。
- 右键菜单里的「历史记录面板」和「书签面板」会以独立小窗口打开，避免 Chrome 对扩展弹窗的某些限制。

## English

A tiny Chrome toolbar button that alternates between a bookmarks panel and a history panel on each click. The history panel mirrors Chrome's built-in history dropdown (open history page / your devices, with each device's tabs sliding out in a side flyout on hover, just like the native submenu). Chrome does not expose an API for the native history dropdown, so this is a faithful re-implementation using `chrome.sessions` and `chrome.bookmarks`. No host permissions, no page injection, no data collection.

## License

[MIT](LICENSE)
