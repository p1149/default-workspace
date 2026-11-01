# DSH 插件开发指南

> 环境：DeepSeek Harness，profile `desktop`
> 工作区：`C:\Users\76927\Documents\deepseek-harness\default-workspace`
> profile 目录：`C:\Users\76927\.dsh\profiles\desktop`

本指南说明如何从零创建一个 DSH 插件（bundle）、安装到当前 profile，并验证它真的生效。

---

## 一、心智模型

一个插件 = **一个普通 npm 包目录** + **一份 Cordis Loader YAML patch**。

```
my-plugin/
├── package.json          # 声明 dsh.bundle.patch 指向 patch 文件
├── cordis.patch.yml      # 向运行时配置 insert 一行插件条目
├── index.js              # Host 侧入口
├── client.js             # Web UI 侧入口（仅 UI 插件需要）
├── locale/
│   ├── en.json
│   └── zh.json
└── icon.svg
```

关键机制：

- patch 用 `insert` 往运行时配置里加一行 `{ id, name, config }`，其中 `name` 就是包名。
- 安装由 `plugin_manager` 的 `install_bundle` 完成：它负责把包装进 profile、修改 profile 的 `package.json` 和 `cordis.patch.yml`，并触发生效。
- 因此**你只写工作区里的包**，不要碰 profile 的配置文件。

> 禁止事项：手写 profile 的 `package.json` / `cordis.patch.yml`；在 `$DSH_HOME` 下直接建包；在 profile 目录里跑 pnpm。这些都应由 `install_bundle` 完成。

---

## 二、选插件形态

| 形态 | 适用场景 | 需要写什么 |
|---|---|---|
| 纯 Host 能力 | 给 agent 加工具、监听事件、提供后台服务 | `index.js` 导出 `apply(ctx, config)`；可选 `export const inject` / `export const Config` |
| Web UI 组件 | 页面、面板、装饰、小组件，渲染在当前 Harness Web UI 里 | `index.js`（可以是空的 `apply`）+ `package.json` 的 `dsh.client` 段 + `client.js` |
| MCP 接入 | 连接一个 MCP server | 几乎纯配置，无需运行时代码 |
| 启用已发布插件 | 某个随 dsh 发布但默认关闭的插件 | patch 里 override 那一行为 `disabled: false`，并 insert 它依赖的 Host 行 |

选择建议：

- 需求里有"显示、渲染、界面、图标、面板"→ Web UI 组件。
- 需求里有"让模型能调用、自动执行、监听生命周期"→ Host 能力。
- 只连接外部工具服务 → MCP。

---

## 三、标准流程

### 第 1 步：建目录、复制模板

在工作区下创建目录，例如 `my-plugin`，把模板文件复制进去。模板位于：

```
C:\Users\76927\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-agent-preset\skills\cordis-plugin-development\templates\decoration\
```

> 该路径在 `app.asar` 内部，**shell、glob、grep 都打不开**，只能用文件读取工具读取，再用文件写入工具写入工作区。

### 第 2 步：查 API，不要猜

查询入口：先 `cordis_inspect_list`，再按需 `cordis_inspect_query`。

| 想看什么 | platform | provider | method | 备注 |
|---|---|---|---|---|
| 可用的 UI slot 及其 props | `client` | `Slots` | `listSubTree` | 不带 `root` 看全树；带 `root: "conversation.composer.dock"` 看该 slot 的 catalog、occupants、注册选项 |
| Host 服务 | `host` | `Service` | `listService` | 先看目录，再按 service key 查精确契约 |
| Host 事件 | `host` | `Event` | `listEvents` | 同上 |
| 当前可用的工具 | `host` | `Tool` | `listTools` | 返回调用方 Agent 可见的 schema |
| 现有插件的配置 | `host` | `Config` | `listConfigs` | 先用 `name` 过滤目录，再用 `entry` 查 JSON Schema |
| 主题 token | `client` | `Theme` | `listTokens` | 决定容器/控件用什么主题色 |
| 浏览器端可用全局符号 | `client` | `Builtin` | `listBuiltins` | 避免重复引入 |

### 第 3 步：写文件

见第四节。

### 第 4 步：自检

```powershell
node --check index.js client.js
```

再读回 `package.json` 确认：JSON 合法、`exports` 与 `files` 覆盖所有文件、包名唯一。

### 第 5 步：安装

```
plugin_manager
  action: "install_bundle"
  target: "<插件目录的绝对路径>"
```

只认返回值判断是否生效：

| 返回值 | 含义 |
|---|---|
| `application: applied` | 已生效 |
| `restart-required` | 已写入但未生效，需要重启 Harness |
| `failed` | 安装/激活失败，需排查 `warnings` |
| `overridden` | 被更高优先级的层覆盖，当前配置不生效 |

注意：

- `warnings` 必须逐条读。
- 替换**已安装**的包时，需要重启才能加载新的 JS 模块。
- 如果安装动作因权限或审批被拒，不要绕过；换到有权限的环境执行。

### 第 6 步：验证

- 用 `cordis_inspect_query`（`client` / `Slots` / `listSubTree`，`root` 给目标 slot）确认 occupants 里出现你的 id。
- 或 `host` / `Config` / `listConfigs`，`name` 给包名，确认新条目存在。
- 刷新页面看实际渲染效果。
- 测试期间改动过的东西要恢复原状。
- 没有浏览器控制手段时，只能报告"安装与注册已验证，渲染未验证"，不能把安装成功等同于视觉成功。

---

## 四、文件详解

### 4.1 `package.json`

```json
{
  "name": "@local/my-plugin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"]
    }
  }
}
```

要点：

- `name` 必须唯一，建议 `@local/` 前缀。
- `type` 用 `module`，入口用 ESM。
- `dsh.bundle.patch` 指向 patch 文件，这是"这是一个 bundle"的标志。
- 纯 Host 插件不需要 `./client` 导出和 `dsh.client` 段。
- `files` 必须列全所有运行时文件、patch、locale、图标；每新增一个模块或资源都要同步更新。
- 本地目录安装是链接方式，`files` 不会过滤实际文件——仍要保证内容整洁。
- 打包发布时，要另外核对实际的打包文件清单。

### 4.2 `cordis.patch.yml`

```yaml
- insert:
    - id: my-plugin
      name: '@local/my-plugin'
      config: {}
```

要点：

- `id` 与 `name` 都要唯一。
- 有 `Config` schema 的插件，`config` 会在激活时校验；写之前先用 `Config.listConfigs` 查 schema，并顺着 `$defs` 看引用类型。
- 覆盖已有行时，匹配到的 override 会**整体替换** `config`，不是合并。
- 需要表达式时可以用 Loader 的 `!!js`。

### 4.3 `index.js`（Host 入口）

两种导出形式，**不要混用**：

```js
// 形式一：apply 函数
export function apply(ctx, config) {
  ctx.effect(() => {
    const dispose = /* 注册资源 */;
    return () => dispose();   // 必须返回清理函数
  });
}
export const inject = ['tools'];
export const Config = { /* JSON Schema */ };
```

```js
// 形式二：service 类作为默认导出
export default class MyService { /* ... */ }
```

纯 UI 插件的 Host 半边可以只是：

```js
export function apply() {}
```

要点：

- 所有资源（样式、定时器、监听器、注册项）都在 `apply` 里用 `ctx.effect` 或 `ctx.on` 注册，并返回清理。
- 不要在模块顶层做副作用。

### 4.4 `client.js`（Web UI 入口）

```js
window.__ModuleLoader__.load({
  id: '@local/my-plugin',            // 必须等于包名
  factory(require) {
    const React = require('react');  // 来自浏览器模块表，不要装第二份
    const h = React.createElement;

    function Widget() {
      return h('div', { style: { padding: 4 } }, 'Hello');
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'my-plugin', order: 5 },
            Widget,
          ),
        );
      },
    };
  },
});
```

要点：

- factory 的 `id` 必须等于包名。
- 不需要安装 React、不需要 CDN、不需要 UMD 查找；`require('react')` 走浏览器模块表。
- 非基线运行时依赖要声明在 `dsh.client.external`。
- 组件里写的局部样式可以用 React 元素渲染，卸载时随之移除。
- 容器和控件继承宿主主题（token 用 `Theme.listTokens` 查）；插画类内容可以用自己的配色。
- 组件内部要有清理意识：factory 里不要有副作用。
- 不要替换应用根节点，不要往 `document.body` 追加第二个应用。
- 不要读别的插件的 DOM、样式表或组件源码来估算位置；选一个已经分配好空间的 slot。

### 4.5 展示元数据与图标

Plugin 管理界面和设置页会读取 locale 的 `meta.title` / `meta.description` 以及 `./icon`，无需激活插件。检查清单：

- [ ] `locale/en.json` 有 `meta.title`、`meta.description`
- [ ] `locale/zh.json` 有对应中文（用户语言）
- [ ] 图标是原创或授权可再分发，需要署名就保留署名
- [ ] 图标是合法图片（SVG / PNG / JPEG / WebP），≤ 256 KiB，路径在包内
- [ ] `exports` 导出 `./locale/*.json` 和 `./icon`
- [ ] `files` 包含上述全部文件
- [ ] 安装后核对 bundle 详情和插件行里的标题、描述、图标
- [ ] 没有元数据诊断信息、没有意外回退到默认图

示例：

```json
{
  "meta": {
    "title": "我的装饰",
    "description": "在输入框下方绘制一个徽章。"
  }
}
```

说明：

- 包根插件也可以在 `package.json` 顶层写 `icon` 字段（相对 manifest 目录），优先级高于 `./icon`。
- 子路径插件（如 `my-plugins/search`）不是独立包，不读 `package.json`，改为导出 `./search/locale/*.json` 和 `./search/icon`。
- 缺少字段时回退到 `package.json` 的 `name` / `description`；缺少图片时用面板默认图。
- 显示资源缺失不是"可以忽略"的例外：Host-only 或纯配置 bundle 在插件列表里同样有可见条目。

---

## 五、最小可复制模板

把下面几个文件原样写进一个新目录，改 `name` / `id` / 组件内容即可跑通一个 UI 装饰插件。

`package.json`

```json
{
  "name": "@local/my-decoration",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"]
    }
  }
}
```

`cordis.patch.yml`

```yaml
- insert:
    - id: my-decoration
      name: '@local/my-decoration'
```

`index.js`

```js
/** Host 半边；渲染由 Client 模块负责。 */
export function apply() {}
```

`client.js`

```js
window.__ModuleLoader__.load({
  id: '@local/my-decoration',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    function Decoration() {
      return h('svg', {
        viewBox: '0 0 64 64', width: 48, height: 48,
        'aria-hidden': true,
        style: { display: 'block', pointerEvents: 'none' },
      }, h('circle', { cx: 32, cy: 32, r: 24, fill: '#247bbf' }));
    }
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock', id: 'my-decoration', order: 5,
        }, Decoration));
      },
    };
  },
});
```

`locale/en.json`

```json
{ "meta": { "title": "My Decoration", "description": "Draws a badge under the composer." } }
```

`locale/zh.json`

```json
{ "meta": { "title": "我的装饰", "description": "在输入框下方绘制一个徽章。" } }
```

`icon.svg`：自备一张合法 SVG（≤ 256 KiB）。

---

## 六、更新、停用与卸载

| 操作 | 方式 | 生效条件 |
|---|---|---|
| 改代码后重装 | 对同一目录再次 `install_bundle` | 新装可 HMR；替换已安装包需重启 |
| 临时停用 | `plugin_manager` `set_plugin`（关闭）或 `set_bundle` | 看返回的 application 状态 |
| 彻底移除 | `plugin_manager` `remove_bundle` | 看返回的 application 状态 |

- `set_plugin` / `set_bundle` 用于切换启用状态；`list_plugins` / `list_bundles` 返回精确标识符。
- 把"保存状态"和"激活结果"分开看：`failed` 要排查，`overridden` 表示被更高优先级覆盖，`restart-required` 表示还没生效。
- 替换已安装包后，不要用 slot id 没变就推断浏览器代码已更新——要重启。

---

## 七、验证清单

安装完成后逐项确认：

- [ ] 返回 `application: applied`，`warnings` 已读且无阻断项
- [ ] `Config.listConfigs` 能查到新条目（Host 侧）
- [ ] `Slots.listSubTree` 的目标 slot occupants 里出现你的注册 id（Client 侧）
- [ ] 页面刷新后能看到实际渲染
- [ ] 文案在英文/中文两种 locale 下都正确
- [ ] 图标是自备的有效图片，没有回退到默认图
- [ ] 测试期间改动的用户状态已恢复

无浏览器控制时，报告口径："安装与注册已验证，渲染效果未在页面确认。"

---

## 八、常见坑

1. **直接改 profile 配置**：不要手写 profile 的 `package.json` / `cordis.patch.yml`，交给 `install_bundle`。
2. **在 `$DSH_HOME` 下建包**：应在工作区建包，再安装。
3. **`files` 漏文件**：新增模块、locale、图标后要同步更新 `files`。
4. **factory id 与包名不一致**：Client 模块必须用包名作为 `id`。
5. **`apply` 外有副作用**：factory 和模块顶层保持纯净，资源在 `apply` 里注册并返回清理。
6. **替换包后不重启**：替换已安装包必须重启，否则跑的还是旧 JS。
7. **图标不合规**：必须是真实图片字节，≤ 256 KiB，路径在包内，不能用绝对路径或外链。
8. **覆盖行时以为 config 会合并**：匹配到的 override 是整体替换。
9. **把安装成功当视觉成功**：安装和 slot 注册只说明接线成功，渲染要单独看。
10. **绕过权限**：安装被拒时不要换方式硬上，换有权限的环境。

---

## 九、参考位置

| 内容 | 位置 |
|---|---|
| 模板（装饰类 UI 插件） | `...\skills\cordis-plugin-development\templates\decoration\` |
| 模板（MCP bundle） | `...\skills\cordis-plugin-development\templates\mcp\` |
| Bundle / Host 插件细节 | `...\skills\cordis-plugin-development\references\host-plugin.md` |
| Web UI 插件细节 | `...\skills\cordis-plugin-development\references\ui-plugin.md` |
| MCP 配置型 bundle | `...\skills\cordis-plugin-development\references\mcp-bundle.md` |
| 扩展点与性能取舍 | `...\skills\cordis-plugin-development\references\practices.md` |
| 页面 / 面板验证方法 | `...\skills\cordis-plugin-development\references\verification.md` |
| 让 UI 操作与工具共享逻辑 | `...\skills\cordis-plugin-development\references\user-actions.md` |
| Loader patch 方言 | `cordis-composition-reference` skill |

前缀路径：`C:\Users\76927\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-agent-preset\skills\`
