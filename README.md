# 日历备忘录 · DeepSeek Harness 插件

> [English](README.en.md) · 简体中文

把月历变成每日备忘录：点选任意一天，一条一条添加，文字只保存在本机。

![日历图标](icon.svg)

## 功能

- 主面板中的完整月历，从侧边栏的面板列表打开。
- 每天可以添加任意多条独立备忘录，一条一条添加，不再是一整段日记。
- 当天的面板底部有输入框：写完点「添加」，或按 `Ctrl`/`Cmd`+`Enter`。
- 每条备忘录都可以单独编辑或删除；「清空本日」需要二次确认。
- 拖动备忘录左侧的手柄可以调整当天列表顺序，新顺序会立即保存，重启后仍然保留。
- 查看的不是今天时，每条备忘录都有「移至今天」；会把该条移动到今天列表末尾。
- 「长期」标签页是一份独立清单：不绑定日期，可以直接添加、编辑和删除。拖动左侧手柄可以调整长期备忘录的顺序，顺序会保存。旧版本中已标记为长期的备忘录会自动迁移过来。
- 月历单元格显示当天的备忘录条数，并预览最新一条。
- 今天用淡色背景、细描边和日期旁的小圆点标记，日期本身与其他日期一致。
- 支持上个月 / 下个月、回到今天，以及天数与备忘录条数统计。
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
  "version": 4,
  "entries": {
    "2026-11-16": {
      "items": [
        {
          "id": "6f0d0e1a-…",
          "text": "今天的第一条备忘录。",
          "createdAt": "2026-11-16T10:00:00.000Z",
          "updatedAt": "2026-11-16T10:00:00.000Z"
        }
      ]
    }
  },
  "longTerm": [
    {
      "id": "88d1c5b2-…",
      "text": "一条不绑定日期的长期备忘录。",
      "createdAt": "2026-11-16T10:05:00.000Z",
      "updatedAt": "2026-11-16T10:05:00.000Z"
    }
  ]
}
```

长期备忘录独立保存在顶层 `longTerm` 数组中，不属于任何日期，也不计入日历的每日记录。
删除某天的最后一条日常备忘录后，这一天会从月历中移除。写入串行化，并用
「写临时文件 + rename」落盘；文件损坏时会保留为 `entries.json.corrupt-<时间戳>`，
不会直接覆盖。备份时复制这一个文件即可。

旧数据会在读取时自动转换：上一版的单段文字会变成一条备忘录；旧版中带有
`longTerm` 标记的备忘录会被移入顶层 `longTerm` 数组，成为独立长期备忘录。
旧原型的 `notes.json` 会按原笔记逐条导入，原有文字不会丢失。

## 对外接口

宿主注册 12 条同源 JSON 路由（都在 `/dsh-memo/api/` 下）：

| 方法 | 路径 | 请求体 | 返回 |
| --- | --- | --- | --- |
| GET | `/ping` | — | `{ ok, name, version, days, memos, dataFile }` |
| GET | `/list` | — | `{ version, entries, days, memos }` |
| POST | `/add` | `{ date, text }` | `{ item, items, days, memos }` |
| POST | `/update` | `{ date, id, text }` | `{ item, items, days, memos }` |
| POST | `/delete` | `{ date, id }` | `{ ok, removed, items, days, memos }` |
| POST | `/reorder` | `{ date, ids }` | `{ items, days, memos }` |
| POST | `/move` | `{ fromDate, toDate, id }` | `{ item, fromItems, toItems, days, memos }` |
| POST | `/longterm/add` | `{ text }` | `{ item, longTerm, longTermMemos }` |
| POST | `/longterm/update` | `{ id, text }` | `{ item, longTerm, longTermMemos }` |
| POST | `/longterm/delete` | `{ id }` | `{ ok, removed, longTerm, longTermMemos }` |
| POST | `/longterm/reorder` | `{ ids }` | `{ longTerm, longTermMemos }` |
| POST | `/clear` | `{ date }` | `{ ok, removed, days, memos }` |

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
