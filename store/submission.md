# 上架 Chrome 应用商店步骤

## 0. 前置条件

- 一个 Chrome 应用商店开发者账号（首次注册需一次性支付 5 美元）
- 已登录的 Google 账号
- 本仓库打包出的 ZIP：`bash scripts/package.sh` → `dist/chrome-quick-panel-1.0.0.zip`

## 1. 注册开发者账号（已有可跳过）

1. 打开 https://chrome.google.com/webstore/devconsole
2. 同意开发者协议，支付一次性注册费
3. 填写开发者名称与联系邮箱

## 2. 创建新项目并上传

1. 开发者控制台 → **新增项目**
2. 上传 `dist/chrome-quick-panel-1.0.0.zip`
3. 等待包校验通过

## 3. 填写商店信息

按 `store/listing-zh.md` 填写：

- 名称、简短说明、详细说明
- 类别：生产力工具
- 语言：中文（简体）
- 商店图标：`icons/icon128.png`
- 截图：`store/screenshots/*.png`（1280×800）
- 隐私政策 URL：把 `PRIVACY.md` 发布成公开网页后填入（例如 GitHub Pages 或仓库 raw 链接）

## 4. 隐私与权限问卷

- 单一用途：在工具栏提供书签与最近历史的一键查看入口
- 数据收集：**不收集**
- 远程代码：**不使用**
- 权限理由：按 `store/listing-zh.md` 中「权限用途说明」逐项填写

## 5. 提交审核

1. 检查所有必填项为绿色
2. 点 **提交审核**
3. 审核通常 1–3 个工作日；通过后自动上架

## 6. 后续更新

1. 修改 `manifest.json` 中的 `version`
2. `bash scripts/package.sh`
3. 控制台 → 上传新包 → 提交审核

## 备注

- 上传包中不应包含 `key` 字段，`scripts/package.sh` 已自动移除
- 商店会分配官方扩展 ID，与本地未打包安装的 ID 不同
