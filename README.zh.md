# 日历备忘录 · DeepSeek Harness 插件

把月历变成每日记录：点选任意一天写下内容，文字自动保存在本机。

![日历图标](icon.svg)

## 功能

- 主面板中的完整月历，从侧边栏的面板列表打开。
- 每天一篇备忘录；有内容的日期显示圆点与摘要。
- 点击日期即可编辑，停顿 700ms 自动保存，`Ctrl`/`Cmd`+`S` 立即保存。
- 切换日期、关闭面板或关闭页面时，会把待保存的文字补交上去。
- 支持上个月 / 下个月、回到今天，以及本月与总记录天数统计。
- 「清空本日」需要二次确认，避免误删。
- 跟随 DSH 的明暗主题与主题变量；界面文案支持简体中文和英文。
- 数据只保存在本机。

## 安装

本仓库本身就是一个可安装的 DSH bundle：`package.json` 的 `dsh.bundle.patch` 指向
`cordis.patch.yml`，宿主半侧是 `lib/index.js`，浏览器半侧是 `lib/client.js`，无需构建。

从 GitHub 安装：

```bash
dsh plugin add github:ZSj925/dsh-plugin-memo-calendar
```

或安装本地目录：

```bash
dsh plugin add link:/absolute/path/to/dsh-plugin-memo-calendar
```

安装后刷新 Web UI。侧边栏的面板列表里会出现日历图标，点击即打开。如果没有出现，
请在「设置 → 插件」中确认 `dsh-plugin-memo-calendar` 已启用。

## 数据位置

```
<DSH_HOME>/memo-calendar/entries.json      # 默认：~/.dsh/memo-calendar/entries.json
```

```json
{
  "version": 2,
  "entries": {
    "2026-11-16": {
      "text": "今天的第一行……",
      "createdAt": "2026-11-16T10:00:00.000Z",
      "updatedAt": "2026-11-16T10:02:00.000Z"
    }
  }
}
```

空白内容会删除当天的条目，因此月历只标记真正有记录的日期。写入串行化，并用
「写临时文件 + rename」落盘；文件损坏时会保留为 `entries.json.corrupt-<时间戳>`，
不会直接覆盖。备份时复制这一个文件即可。

首次启用还会导入旧版原型留下的 `notes.json`，按每条笔记写入时的本地日期归档，
原有文字不会丢失。

## 对外接口

宿主注册 4 条同源 JSON 路由（都在 `/dsh-memo/api/` 下）：

| 方法 | 路径 | 请求体 | 返回 |
| --- | --- | --- | --- |
| GET | `/ping` | — | `{ ok, name, days, dataFile }` |
| GET | `/list` | — | `{ version, entries, days }` |
| POST | `/save` | `{ date, text }` | `{ entry, removed, days }` |
| POST | `/delete` | `{ date }` | `{ ok, removed, days }` |

日期使用本地日历日期，格式为 `YYYY-MM-DD`。路由会拒绝显式跨站请求
（`Sec-Fetch-Site: cross-site`）以及 `Origin` 与 `Host` 不匹配的请求。

## 开发

不需要打包器。用下面的命令检查两半代码的语法：

```bash
node --check lib/index.js
node --check lib/client.js
```

浏览器半侧是一个 `window.__ModuleLoader__` 懒加载工厂，注册名为 `memo-calendar`
的 `main` 面板，以及对应的 `sidebar.panellist` 图标。

## 许可证

MIT
