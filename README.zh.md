# 备忘录 · dsh-plugin-memo-calendar

DeepSeek Harness（DSH）的备忘录插件：在会话右侧栏开一个笔记面板，随手记下想法、待办和片段。

- 右侧栏「+」→ **备忘录** 打开面板
- 列表支持搜索、置顶；点开即编辑，输入停顿 600ms 自动保存
- 关闭页面/切走时用 `sendBeacon` 兜底提交最后一次改动
- 数据只存在本机：`<DSH_HOME>/memo-calendar/notes.json`（默认 `~/.dsh`）

## 安装

```bash
# 在 DSH 里用插件面板安装，或本地开发安装：
dsh plugin add link:D:/code/DS/memo-calendar
```

本仓库本身就是一个可直接安装的 DSH bundle：`package.json` 的 `dsh.bundle.patch` 指向
`cordis.patch.yml`，插件宿主半侧是 `lib/index.js`，浏览器半侧是 `lib/client.js`（无需构建）。

安装后在「设置 → 插件」里确认 `dsh-plugin-memo-calendar` 已启用，然后刷新页面，
在右侧栏的「+」里就能看到「备忘录」。

## 数据

```
~/.dsh/memo-calendar/notes.json
{
  "version": 1,
  "notes": [
    { "id": "…", "title": "…", "body": "…", "pinned": false,
      "createdAt": "2026-11-16T09:00:00.000Z", "updatedAt": "…" }
  ]
}
```

写入串行化，并用「写临时文件 + rename」落盘，进程中断不会留下半截文件；
文件损坏时会被改名成 `notes.json.corrupt-<时间戳>` 保留现场，而不是直接覆盖。

想备份就复制这一个文件；想换机器就把整个目录带走。

## 对外接口

宿主只注册 4 条同源 JSON 路由（都在 `/dsh-memo/api/` 下）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/ping` | 探活，返回笔记条数 |
| GET | `/list` | 全部笔记 |
| POST | `/save` | 新建或更新（`{ id?, title?, body?, pinned? }`） |
| POST | `/delete` | 删除（`{ id }`） |

路由带同源检查：显式跨站请求（`Sec-Fetch-Site: cross-site`）与 `Origin` 不匹配的请求直接 403。
