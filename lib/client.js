window.__ModuleLoader__.load({
  id: "dsh-plugin-memo-calendar",
  factory(require) {
    "use strict"

    const React = require("react")
    const h = React.createElement
    const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React

    const NS = "memo-calendar"
    const PANEL_ID = "memo-calendar"
    const API = "/dsh-memo/api"
    const STYLE_ID = "dsh-plugin-memo-calendar-style-v3"
    const MAX_TEXT = 200_000
    const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const WEEKDAY_COLUMNS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    const ZH = {
      panel: "备忘录",
      title: "日历备忘录",
      subtitle: "一天可以记下多条，逐条添加，自动保存在本机。",
      today: "今天",
      todayBadge: "今天",
      prevMonth: "上个月",
      nextMonth: "下个月",
      calendarLabel: "月历",
      editorLabel: "当日备忘录",
      hint: "点击日期查看或添加",
      retry: "重试",
      loading: "正在读取本机记录…",
      loadFailed: "记录读取失败",
      offline: "本地存储服务没有响应，请确认插件已启用后重试。",
      monthTitle: "{year}年{month}",
      "month.1": "1月",
      "month.2": "2月",
      "month.3": "3月",
      "month.4": "4月",
      "month.5": "5月",
      "month.6": "6月",
      "month.7": "7月",
      "month.8": "8月",
      "month.9": "9月",
      "month.10": "10月",
      "month.11": "11月",
      "month.12": "12月",
      "weekday.mon": "一",
      "weekday.tue": "二",
      "weekday.wed": "三",
      "weekday.thu": "四",
      "weekday.fri": "五",
      "weekday.sat": "六",
      "weekday.sun": "日",
      "weekdayLong.mon": "周一",
      "weekdayLong.tue": "周二",
      "weekdayLong.wed": "周三",
      "weekdayLong.thu": "周四",
      "weekdayLong.fri": "周五",
      "weekdayLong.sat": "周六",
      "weekdayLong.sun": "周日",
      longDate: "{month}{day}日",
      emptyDay: "这一天还没有备忘录，写一条吧。",
      composerPlaceholder: "写一条备忘录…\nCtrl/Cmd + Enter 添加。",
      composeHint: "Ctrl/Cmd + Enter 添加",
      dragToReorder: "拖动排序",
      add: "添加",
      adding: "添加中…",
      edit: "编辑",
      save: "保存",
      saving: "保存中…",
      cancel: "取消",
      delete: "删除",
      confirmDelete: "确认删除",
      deleting: "删除中…",
      clear: "清空本日",
      confirmClear: "确认清空",
      clearing: "清空中…",
      actionFailed: "操作失败",
      updatedAt: "更新于 {time}",
      memoCount: "{count} 条",
      monthEmpty: "本月还没有备忘录",
      monthSummary: "本月 {days} 天 · {memos} 条",
      totalSummary: "共 {days} 天 · {memos} 条",
      hasEntry: "有备忘录",
    }

    const EN = {
      panel: "Memos",
      title: "Calendar memos",
      subtitle: "Add as many separate memos as you like each day. Everything is saved on this machine.",
      today: "Today",
      todayBadge: "Today",
      prevMonth: "Previous month",
      nextMonth: "Next month",
      calendarLabel: "Month calendar",
      editorLabel: "Daily memos",
      hint: "Click a day to view or add",
      retry: "Retry",
      loading: "Loading your local memos…",
      loadFailed: "Could not load memos",
      offline: "The local storage service did not answer. Check that the plugin is enabled and retry.",
      monthTitle: "{month} {year}",
      "month.1": "January",
      "month.2": "February",
      "month.3": "March",
      "month.4": "April",
      "month.5": "May",
      "month.6": "June",
      "month.7": "July",
      "month.8": "August",
      "month.9": "September",
      "month.10": "October",
      "month.11": "November",
      "month.12": "December",
      "weekday.mon": "Mon",
      "weekday.tue": "Tue",
      "weekday.wed": "Wed",
      "weekday.thu": "Thu",
      "weekday.fri": "Fri",
      "weekday.sat": "Sat",
      "weekday.sun": "Sun",
      "weekdayLong.mon": "Monday",
      "weekdayLong.tue": "Tuesday",
      "weekdayLong.wed": "Wednesday",
      "weekdayLong.thu": "Thursday",
      "weekdayLong.fri": "Friday",
      "weekdayLong.sat": "Saturday",
      "weekdayLong.sun": "Sunday",
      longDate: "{month} {day}",
      emptyDay: "No memos for this day yet. Write one below.",
      composerPlaceholder: "Write a memo…\nCtrl/Cmd + Enter to add.",
      composeHint: "Ctrl/Cmd + Enter to add",
      dragToReorder: "Drag to reorder",
      add: "Add",
      adding: "Adding…",
      edit: "Edit",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      delete: "Delete",
      confirmDelete: "Confirm delete",
      deleting: "Deleting…",
      clear: "Clear day",
      confirmClear: "Confirm clear",
      clearing: "Clearing…",
      actionFailed: "Action failed",
      updatedAt: "Updated {time}",
      memoCount: "{count} memos",
      monthEmpty: "No memos this month",
      monthSummary: "{days} days · {memos} memos this month",
      totalSummary: "{days} days · {memos} memos in total",
      hasEntry: "has memos",
    }

    // ------------------------------------------------------------------ utils
    function pad2(value) {
      return value < 10 ? "0" + value : String(value)
    }

    function dateKey(date) {
      return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate())
    }

    function parseDateKey(key) {
      const parts = String(key).split("-").map(Number)
      if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) return new Date()
      return new Date(parts[0], parts[1] - 1, parts[2])
    }

    function format(template, values) {
      let text = String(template == null ? "" : template)
      for (const key of Object.keys(values)) {
        text = text.split("{" + key + "}").join(String(values[key]))
      }
      return text
    }

    function formatClock(iso) {
      if (!iso) return ""
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ""
      try {
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      } catch (error) {
        return ""
      }
    }

    function previewOf(text) {
      const line = String(text || "")
        .split("\n")
        .map((value) => value.trim())
        .find(Boolean)
      if (!line) return ""
      return line.length > 72 ? line.slice(0, 72) + "…" : line
    }

    function buildCalendar(year, month) {
      const first = new Date(year, month, 1)
      const offset = (first.getDay() + 6) % 7
      const start = new Date(year, month, 1 - offset)
      const cells = []
      for (let index = 0; index < 42; index += 1) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
        cells.push({
          key: dateKey(date),
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          weekday: WEEKDAY_KEYS[date.getDay()],
        })
      }
      return cells
    }

    function itemsOf(entry) {
      return entry && Array.isArray(entry.items) ? entry.items : []
    }

    function countMemos(entries, prefix) {
      let days = 0
      let memos = 0
      for (const [key, entry] of Object.entries(entries)) {
        if (prefix && !key.startsWith(prefix)) continue
        const items = itemsOf(entry)
        if (items.length === 0) continue
        days += 1
        memos += items.length
      }
      return { days, memos }
    }

    async function requestJson(path, options) {
      const response = await fetch(API + path, Object.assign({ cache: "no-store" }, options || {}))
      let body = null
      try {
        body = await response.json()
      } catch (error) {
        body = null
      }
      if (!response.ok) {
        const message = body && typeof body.error === "string" ? body.error : "HTTP " + response.status
        const failure = new Error(message)
        failure.status = response.status
        throw failure
      }
      return body || {}
    }

    function errorText(failure) {
      return String((failure && failure.message) || failure)
    }

    // ------------------------------------------------------------------ icons
    function CalendarIcon(props) {
      const size = typeof props === "number" ? props : (props && props.size) || 18
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          "aria-hidden": "true",
          style: { display: "block" },
        },
        [
          h("rect", {
            key: "frame",
            x: 3.25,
            y: 5,
            width: 17.5,
            height: 15.5,
            rx: 3.6,
            stroke: "currentColor",
            strokeWidth: 1.5,
          }),
          h("path", {
            key: "rule",
            d: "M3.6 9.4h16.8M8 3v4M16 3v4",
            stroke: "currentColor",
            strokeWidth: 1.5,
            strokeLinecap: "round",
          }),
          h("circle", { key: "dot", cx: 12, cy: 14.8, r: 1.55, fill: "currentColor" }),
        ],
      )
    }

    function ChevronIcon(props) {
      const direction = props && props.direction === "right" ? 1 : -1
      return h(
        "svg",
        { width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", style: { display: "block" } },
        h("path", {
          d: direction > 0 ? "M6 3.2 10.8 8 6 12.8" : "M10 3.2 5.2 8 10 12.8",
          stroke: "currentColor",
          strokeWidth: 1.35,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
      )
    }

    function TrashIcon(props) {
      const size = (props && props.size) || 13
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": "true",
          style: { display: "block" },
        },
        h("path", {
          d: "M3.2 4.6h9.6M6.3 4.6V3.2h3.4v1.4M4.7 4.6l.6 8.2h5.4l.6-8.2M6.6 7v3.6M9.4 7v3.6",
          stroke: "currentColor",
          strokeWidth: 1.1,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
      )
    }

    function PlusIcon(props) {
      const size = (props && props.size) || 13
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": "true",
          style: { display: "block" },
        },
        h("path", {
          d: "M8 3.2v9.6M3.2 8h9.6",
          stroke: "currentColor",
          strokeWidth: 1.4,
          strokeLinecap: "round",
        }),
      )
    }

    function GripIcon(props) {
      const size = (props && props.size) || 14
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: "none",
          "aria-hidden": "true",
          style: { display: "block" },
        },
        [
          h("circle", { key: "a", cx: 6, cy: 4, r: 1.1, fill: "currentColor" }),
          h("circle", { key: "b", cx: 10, cy: 4, r: 1.1, fill: "currentColor" }),
          h("circle", { key: "c", cx: 6, cy: 8, r: 1.1, fill: "currentColor" }),
          h("circle", { key: "d", cx: 10, cy: 8, r: 1.1, fill: "currentColor" }),
          h("circle", { key: "e", cx: 6, cy: 12, r: 1.1, fill: "currentColor" }),
          h("circle", { key: "f", cx: 10, cy: 12, r: 1.1, fill: "currentColor" }),
        ],
      )
    }

    // -------------------------------------------------------------------- css
    const CSS = `
      .dcm-page{width:100%;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;font-size:15px;line-height:1.6}
      .dcm-scroll{height:100%;min-height:0;overflow:auto;scrollbar-gutter:stable}
      .dcm-content{box-sizing:border-box;max-width:1400px;margin:0 auto;padding:30px clamp(22px,3.8vw,54px) 48px}
      .dcm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:22px;margin-bottom:26px}
      .dcm-head-main{display:flex;align-items:center;gap:14px;min-width:0}
      .dcm-mark{flex:none;display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:15px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
      .dcm-head h1{margin:0;font-size:26px;line-height:1.3;font-weight:600;letter-spacing:-.02em}
      .dcm-head p{margin:3px 0 0;font-size:13.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
      .dcm-head-actions{flex:none;display:flex;align-items:center;gap:8px}
      .dcm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 14px;border-radius:11px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;line-height:1;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s,color .15s,opacity .15s}
      .dcm-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
      .dcm-btn:disabled{opacity:.45;cursor:default}
      .dcm-btn--primary{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font-weight:600}
      .dcm-btn--primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,var(--dsw-alias-bg-layer-1));border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);filter:none}
      .dcm-btn:focus-visible,.dcm-icon-btn:focus-visible,.dcm-day:focus-visible,.dcm-clear:focus-visible,.dcm-text-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .dcm-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(380px,.95fr);gap:22px;align-items:start}
      .dcm-card{box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:20px;box-shadow:0 14px 38px rgba(0,0,0,.18);backdrop-filter:blur(18px) saturate(1.1)}
      .dcm-calendar{min-width:0;padding:20px 20px 16px}
      .dcm-cal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .dcm-month-nav{display:flex;align-items:center;gap:4px;min-width:0}
      .dcm-month{margin:0;padding:0 2px;font-size:18px;line-height:1.4;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
      .dcm-hint{color:var(--dsw-alias-label-tertiary);font-size:12.5px;white-space:nowrap}
      .dcm-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex:none;padding:0;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
      .dcm-icon-btn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-primary)}
      .dcm-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;padding:0 0 8px}
      .dcm-weekday{text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:500;letter-spacing:.03em}
      .dcm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
      .dcm-day{position:relative;min-width:0;min-height:104px;box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;gap:4px;text-align:left;padding:9px 10px;border-radius:13px;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-bg-base) 14%,transparent);color:inherit;font:inherit;cursor:pointer;transition:background .12s,border-color .12s}
      @media (hover:hover){.dcm-day:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}}
      .dcm-day[data-outside="true"]{opacity:.42}
      .dcm-day[data-selected="true"]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
      .dcm-day[data-selected="true"][data-outside="true"]{opacity:.8}
      .dcm-day[data-today="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
      .dcm-day[data-today="true"][data-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
      .dcm-day[data-today="true"]:not([data-selected="true"]){box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent)}
      .dcm-day-top{display:flex;align-items:center;justify-content:space-between;gap:5px;min-height:21px}
      .dcm-day-left{display:inline-flex;align-items:center;gap:6px;min-width:0}
      .dcm-day-num{font-size:13.5px;line-height:20px;font-weight:500;color:var(--dsw-alias-label-primary)}
      .dcm-day[data-outside="true"] .dcm-day-num{color:var(--dsw-alias-label-tertiary)}
      .dcm-today-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-brand-primary)}
      .dcm-day-markers{display:inline-flex;align-items:center;gap:5px;flex:none}
      .dcm-day-count{display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);color:var(--dsw-alias-brand-primary);font-size:11px;font-weight:600;line-height:1}
      .dcm-day-preview{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-wrap}
      .dcm-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding:11px 4px 0;border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:12.5px}
      .dcm-sep{color:var(--dsw-alias-border-l2)}
      .dcm-editor{display:flex;flex-direction:column;min-width:0;min-height:580px;padding:22px;overflow:hidden}
      .dcm-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex:none}
      .dcm-editor-eyebrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:1.5}
      .dcm-eyebrow-sep{color:var(--dsw-alias-border-l2)}
      .dcm-badge{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);font-size:11.5px;font-weight:500}
      .dcm-editor-date{margin:2px 0 0;font-size:22px;line-height:1.4;font-weight:600;letter-spacing:-.01em}
      .dcm-clear{display:inline-flex;align-items:center;gap:4px;flex:none;height:32px;padding:0 9px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
      .dcm-clear:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}
      .dcm-clear.is-confirming{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
      .dcm-clear:disabled{opacity:.4;cursor:default;background:transparent}
      .dcm-action-error{margin:14px 0 0;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5;overflow-wrap:anywhere}
      .dcm-memo-scroll{flex:1 1 auto;min-height:160px;overflow:auto;scrollbar-gutter:stable;margin:16px 0 0;padding:0 2px 10px}
      .dcm-memo{position:relative;box-sizing:border-box;display:flex;gap:10px;padding:13px 15px;border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 4px 14px rgba(0,0,0,.12);backdrop-filter:blur(10px) saturate(1.05)}
      .dcm-memo+.dcm-memo{margin-top:10px}
      .dcm-memo[data-dragging="true"]{opacity:.55}
      .dcm-memo[data-drop="before"]::before,.dcm-memo[data-drop="after"]::after{content:"";position:absolute;left:10px;right:10px;height:2px;border-radius:2px;background:var(--dsw-alias-brand-primary);pointer-events:none}
      .dcm-memo[data-drop="before"]::before{top:1px}
      .dcm-memo[data-drop="after"]::after{bottom:1px}
      .dcm-drag-handle{display:inline-flex;align-items:center;justify-content:center;width:22px;min-height:26px;flex:none;margin-top:-1px;border-radius:6px;color:var(--dsw-alias-label-tertiary);cursor:grab;user-select:none}
      .dcm-drag-handle:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}
      .dcm-drag-handle:active{cursor:grabbing}
      .dcm-drag-handle[draggable="false"]{opacity:.35;cursor:default}
      .dcm-memo-body{flex:1;min-width:0}
      .dcm-memo-text{font-size:15px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}
      .dcm-memo-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px;min-height:26px}
      .dcm-memo-time{color:var(--dsw-alias-label-tertiary);font-size:12px;flex:none;font-variant-numeric:tabular-nums}
      .dcm-memo-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap}
      .dcm-text-btn{display:inline-flex;align-items:center;height:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
      .dcm-text-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}
      .dcm-text-btn.is-primary{color:var(--dsw-alias-brand-primary);font-weight:600}
      .dcm-text-btn.is-danger{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent)}
      .dcm-text-btn:disabled{opacity:.45;cursor:default}
      .dcm-edit{box-sizing:border-box;width:100%;min-height:110px;padding:11px 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);backdrop-filter:blur(8px);color:var(--dsw-alias-label-primary);font:inherit;font-size:15px;line-height:1.7;resize:vertical;outline:none}
      .dcm-edit:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
      .dcm-empty-day{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:220px;padding:28px 14px;text-align:center;color:var(--dsw-alias-label-tertiary)}
      .dcm-empty-day p{margin:0;font-size:13.5px;line-height:1.6}
      .dcm-empty-glyph{color:var(--dsw-alias-brand-primary);opacity:.55}
      .dcm-composer{flex:none;margin-top:2px;padding-top:14px;border-top:.5px solid var(--dsw-alias-border-l1)}
      .dcm-compose{box-sizing:border-box;width:100%;min-height:92px;max-height:210px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:15px;line-height:1.65;resize:none;outline:none;backdrop-filter:blur(10px) saturate(1.05)}
      .dcm-compose::placeholder{color:var(--dsw-alias-label-tertiary)}
      .dcm-compose:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
      .dcm-compose-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
      .dcm-compose-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.4}
      .dcm-compose-foot .dcm-btn{height:34px;font-size:13px}
      .dcm-state-box{margin-top:34px;padding:56px 28px;border:.5px solid var(--dsw-alias-border-l1);border-radius:20px;background:var(--dsw-alias-bg-layer-1);text-align:center;color:var(--dsw-alias-label-tertiary)}
      .dcm-state-box h2{margin:0 0 6px;color:var(--dsw-alias-label-primary);font-size:18px;font-weight:600}
      .dcm-state-box p{margin:0;font-size:13.5px;line-height:1.6;overflow-wrap:anywhere}
      .dcm-state-box .dcm-btn{margin-top:18px}
      .dcm-state-box.is-error h2{color:var(--dsw-alias-state-error-primary)}
      .dcm-spinner{width:24px;height:24px;margin:0 auto 14px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dcm-spin .8s linear infinite}
      @keyframes dcm-spin{to{transform:rotate(360deg)}}
      @media (max-width:980px){
        .dcm-layout{grid-template-columns:1fr}
        .dcm-editor{min-height:540px}
      }
      @media (max-width:640px){
        .dcm-content{padding:20px 14px 32px}
        .dcm-head{gap:10px;margin-bottom:14px}
        .dcm-head h1{font-size:22px}
        .dcm-head p{display:none}
        .dcm-mark{width:42px;height:42px;border-radius:13px}
        .dcm-hint{display:none}
        .dcm-calendar{padding:14px 12px 12px}
        .dcm-day{min-height:72px;padding:6px 7px;border-radius:10px}
        .dcm-day-preview{display:none}
        .dcm-month{font-size:17px}
        .dcm-editor{padding:16px;min-height:500px}
        .dcm-compose{min-height:80px}
        .dcm-compose-hint{display:none}
        .dcm-summary{font-size:12px}
      }
      @media (prefers-reduced-motion:reduce){.dcm-spinner{animation:none}}
    `

    // ------------------------------------------------------------------ page
    function MemoCalendarPage(props) {
      const t = typeof props.t === "function" ? props.t : (key) => ZH[key] || EN[key] || key

      const [status, setStatus] = useState("loading")
      const [loadError, setLoadError] = useState("")
      const [entries, setEntries] = useState({})
      const [view, setView] = useState(() => {
        const now = new Date()
        return { year: now.getFullYear(), month: now.getMonth() }
      })
      const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
      const [drafts, setDrafts] = useState({})
      const [adding, setAdding] = useState(false)
      const [editingId, setEditingId] = useState(null)
      const [editText, setEditText] = useState("")
      const [savingEdit, setSavingEdit] = useState(false)
      const [deletingId, setDeletingId] = useState(null)
      const [confirmDeleteId, setConfirmDeleteId] = useState(null)
      const [clearing, setClearing] = useState(false)
      const [confirmClear, setConfirmClear] = useState(false)
      const [actionError, setActionError] = useState("")
      const [reordering, setReordering] = useState(false)
      const [draggingId, setDraggingId] = useState(null)
      const [dropTarget, setDropTarget] = useState(null)
      const [editorHeight, setEditorHeight] = useState(null)

      const composerRef = useRef(null)
      const editRef = useRef(null)
      const memoScrollRef = useRef(null)
      const calendarRef = useRef(null)
      const addingRef = useRef(false)

      const load = useCallback(() => {
        setStatus("loading")
        setLoadError("")
        requestJson("/list")
          .then((payload) => {
            const source = payload && payload.entries && typeof payload.entries === "object" ? payload.entries : {}
            const next = {}
            for (const [key, entry] of Object.entries(source)) {
              const items = itemsOf(entry).filter(
                (item) => item && typeof item.id === "string" && typeof item.text === "string",
              )
              if (items.length > 0) next[key] = { items }
            }
            setEntries(next)
            setStatus("ready")
          })
          .catch((failure) => {
            setLoadError(errorText(failure))
            setStatus("error")
          })
      }, [])

      useEffect(() => {
        load()
      }, [load])

      useEffect(() => {
        setEditingId(null)
        setEditText("")
        setDeletingId(null)
        setConfirmDeleteId(null)
        setConfirmClear(false)
        setActionError("")
        setDraggingId(null)
        setDropTarget(null)
      }, [selectedDate])

      useEffect(() => {
        if (!editingId) return undefined
        const timer = setTimeout(() => {
          if (editRef.current) editRef.current.focus()
        }, 0)
        return () => clearTimeout(timer)
      }, [editingId])

      useEffect(() => {
        if (!confirmDeleteId) return undefined
        const timer = setTimeout(() => setConfirmDeleteId(null), 3500)
        return () => clearTimeout(timer)
      }, [confirmDeleteId])

      useEffect(() => {
        if (!confirmClear) return undefined
        const timer = setTimeout(() => setConfirmClear(false), 3500)
        return () => clearTimeout(timer)
      }, [confirmClear])

      // Keep the memo column exactly as tall as the calendar, so its list scrolls
      // inside the card instead of stretching the page below the calendar.
      useLayoutEffect(() => {
        if (status !== "ready") return undefined
        const node = calendarRef.current
        if (!node || typeof window === "undefined" || typeof ResizeObserver === "undefined") return undefined
        const sync = () => {
          if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 980px)").matches) {
            setEditorHeight(null)
            return
          }
          const height = Math.round(node.getBoundingClientRect().height)
          setEditorHeight(height > 0 ? height : null)
        }
        sync()
        const observer = new ResizeObserver(sync)
        observer.observe(node)
        window.addEventListener("resize", sync)
        return () => {
          observer.disconnect()
          window.removeEventListener("resize", sync)
        }
      }, [status])

      const todayKey = dateKey(new Date())
      const cells = useMemo(() => buildCalendar(view.year, view.month), [view.year, view.month])
      const monthPrefix = view.year + "-" + pad2(view.month + 1) + "-"
      const monthTotals = useMemo(() => countMemos(entries, monthPrefix), [entries, monthPrefix])
      const allTotals = useMemo(() => countMemos(entries, null), [entries])

      const selected = parseDateKey(selectedDate)
      const selectedWeekday = t("weekdayLong." + WEEKDAY_KEYS[selected.getDay()])
      const selectedLabel = format(t("longDate"), {
        month: t("month." + (selected.getMonth() + 1)),
        day: selected.getDate(),
      })
      const selectedIsToday = selectedDate === todayKey
      const selectedItems = itemsOf(entries[selectedDate])
      const draft = drafts[selectedDate] || ""
      const monthLabel = format(t("monthTitle"), {
        year: view.year,
        month: t("month." + (view.month + 1)),
      })

      const moveMonth = useCallback((delta) => {
        setView((previous) => {
          const next = new Date(previous.year, previous.month + delta, 1)
          return { year: next.getFullYear(), month: next.getMonth() }
        })
      }, [])

      const selectDate = useCallback(
        (key, nextView) => {
          if (key === selectedDate) {
            if (nextView) setView(nextView)
            return
          }
          setSelectedDate(key)
          if (nextView) setView(nextView)
        },
        [selectedDate],
      )

      const goToday = useCallback(() => {
        const now = new Date()
        selectDate(dateKey(now), { year: now.getFullYear(), month: now.getMonth() })
      }, [selectDate])

      const updateDraft = useCallback(
        (value) => {
          setDrafts((previous) => Object.assign({}, previous, { [selectedDate]: value }))
        },
        [selectedDate],
      )

      const addMemo = useCallback(async () => {
        if (addingRef.current || reordering) return
        const text = draft.trim()
        if (!text) return
        addingRef.current = true
        setAdding(true)
        setActionError("")
        try {
          const payload = await requestJson("/add", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date: selectedDate, text }),
          })
          setEntries((previous) => Object.assign({}, previous, { [selectedDate]: { items: payload.items || [] } }))
          setDrafts((previous) => {
            const current = previous[selectedDate] || ""
            if (current.trim() !== text) return previous
            return Object.assign({}, previous, { [selectedDate]: "" })
          })
          setTimeout(() => {
            if (memoScrollRef.current) memoScrollRef.current.scrollTop = memoScrollRef.current.scrollHeight
          }, 0)
        } catch (failure) {
          setActionError(errorText(failure))
        } finally {
          addingRef.current = false
          setAdding(false)
        }
      }, [draft, reordering, selectedDate])

      const startEdit = useCallback(
        (item) => {
          if (reordering) return
          setEditingId(item.id)
          setEditText(item.text)
          setActionError("")
        },
        [reordering],
      )

      const cancelEdit = useCallback(() => {
        setEditingId(null)
        setEditText("")
        setActionError("")
      }, [])

      const saveEdit = useCallback(
        async (id) => {
          if (savingEdit || reordering) return
          const text = editText.trim()
          if (!text) return
          setSavingEdit(true)
          setActionError("")
          try {
            const payload = await requestJson("/update", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ date: selectedDate, id, text }),
            })
            setEntries((previous) => Object.assign({}, previous, { [selectedDate]: { items: payload.items || [] } }))
            setEditingId(null)
            setEditText("")
          } catch (failure) {
            setActionError(errorText(failure))
          } finally {
            setSavingEdit(false)
          }
        },
        [editText, reordering, savingEdit, selectedDate],
      )

      const deleteMemo = useCallback(
        async (id) => {
          if (deletingId || reordering) return
          if (confirmDeleteId !== id) {
            setConfirmDeleteId(id)
            setActionError("")
            return
          }
          setDeletingId(id)
          setActionError("")
          try {
            const payload = await requestJson("/delete", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ date: selectedDate, id }),
            })
            const remaining = Array.isArray(payload.items) ? payload.items : []
            setEntries((previous) => {
              const next = Object.assign({}, previous)
              if (remaining.length > 0) next[selectedDate] = { items: remaining }
              else delete next[selectedDate]
              return next
            })
            setConfirmDeleteId(null)
            if (editingId === id) {
              setEditingId(null)
              setEditText("")
            }
          } catch (failure) {
            setActionError(errorText(failure))
          } finally {
            setDeletingId(null)
          }
        },
        [confirmDeleteId, deletingId, editingId, reordering, selectedDate],
      )

      const clearDay = useCallback(async () => {
        if (clearing || reordering || selectedItems.length === 0) return
        if (!confirmClear) {
          setConfirmClear(true)
          setActionError("")
          return
        }
        setConfirmClear(false)
        setClearing(true)
        setActionError("")
        try {
          await requestJson("/clear", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date: selectedDate }),
          })
          setEntries((previous) => {
            const next = Object.assign({}, previous)
            delete next[selectedDate]
            return next
          })
          setDrafts((previous) => Object.assign({}, previous, { [selectedDate]: "" }))
          setEditingId(null)
          setEditText("")
          setConfirmClear(false)
        } catch (failure) {
          setActionError(errorText(failure))
        } finally {
          setClearing(false)
        }
      }, [clearing, confirmClear, reordering, selectedDate, selectedItems.length])


      const startDrag = useCallback(
        (event, item) => {
          if (editingId || reordering) {
            event.preventDefault()
            return
          }
          event.dataTransfer.effectAllowed = "move"
          event.dataTransfer.setData("text/plain", item.id)
          const card = event.currentTarget && event.currentTarget.closest
            ? event.currentTarget.closest(".dcm-memo")
            : null
          if (card && event.dataTransfer.setDragImage) {
            try {
              event.dataTransfer.setDragImage(card, 24, 20)
            } catch (error) {
              // A browser without a paintable drag image still drags normally.
            }
          }
          setDraggingId(item.id)
          setDropTarget(null)
          setActionError("")
        },
        [editingId, reordering],
      )

      const endDrag = useCallback(() => {
        setDraggingId(null)
        setDropTarget(null)
      }, [])

      const dragOverMemo = useCallback(
        (event, id) => {
          if (reordering || !draggingId || draggingId === id) return
          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
          const rect = event.currentTarget.getBoundingClientRect()
          const after = event.clientY > rect.top + rect.height / 2
          setDropTarget((previous) =>
            previous && previous.id === id && previous.after === after ? previous : { id, after },
          )
        },
        [draggingId, reordering],
      )

      const dragLeaveMemo = useCallback((event, id) => {
        const related = event.relatedTarget
        if (related && event.currentTarget.contains(related)) return
        setDropTarget((previous) => (previous && previous.id === id ? null : previous))
      }, [])

      const reorderMemo = useCallback(
        async (fromId, targetId, after) => {
          if (reordering || fromId === targetId) return
          const current = itemsOf(entries[selectedDate])
          const moved = current.find((item) => item.id === fromId)
          if (!moved) return
          const without = current.filter((item) => item.id !== fromId)
          const targetIndex = without.findIndex((item) => item.id === targetId)
          if (targetIndex < 0) return
          const next = without.slice()
          next.splice(targetIndex + (after ? 1 : 0), 0, moved)
          if (next.every((item, index) => item.id === current[index].id)) return

          const previous = current.slice()
          setReordering(true)
          setActionError("")
          setEntries((existing) => Object.assign({}, existing, { [selectedDate]: { items: next } }))
          try {
            const payload = await requestJson("/reorder", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ date: selectedDate, ids: next.map((item) => item.id) }),
            })
            setEntries((existing) =>
              Object.assign({}, existing, {
                [selectedDate]: { items: Array.isArray(payload.items) ? payload.items : next },
              }),
            )
          } catch (failure) {
            setEntries((existing) => Object.assign({}, existing, { [selectedDate]: { items: previous } }))
            setActionError(errorText(failure))
          } finally {
            setReordering(false)
            setDraggingId(null)
            setDropTarget(null)
          }
        },
        [entries, reordering, selectedDate],
      )

      const dropMemo = useCallback(
        (event, targetId) => {
          event.preventDefault()
          const fromId = draggingId || event.dataTransfer.getData("text/plain")
          const rect = event.currentTarget.getBoundingClientRect()
          const after = event.clientY > rect.top + rect.height / 2
          setDraggingId(null)
          setDropTarget(null)
          if (fromId && fromId !== targetId) reorderMemo(fromId, targetId, after)
        },
        [draggingId, reorderMemo],
      )

      const header = h(
        "header",
        { className: "dcm-head" },
        h(
          "div",
          { className: "dcm-head-main" },
          h("span", { className: "dcm-mark" }, CalendarIcon(24)),
          h("div", null, h("h1", null, t("title")), h("p", null, t("subtitle"))),
        ),
        h(
          "div",
          { className: "dcm-head-actions" },
          h(
            "button",
            {
              type: "button",
              className: "dcm-btn",
              onClick: goToday,
              disabled: status === "loading",
              title: t("today"),
            },
            CalendarIcon(14),
            t("today"),
          ),
        ),
      )

      if (status === "loading") {
        return h(
          "div",
          { className: "dcm-page" },
          h(
            "div",
            { className: "dcm-scroll" },
            h(
              "div",
              { className: "dcm-content" },
              header,
              h(
                "div",
                { className: "dcm-state-box" },
                h("div", { className: "dcm-spinner", "aria-hidden": "true" }),
                h("p", null, t("loading")),
              ),
            ),
          ),
        )
      }

      if (status === "error") {
        return h(
          "div",
          { className: "dcm-page" },
          h(
            "div",
            { className: "dcm-scroll" },
            h(
              "div",
              { className: "dcm-content" },
              header,
              h(
                "div",
                { className: "dcm-state-box is-error" },
                h("h2", null, t("loadFailed")),
                h("p", null, loadError || t("offline")),
                h("button", { type: "button", className: "dcm-btn", onClick: load }, t("retry")),
              ),
            ),
          ),
        )
      }

      const calendar = h(
        "section",
        { ref: calendarRef, className: "dcm-card dcm-calendar", "aria-label": t("calendarLabel") },
        h(
          "div",
          { className: "dcm-cal-head" },
          h(
            "div",
            { className: "dcm-month-nav" },
            h(
              "button",
              {
                type: "button",
                className: "dcm-icon-btn",
                onClick: () => moveMonth(-1),
                title: t("prevMonth"),
                "aria-label": t("prevMonth"),
              },
              ChevronIcon({ direction: "left" }),
            ),
            h("h2", { className: "dcm-month", "aria-live": "polite" }, monthLabel),
            h(
              "button",
              {
                type: "button",
                className: "dcm-icon-btn",
                onClick: () => moveMonth(1),
                title: t("nextMonth"),
                "aria-label": t("nextMonth"),
              },
              ChevronIcon({ direction: "right" }),
            ),
          ),
          h("span", { className: "dcm-hint" }, t("hint")),
        ),
        h(
          "div",
          { className: "dcm-weekdays", "aria-hidden": "true" },
          WEEKDAY_COLUMNS.map((key) => h("span", { key, className: "dcm-weekday" }, t("weekday." + key))),
        ),
        h(
          "div",
          { className: "dcm-grid" },
          cells.map((cell) => {
            const items = itemsOf(entries[cell.key])
            const count = items.length
            const latest = count > 0 ? items[count - 1] : null
            const outside = cell.year !== view.year || cell.month !== view.month
            const selectedCell = cell.key === selectedDate
            const isToday = cell.key === todayKey
            const dateLabel = format(t("longDate"), {
              month: t("month." + (cell.month + 1)),
              day: cell.day,
            })
            const weekdayLabel = t("weekdayLong." + cell.weekday)
            return h(
              "button",
              {
                key: cell.key,
                type: "button",
                className: "dcm-day",
                "data-outside": outside ? "true" : undefined,
                "data-today": isToday ? "true" : undefined,
                "data-selected": selectedCell ? "true" : undefined,
                "data-entry": count > 0 ? "true" : undefined,
                "aria-pressed": selectedCell,
                "aria-current": isToday ? "date" : undefined,
                "aria-label":
                  dateLabel +
                  " " +
                  weekdayLabel +
                  (count > 0 ? "，" + format(t("memoCount"), { count }) : ""),
                title: latest ? previewOf(latest.text) : dateLabel,
                onClick: () => selectDate(cell.key, outside ? { year: cell.year, month: cell.month } : null),
              },
              h(
                "span",
                { className: "dcm-day-top" },
                h(
                  "span",
                  { className: "dcm-day-left" },
                  h("span", { className: "dcm-day-num" }, String(cell.day)),
                  isToday ? h("span", { className: "dcm-today-dot", "aria-hidden": "true" }) : null,
                ),
                count > 0
                  ? h(
                      "span",
                      { className: "dcm-day-markers" },
                      h("span", { className: "dcm-day-count", title: format(t("memoCount"), { count }) }, String(count)),
                    )
                  : null,
              ),
              latest ? h("span", { className: "dcm-day-preview" }, previewOf(latest.text)) : null,
            )
          }),
        ),
        h(
          "div",
          { className: "dcm-summary" },
          h(
            "span",
            null,
            monthTotals.days === 0
              ? t("monthEmpty")
              : format(t("monthSummary"), { days: monthTotals.days, memos: monthTotals.memos }),
          ),
          h("span", { className: "dcm-sep", "aria-hidden": "true" }, "·"),
          h("span", null, format(t("totalSummary"), { days: allTotals.days, memos: allTotals.memos })),
        ),
      )

      const memoList =
        selectedItems.length === 0
          ? h(
              "div",
              { className: "dcm-empty-day" },
              h("span", { className: "dcm-empty-glyph" }, CalendarIcon(30)),
              h("p", null, t("emptyDay")),
            )
          : selectedItems.map((item) => {
              if (editingId === item.id) {
                return h(
                  "article",
                  { key: item.id, className: "dcm-memo is-editing" },
                  h("textarea", {
                    ref: editRef,
                    className: "dcm-edit",
                    value: editText,
                    maxLength: MAX_TEXT,
                    "aria-label": t("edit"),
                    onChange: (event) => setEditText(event.target.value),
                    onKeyDown: (event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault()
                        saveEdit(item.id)
                      } else if (event.key === "Escape") {
                        event.preventDefault()
                        cancelEdit()
                      }
                    },
                  }),
                  h(
                    "div",
                    { className: "dcm-memo-foot" },
                    h(
                      "time",
                      {
                        className: "dcm-memo-time",
                        dateTime: item.updatedAt,
                        title: format(t("updatedAt"), { time: formatClock(item.updatedAt) }),
                      },
                      formatClock(item.updatedAt),
                    ),
                    h(
                      "div",
                      { className: "dcm-memo-actions" },
                      h("button", { type: "button", className: "dcm-text-btn", onClick: cancelEdit }, t("cancel")),
                      h(
                        "button",
                        {
                          type: "button",
                          className: "dcm-text-btn is-primary",
                          onClick: () => saveEdit(item.id),
                          disabled: !editText.trim() || savingEdit || reordering,
                        },
                        savingEdit ? t("saving") : t("save"),
                      ),
                    ),
                  ),
                )
              }
              const dropped = dropTarget && dropTarget.id === item.id
              return h(
                "article",
                {
                  key: item.id,
                  className: "dcm-memo",
                  "data-dragging": draggingId === item.id ? "true" : undefined,
                  "data-drop": dropped ? (dropTarget.after ? "after" : "before") : undefined,
                  onDragOver: (event) => dragOverMemo(event, item.id),
                  onDragLeave: (event) => dragLeaveMemo(event, item.id),
                  onDrop: (event) => dropMemo(event, item.id),
                },
                h(
                  "span",
                  {
                    className: "dcm-drag-handle",
                    draggable: !editingId && !reordering,
                    title: t("dragToReorder"),
                    "aria-label": t("dragToReorder"),
                    onDragStart: (event) => startDrag(event, item),
                    onDragEnd: endDrag,
                  },
                  GripIcon({ size: 14 }),
                ),
                h(
                  "div",
                  { className: "dcm-memo-body" },
                  h("div", { className: "dcm-memo-text" }, item.text),
                  h(
                    "div",
                    { className: "dcm-memo-foot" },
                    h(
                      "time",
                      {
                        className: "dcm-memo-time",
                        dateTime: item.updatedAt,
                        title: format(t("updatedAt"), { time: formatClock(item.updatedAt) }),
                      },
                      formatClock(item.updatedAt),
                    ),
                    h(
                      "div",
                      { className: "dcm-memo-actions" },
                      h(
                        "button",
                        {
                          type: "button",
                          className: "dcm-text-btn",
                          onClick: () => startEdit(item),
                          disabled: reordering,
                        },
                        t("edit"),
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          className: "dcm-text-btn" + (confirmDeleteId === item.id ? " is-danger" : ""),
                          onClick: () => deleteMemo(item.id),
                          disabled: deletingId === item.id || reordering,
                        },
                        deletingId === item.id
                          ? t("deleting")
                          : confirmDeleteId === item.id
                            ? t("confirmDelete")
                            : t("delete"),
                      ),
                    ),
                  ),
                ),
              )
            })

      const editor = h(
        "section",
        {
          className: "dcm-card dcm-editor",
          style: editorHeight ? { height: editorHeight + "px" } : undefined,
          "aria-label": t("editorLabel"),
        },
        h(
          "div",
          { className: "dcm-editor-head" },
          h(
            "div",
            null,
            h(
              "div",
              { className: "dcm-editor-eyebrow" },
              h("span", null, selectedWeekday),
              h("span", { className: "dcm-eyebrow-sep", "aria-hidden": "true" }, "·"),
              h("span", null, format(t("memoCount"), { count: selectedItems.length })),
              selectedIsToday ? h("span", { className: "dcm-badge" }, t("todayBadge")) : null,
            ),
            h("h2", { className: "dcm-editor-date" }, selectedLabel),
          ),
          h(
            "button",
            {
              type: "button",
              className: "dcm-clear" + (confirmClear ? " is-confirming" : ""),
              onClick: clearDay,
              disabled: selectedItems.length === 0 || clearing || reordering,
              title: confirmClear ? t("confirmClear") : t("clear"),
            },
            TrashIcon({ size: 13 }),
            clearing ? t("clearing") : confirmClear ? t("confirmClear") : t("clear"),
          ),
        ),
        actionError
          ? h(
              "div",
              { className: "dcm-action-error", role: "alert" },
              t("actionFailed") + " · " + actionError,
            )
          : null,
        h("div", { ref: memoScrollRef, className: "dcm-memo-scroll" }, memoList),
        h(
          "div",
          { className: "dcm-composer" },
          h("textarea", {
            ref: composerRef,
            className: "dcm-compose",
            value: draft,
            placeholder: t("composerPlaceholder"),
            "aria-label": t("composerPlaceholder"),
            maxLength: MAX_TEXT,
            onChange: (event) => updateDraft(event.target.value),
            onKeyDown: (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                addMemo()
              }
            },
          }),
          h(
            "div",
            { className: "dcm-compose-foot" },
            h("span", { className: "dcm-compose-hint" }, t("composeHint")),
            h(
              "button",
              {
                type: "button",
                className: "dcm-btn dcm-btn--primary",
                onClick: addMemo,
                disabled: !draft.trim() || adding || reordering,
              },
              PlusIcon({ size: 13 }),
              adding ? t("adding") : t("add"),
            ),
          ),
        ),
      )

      return h(
        "div",
        { className: "dcm-page" },
        h(
          "div",
          { className: "dcm-scroll" },
          h("div", { className: "dcm-content" }, header, h("div", { className: "dcm-layout" }, calendar, editor)),
        ),
      )
    }

    // ----------------------------------------------------------------- plugin
    function installStyle() {
      if (typeof document === "undefined") return () => {}
      const previous = document.getElementById(STYLE_ID)
      if (previous) previous.remove()
      const tag = document.createElement("style")
      tag.id = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => {
        if (tag.parentNode) tag.remove()
      }
    }

    function apply(ctx) {
      const t = ctx.locale.bind(NS)

      ctx.effect(installStyle, "memo-calendar: styles")

      ctx.effect(
        () =>
          ctx.locale.register(NS, {
            zh: ZH,
            en: EN,
          }),
        "memo-calendar: dictionaries",
      )

      ctx.effect(
        () =>
          ctx.slots.inject("main", () =>
            ctx.slots.register(
              {
                name: "main",
                key: PANEL_ID,
                locale: NS,
              },
              MemoCalendarPage,
            ),
          ),
        "memo-calendar: panel",
      )

      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.panellist", () =>
            ctx.slots.register(
              {
                name: "sidebar.panellist",
                id: PANEL_ID,
                order: 20,
                locale: NS,
                label: () => t("panel"),
              },
              CalendarIcon,
            ),
          ),
        "memo-calendar: sidebar entry",
      )
    }

    return {
      inject: ["slots", "locale"],
      apply,
    }
  },
})
