# S0 本地服务端技术骨架

本目录是与 `apps/preview` 分开的 Next.js、Payload 和 PostgreSQL 适配器技术骨架。当前首页只显示技术状态；没有后台页面、REST 路由、账户初始化、作品数据读写或共享前台，因此**不是可以使用的内容后台，也不是部署候选**。不要连接生产数据库或用于公开运行。

## 已固定的版本

- Node.js：`>=24.22.1 <25`；npm 11。
- Next.js：16.4.3；Payload 和 PostgreSQL 适配器：3.92.0；React：19.2.1。
- `package-lock.json` 记录实际解析依赖。Payload 3.92.0 的 Next peer 要求 `>=16.3.3 <17`（或指定的 15.x 范围），Node 要求 `^22.23.4 || >=24.22.1`。

本机 `C:\Program Files\nodejs\node.exe` 是 24.18.0，不能用于这一组合。本次类型检查和构建使用 Codex 自带的 Node 24.22.1。交给其他机器时应单独安装符合版本的 Node，不应依赖当前电脑的 Codex 内部路径。

## 安装与检查

在已安装 Node 24.22.1 或兼容的 24.x 版本的终端中：

```powershell
cd 'E:\AI-Projects\My products\zhiqing-self\apps\web'
node --version
npm ci
$env:NEXT_TELEMETRY_DISABLED = '1'
npm run typecheck
npm run build
npm run dev
```

开发服务器默认只绑定 `127.0.0.1`，端口由 Next.js 显示；如果 3000 已被占用，Next.js 会尝试其他端口。本次本地构建不需要数据库，因为首页不初始化 Payload。切勿据此推断数据库或后台已工作。当前环境 npm 11 安装时提示部分依赖安装脚本等待审查；本机测试 `sharp` 可正常加载，其他安装环境仍需检查自己的安装输出。

如需仅在**本机当前环境**重现检查，可先把 Node 24.22.1 所在目录加入当前 PowerShell 的 PATH，并用该 Node 显式调用系统 npm CLI；直接运行系统 `npm.ps1` 可能仍绑定旧 Node：

```powershell
$nodeDir = 'C:\Users\张锦宏\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$env:Path = "$nodeDir;$env:Path"
$env:NEXT_TELEMETRY_DISABLED = '1'
& "$nodeDir\node.exe" 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run typecheck
& "$nodeDir\node.exe" 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run build
```

## 配置与数据边界

`.env.example` 仅列出 `DATABASE_URL` 和 `PAYLOAD_SECRET` 占位符，未包含真实凭据；未来连接独立测试库时在未跟踪的 `.env.local` 中填写。Payload 配置定义了站主和作品集合，集合的读写访问当前均禁用；当前骨架未接入创建首个用户的界面或公开 API。以后接入管理或 API 路由时必须重新验证初始化、认证和访问控制，不能仅凭此配置推断安全。

**尚未创建数据库、站主、媒体目录或外部服务，也没有进行迁移。** 本机没有检测到 PostgreSQL 命令、服务或 5432 监听，亦未发现 Docker。未来可使用工作区隔离的 PostgreSQL 二进制或受控容器；需要分别验证版本、初始化方式、数据目录、凭据、启动与恢复，不能把安装依赖当成数据库验证。

## 本次检查与后续验证

- Node 24.22.1 下 `npm run typecheck` 和 Next.js 本地生产构建通过，构建只包含提示页面与 404。
- 使用临时测试占位环境变量加载 Payload 配置成功；此操作没有初始化 Payload 或连接数据库。
- 本机 `sharp` 0.34.5 模块加载成功。实际图片处理与上传未测。
- 后续需建立真实 PostgreSQL 隔离库、受控唯一站主、管理与 API 路由，验证匿名草稿和媒体隔离、重启持久化、发布与撤回、并发、恢复与导出。Payload Local API 默认可能绕过访问控制，必须明确传入用户并禁用覆盖，逐路径实测。
- 还需共享 UI/内容契约、正式路由和服务端元数据。此骨架没有测试 Sites，未部署，也不能作为首版验收依据。

官方依据：[Payload 安装要求](https://payloadcms.com/docs/getting-started/installation)、[PostgreSQL 适配器](https://payloadcms.com/docs/database/postgres)、[Local API 访问控制](https://payloadcms.com/docs/local-api/access-control)。
# T1 工作区说明（2026-10-27）

当前从仓库根 `npm ci`、`npm run build:web`、`npm run start:web`。Next 已接同一共享作品归档/详情视图，首页跳转 `/works`；后台仍未实现。`public` 由根 prepare-assets 脚本同步允许的资源，不手工改副本。下文保留旧骨架说明，安装及运行以根 README 为准。

