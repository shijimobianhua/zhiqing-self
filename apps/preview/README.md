# 世纪末之青 · 一阶段本地预览

此目录是 React、TypeScript 与 Vite 开发的本地前台预览，用于检查页面、交互和视觉。与 `design/uiux-v1` 原型分开；原型及其资源未被修改。

```powershell
cd 'E:\AI-Projects\My products\zhiqing-self\apps\preview'
npm ci
npm run dev
```

浏览器打开终端显示的本地地址。`npm run build` 先运行 TypeScript 检查再执行生产构建；`npm run preview` 可在本地查看构建产物。安装依赖需要可用的 npm 源。本次环境的沙箱限制 Windows 子进程，沙箱内 Vite 构建会报 `spawn EPERM`；在允许子进程的环境中构建已通过。

## 范围与边界

- 提供首页、作品归档与详情、记录列表与详情、关于及客户端 404 页面；作品卡可以悬停、键盘操作及进入详情，详情目录可分享，返回归档恢复位置和焦点。手机菜单使用原生对话框并支持 Esc 关闭。
- 作品、记录、日期、近况及介绍文案均为显著标示的示例。真实作品、经历与联系方式待补充。真实后台、持久化、认证、媒体保护、草稿与发布能力不在此前台预览中。
- 当前为客户端渲染的本地预览，包含 `noindex`。Vite 的路径回退不代表生产环境返回正确的 HTTP 404 或服务端正文；此预览不能证明访问控制、后台安全或生产部署能力。
- 本地素材复用 `assets/zhiqing-site-illustrations/01-collecting-ideas.png` 和 `design/uiux-v1/assets/character-avatar.png`。两者为现有设计资产，正式公开前应确认素材使用权限。
- Fusion Pixel 字体及其许可证在 `public/fonts`，Noto Sans SC 可变字体及其许可也在该目录。Noto 原始 TTF 约17.8MB并保留；网页现使用 unicode-range WOFF2 分包，首包约149KB，全部30,890个原始字符映射保留。字体准备脚本及校验见 docs/verification-v3。

当前修订与差异表见工作区 `docs/像素风格统一与文档差异核对-2026-10-27.md`，本轮证据见 `docs/verification-v3`。本轮未部署。

像素统一修订新增两张角色动作场景图（02-connecting-ideas.png、03-testing-feedback.png），用于示例作品卡和详情；全站共用阶梯轮廓、字号、图标和动效时长。手机菜单和大图支持焦点循环、Esc及焦点返回。生成与验收记录位于工作区 assets/zhiqing-site-illustrations。

# T1 工作区说明（2026-10-27）

目前统一从仓库根 `npm ci` 和 `npm run dev:preview`；唯一根锁文件。共享作品/像素交互在 `packages/ui`，设计样式在 `packages/design`。下文为历史独立预览说明，安装入口以根 README 为准。Sites 私人候选与版本见 `docs/发布记录.md`。

