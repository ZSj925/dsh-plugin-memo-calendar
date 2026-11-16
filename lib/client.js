window.__ModuleLoader__.load({
  id: "dsh-plugin-memo-calendar",
  factory(require) {
    "use strict"

    const React = require("react")
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const NS = "memo-calendar"
    const PANEL_ID = "memo-calendar"
    const API = "/dsh-memo/api"
    const STYLE_ID = "dsh-plugin-memo-calendar-style-v2"
    const SAVE_DELAY = 700
    const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    const WEEKDAY_COLUMNS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    const ZH = {
      panel: "备忘录",
      title: "日历备忘录",
      subtitle: "每一天，都有自己的记录。内容自动保存在本机。",
      today: "今天",
      todayBadge: "今天",
      prevMonth: "上个月",
      nextMonth: "下个月",
      calendarLabel: "月历",
      editorLabel: "当日备忘录",
      hint: "点击日期开始记录",
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
      placeholder: "记下今天发生的事、想法或待办…\n内容会自动保存在本机。",
      clear: "清空本日",
      confirmClear: "确认清空",
      hasEntry: "有记录",
      noMemo: "还没有记录",
      saving: "保存中…",
      unsaved: "未保存",
      saved: "已保存",
      savedAt: "已保存 {time}",
      saveFailed: "保存失败",
      deleteFailed: "清空失败",
      monthEmpty: "本月还没有记录",
      monthSummary: "本月 {count} 天有记录",
      totalSummary: "共 {count} 天",
      characterCount: "{count} 字",
    }

    const EN = {
      panel: "Memos",
      title: "Calendar memos",
      subtitle: "A page for every day, saved automatically on this machine.",
      today: "Today",
      todayBadge: "Today",
      prevMonth: "Previous month",
      nextMonth: "Next month",
      calendarLabel: "Month calendar",
      editorLabel: "Daily memo",
      hint: "Click a day to write",
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
      placeholder: "Write down what happened, an idea, or a task for today…\nIt is saved automatically on this machine.",
      clear: "Clear day",
      confirmClear: "Confirm clear",
      hasEntry: "has a memo",
      noMemo: "No memo yet",
      saving: "Saving…",
      unsaved: "Unsaved",
      saved: "Saved",
      savedAt: "Saved {time}",
      saveFailed: "Save failed",
      deleteFailed: "Clear failed",
      monthEmpty: "No memos this month",
      monthSummary: "{count} days recorded this month",
      totalSummary: "{count} days in total",
      characterCount: "{count} characters",
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
      return String(template == null ? "" : template).replace(/\{(\w+)\}/g, (match, key) =>
        Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
      )
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

    function withText(entries, date, text) {
      const next = Object.assign({}, entries)
      if (String(text).trim() === "") {
        delete next[date]
      } else {
        const stamp = new Date().toISOString()
        const previous = entries[date]
        next[date] = {
          text,
          createdAt: (previous && previous.createdAt) || stamp,
          updatedAt: stamp,
        }
      }
      return next
    }

    function sameEntryText(entries, date, text) {
      const current = entries[date]
      if (!current) return String(text).trim() === ""
      return current.text === text
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

    // -------------------------------------------------------------------- css
    const CSS = `
      .dcm-page{width:100%;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.6}
      .dcm-scroll{height:100%;min-height:0;overflow:auto;scrollbar-gutter:stable}
      .dcm-content{box-sizing:border-box;max-width:1180px;margin:0 auto;padding:26px clamp(18px,3.4vw,42px) 40px}
      .dcm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px}
      .dcm-head-main{display:flex;align-items:center;gap:14px;min-width:0}
      .dcm-mark{flex:none;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
      .dcm-head h1{margin:0;font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-.02em}
      .dcm-head p{margin:3px 0 0;font-size:12.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
      .dcm-head-actions{flex:none;display:flex;align-items:center;gap:8px}
      .dcm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 12px;border-radius:10px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:1;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s,color .15s}
      .dcm-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
      .dcm-btn:disabled{opacity:.45;cursor:default}
      .dcm-btn:focus-visible,.dcm-icon-btn:focus-visible,.dcm-day:focus-visible,.dcm-clear:focus-visible,.dcm-link:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .dcm-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(320px,.9fr);gap:18px;align-items:stretch}
      .dcm-card{box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);border-radius:18px}
      .dcm-calendar{min-width:0;padding:16px 16px 12px}
      .dcm-cal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .dcm-month-nav{display:flex;align-items:center;gap:4px;min-width:0}
      .dcm-month{margin:0;padding:0 2px;font-size:16px;line-height:1.4;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
      .dcm-hint{color:var(--dsw-alias-label-tertiary);font-size:11.5px;white-space:nowrap}
      .dcm-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex:none;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
      .dcm-icon-btn:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-primary)}
      .dcm-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;padding:0 0 6px}
      .dcm-weekday{text-align:center;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:500;letter-spacing:.03em}
      .dcm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
      .dcm-day{position:relative;min-width:0;min-height:84px;box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;gap:3px;text-align:left;padding:7px 8px;border-radius:11px;border:1px solid transparent;background:transparent;color:inherit;font:inherit;cursor:pointer;transition:background .12s,border-color .12s}
      @media (hover:hover){.dcm-day:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}}
      .dcm-day[data-outside="true"]{opacity:.42}
      .dcm-day[data-selected="true"]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
      .dcm-day[data-selected="true"][data-outside="true"]{opacity:.8}
      .dcm-day[data-today="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
      .dcm-day[data-today="true"][data-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}
      .dcm-day-top{display:flex;align-items:center;justify-content:space-between;gap:4px;min-height:19px}
      .dcm-day-num{font-size:12.5px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-primary)}
      .dcm-day[data-outside="true"] .dcm-day-num{color:var(--dsw-alias-label-tertiary)}
      .dcm-day[data-today="true"] .dcm-day-num{display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;padding:0 4px;border-radius:7px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:700}
      .dcm-day-markers{display:inline-flex;align-items:center;gap:4px;flex:none}
      .dcm-today-tag{display:inline-flex;align-items:center;height:16px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);color:var(--dsw-alias-brand-primary);font-size:9.5px;font-weight:600;letter-spacing:.02em}
      .dcm-day-dot{width:5px;height:5px;flex:none;border-radius:50%;background:var(--dsw-alias-brand-primary)}
      .dcm-day-preview{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px;line-height:1.45;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-wrap}
      .dcm-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding:9px 4px 0;border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:11.5px}
      .dcm-sep{color:var(--dsw-alias-border-l2)}
      .dcm-editor{display:flex;flex-direction:column;min-width:0;min-height:420px;padding:18px}
      .dcm-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      .dcm-editor-eyebrow{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:1.5}
      .dcm-badge{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:999px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);font-size:10.5px;font-weight:500}
      .dcm-editor-date{margin:2px 0 0;font-size:19px;line-height:1.4;font-weight:600;letter-spacing:-.01em}
      .dcm-clear{display:inline-flex;align-items:center;gap:4px;flex:none;height:28px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
      .dcm-clear:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary)}
      .dcm-clear.is-confirming{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
      .dcm-clear:disabled{opacity:.4;cursor:default;background:transparent}
      .dcm-textarea{box-sizing:border-box;flex:1 1 auto;width:100%;min-height:300px;margin:14px 0 0;padding:13px 14px;border-radius:13px;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;line-height:1.75;resize:none;outline:none;transition:border-color .15s,box-shadow .15s}
      .dcm-textarea::placeholder{color:var(--dsw-alias-label-tertiary)}
      .dcm-textarea:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
      .dcm-editor-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;min-height:20px;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
      .dcm-status-row{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
      .dcm-status{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-tertiary)}
      .dcm-status.is-dirty{color:var(--dsw-alias-label-secondary)}
      .dcm-status.is-error{color:var(--dsw-alias-state-error-primary)}
      .dcm-status::before{content:"";width:5px;height:5px;flex:none;border-radius:50%;background:currentColor}
      .dcm-count{flex:none;font-variant-numeric:tabular-nums}
      .dcm-link{border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11.5px;padding:0;cursor:pointer}
      .dcm-error{margin:8px 0 0;color:var(--dsw-alias-state-error-primary);font-size:11.5px;line-height:1.5;overflow-wrap:anywhere}
      .dcm-state-box{margin-top:34px;padding:48px 24px;border:.5px solid var(--dsw-alias-border-l1);border-radius:18px;background:var(--dsw-alias-bg-layer-1);text-align:center;color:var(--dsw-alias-label-tertiary)}
      .dcm-state-box h2{margin:0 0 6px;color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600}
      .dcm-state-box p{margin:0;font-size:12.5px;line-height:1.6;overflow-wrap:anywhere}
      .dcm-state-box .dcm-btn{margin-top:16px}
      .dcm-state-box.is-error h2{color:var(--dsw-alias-state-error-primary)}
      .dcm-spinner{width:22px;height:22px;margin:0 auto 12px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dcm-spin .8s linear infinite}
      @keyframes dcm-spin{to{transform:rotate(360deg)}}
      @media (max-width:980px){
        .dcm-layout{grid-template-columns:1fr}
        .dcm-editor{min-height:380px}
        .dcm-textarea{min-height:260px}
      }
      @media (max-width:640px){
        .dcm-content{padding:18px 12px 28px}
        .dcm-head{gap:10px;margin-bottom:14px}
        .dcm-head h1{font-size:19px}
        .dcm-head p{display:none}
        .dcm-mark{width:38px;height:38px;border-radius:12px}
        .dcm-hint{display:none}
        .dcm-calendar{padding:12px 10px 10px}
        .dcm-day{min-height:58px;padding:5px 6px;border-radius:9px}
        .dcm-day-preview{display:none}
        .dcm-today-tag{display:none}
        .dcm-month{font-size:15px}
        .dcm-editor{padding:14px}
        .dcm-textarea{min-height:240px}
        .dcm-summary{font-size:11px}
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
      const [draft, setDraft] = useState("")
      const [dirty, setDirty] = useState(false)
      const [saveState, setSaveState] = useState("idle")
      const [saveError, setSaveError] = useState("")
      const [errorAction, setErrorAction] = useState("save")
      const [confirmClear, setConfirmClear] = useState(false)

      const entriesRef = useRef(entries)
      const selectedRef = useRef(selectedDate)
      const draftRef = useRef(draft)
      const dirtyRef = useRef(false)
      const saveSeq = useRef(0)
      const saveQueue = useRef(Promise.resolve())
      entriesRef.current = entries
      selectedRef.current = selectedDate
      draftRef.current = draft

      const load = useCallback(() => {
        setStatus("loading")
        setLoadError("")
        requestJson("/list")
          .then((payload) => {
            const next = payload && payload.entries && typeof payload.entries === "object" ? payload.entries : {}
            setEntries(next)
            setStatus("ready")
          })
          .catch((failure) => {
            setLoadError(String((failure && failure.message) || failure))
            setStatus("error")
          })
      }, [])

      useEffect(() => {
        load()
      }, [load])

      useEffect(() => {
        if (status !== "ready") return
        const entry = entriesRef.current[selectedDate]
        const next = entry && typeof entry.text === "string" ? entry.text : ""
        draftRef.current = next
        setDraft(next)
        dirtyRef.current = false
        setDirty(false)
        setSaveState("idle")
        setSaveError("")
        setConfirmClear(false)
      }, [selectedDate, status])

      useEffect(() => {
        if (!confirmClear) return undefined
        const timer = setTimeout(() => setConfirmClear(false), 3500)
        return () => clearTimeout(timer)
      }, [confirmClear])

      const commit = useCallback((date, text) => {
        const seq = saveSeq.current + 1
        saveSeq.current = seq
        if (date === selectedRef.current) {
          setSaveState("saving")
          setSaveError("")
        }
        const run = () =>
          requestJson("/save", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date, text }),
          })
        const queued = saveQueue.current.then(run, run)
        saveQueue.current = queued.catch(() => {})
        return queued
          .then((payload) => {
            const entry = payload && payload.entry ? payload.entry : null
            const removed = payload && payload.removed === true
            setEntries((previous) => {
              if (!sameEntryText(previous, date, text)) return previous
              const next = Object.assign({}, previous)
              if (entry) next[date] = entry
              else if (removed) delete next[date]
              return next
            })
            if (seq !== saveSeq.current) return
            if (date === selectedRef.current) {
              if (draftRef.current === text) {
                dirtyRef.current = false
                setDirty(false)
                setSaveState("saved")
              }
            }
          })
          .catch((failure) => {
            if (seq !== saveSeq.current) return
            if (date === selectedRef.current) {
              setErrorAction("save")
              setSaveState("error")
              setSaveError(String((failure && failure.message) || failure))
            }
          })
      }, [])

      useEffect(() => {
        if (!dirty) return undefined
        const timer = setTimeout(() => {
          commit(selectedRef.current, draftRef.current)
        }, SAVE_DELAY)
        return () => clearTimeout(timer)
      }, [dirty, draft, commit])

      // Flush the last keystrokes when the panel unmounts or the page closes.
      useEffect(() => {
        const flush = () => {
          if (!dirtyRef.current) return
          const date = selectedRef.current
          const text = draftRef.current
          dirtyRef.current = false
          try {
            const body = JSON.stringify({ date, text })
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
              navigator.sendBeacon(API + "/save", new Blob([body], { type: "application/json" }))
              return
            }
          } catch (error) {
            // Fall through to fetch.
          }
          fetch(API + "/save", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date, text }),
            keepalive: true,
          }).catch(() => {})
        }
        const onUnload = () => flush()
        window.addEventListener("beforeunload", onUnload)
        return () => {
          window.removeEventListener("beforeunload", onUnload)
          flush()
        }
      }, [])

      const flushDraft = useCallback(() => {
        if (!dirtyRef.current) return
        const date = selectedRef.current
        const text = draftRef.current
        dirtyRef.current = false
        setDirty(false)
        commit(date, text)
      }, [commit])

      const selectDate = useCallback(
        (key, nextView) => {
          if (key === selectedRef.current) {
            if (nextView) setView(nextView)
            return
          }
          flushDraft()
          setSelectedDate(key)
          if (nextView) setView(nextView)
        },
        [flushDraft],
      )

      const goMonth = useCallback((delta) => {
        setView((previous) => {
          const next = new Date(previous.year, previous.month + delta, 1)
          return { year: next.getFullYear(), month: next.getMonth() }
        })
      }, [])

      const goToday = useCallback(() => {
        const now = new Date()
        selectDate(dateKey(now), { year: now.getFullYear(), month: now.getMonth() })
      }, [selectDate])

      const onDraftChange = useCallback((event) => {
        const text = event.target.value
        const date = selectedRef.current
        draftRef.current = text
        setDraft(text)
        dirtyRef.current = true
        setDirty(true)
        setSaveState("dirty")
        setSaveError("")
        setEntries((previous) => withText(previous, date, text))
      }, [])

      const retrySave = useCallback(() => {
        commit(selectedRef.current, draftRef.current)
      }, [commit])

      const clearDay = useCallback(() => {
        const date = selectedRef.current
        const current = entriesRef.current[date]
        const canClear = draftRef.current.trim() !== "" || Boolean(current && current.text.trim())
        if (!canClear) return
        if (!confirmClear) {
          setConfirmClear(true)
          return
        }
        setConfirmClear(false)
        const textAtClear = draftRef.current
        saveSeq.current += 1
        dirtyRef.current = false
        setDirty(false)
        setSaveError("")
        setSaveState("saving")
        const run = async () => {
          const response = await fetch(API + "/delete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date }),
          })
          let body = null
          try {
            body = await response.json()
          } catch (error) {
            body = null
          }
          if (!response.ok) throw new Error(body && body.error ? body.error : "HTTP " + response.status)
          return body || {}
        }
        const queued = saveQueue.current.then(run, run)
        saveQueue.current = queued.catch(() => {})
        queued
          .then(() => {
            setEntries((previous) => {
              if (!sameEntryText(previous, date, textAtClear)) return previous
              const next = Object.assign({}, previous)
              delete next[date]
              return next
            })
            if (date === selectedRef.current) {
              if (draftRef.current === textAtClear) {
                draftRef.current = ""
                setDraft("")
                setSaveState("idle")
              } else {
                setSaveState("dirty")
              }
            }
          })
          .catch((failure) => {
            if (date === selectedRef.current) {
              setErrorAction("delete")
              setSaveState("error")
              setSaveError(String((failure && failure.message) || failure))
            }
          })
      }, [confirmClear])

      const todayKey = dateKey(new Date())
      const cells = useMemo(() => buildCalendar(view.year, view.month), [view.year, view.month])
      const monthPrefix = view.year + "-" + pad2(view.month + 1) + "-"
      const monthCount = Object.keys(entries).filter(
        (key) => key.startsWith(monthPrefix) && entries[key] && String(entries[key].text || "").trim() !== "",
      ).length
      const totalCount = Object.keys(entries).filter(
        (key) => entries[key] && String(entries[key].text || "").trim() !== "",
      ).length

      const selected = parseDateKey(selectedDate)
      const selectedWeekday = t("weekdayLong." + WEEKDAY_KEYS[selected.getDay()])
      const selectedLabel = format(t("longDate"), {
        month: t("month." + (selected.getMonth() + 1)),
        day: selected.getDate(),
      })
      const selectedIsToday = selectedDate === todayKey
      const selectedEntry = entries[selectedDate]
      const selectedCanClear = draft.trim() !== "" || Boolean(selectedEntry && selectedEntry.text.trim())
      const statusLabel =
        saveState === "saving"
          ? t("saving")
          : saveState === "error"
            ? errorAction === "delete"
              ? t("deleteFailed")
              : t("saveFailed")
            : dirty
              ? t("unsaved")
              : selectedEntry && selectedEntry.updatedAt
                ? format(t("savedAt"), { time: formatClock(selectedEntry.updatedAt) })
                : saveState === "saved"
                  ? t("saved")
                  : t("noMemo")
      const statusClass =
        "dcm-status" + (saveState === "error" ? " is-error" : dirty || saveState === "saving" ? " is-dirty" : "")
      const monthLabel = format(t("monthTitle"), {
        year: view.year,
        month: t("month." + (view.month + 1)),
      })

      const header = h(
        "header",
        { className: "dcm-head" },
        h(
          "div",
          { className: "dcm-head-main" },
          h("span", { className: "dcm-mark" }, CalendarIcon(24)),
          h(
            "div",
            null,
            h("h1", null, t("title")),
            h("p", null, t("subtitle")),
          ),
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
        { className: "dcm-card dcm-calendar", "aria-label": t("calendarLabel") },
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
                onClick: () => goMonth(-1),
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
                onClick: () => goMonth(1),
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
            const entry = entries[cell.key]
            const hasEntry = Boolean(entry && String(entry.text || "").trim() !== "")
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
                "data-entry": hasEntry ? "true" : undefined,
                "aria-pressed": selectedCell,
                "aria-current": isToday ? "date" : undefined,
                "aria-label": dateLabel + " " + weekdayLabel + (hasEntry ? "，" + t("hasEntry") : ""),
                title: hasEntry ? previewOf(entry.text) : dateLabel,
                onClick: () => selectDate(cell.key, outside ? { year: cell.year, month: cell.month } : null),
              },
              h(
                "span",
                { className: "dcm-day-top" },
                h("span", { className: "dcm-day-num" }, String(cell.day)),
                isToday || hasEntry
                  ? h(
                      "span",
                      { className: "dcm-day-markers" },
                      isToday ? h("span", { className: "dcm-today-tag" }, t("todayBadge")) : null,
                      hasEntry ? h("span", { className: "dcm-day-dot", "aria-hidden": "true" }) : null,
                    )
                  : null,
              ),
              hasEntry ? h("span", { className: "dcm-day-preview" }, previewOf(entry.text)) : null,
            )
          }),
        ),
        h(
          "div",
          { className: "dcm-summary" },
          h(
            "span",
            null,
            monthCount === 0 ? t("monthEmpty") : format(t("monthSummary"), { count: monthCount }),
          ),
          h("span", { className: "dcm-sep", "aria-hidden": "true" }, "·"),
          h("span", null, format(t("totalSummary"), { count: totalCount })),
        ),
      )

      const editor = h(
        "section",
        { className: "dcm-card dcm-editor", "aria-label": t("editorLabel") },
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
              disabled: !selectedCanClear,
              title: confirmClear ? t("confirmClear") : t("clear"),
            },
            TrashIcon({ size: 13 }),
            confirmClear ? t("confirmClear") : t("clear"),
          ),
        ),
        h("textarea", {
          className: "dcm-textarea",
          value: draft,
          placeholder: t("placeholder"),
          "aria-label": t("placeholder"),
          spellCheck: false,
          onChange: onDraftChange,
          onKeyDown: (event) => {
            if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === "s") {
              event.preventDefault()
              commit(selectedRef.current, draftRef.current)
            }
          },
        }),
        h(
          "div",
          { className: "dcm-editor-foot" },
          h(
            "div",
            { className: "dcm-status-row" },
            h("span", { className: statusClass, "aria-live": "polite" }, statusLabel),
            saveState === "error" && errorAction === "save"
              ? h("button", { type: "button", className: "dcm-link", onClick: retrySave }, t("retry"))
              : null,
          ),
          h("span", { className: "dcm-count" }, format(t("characterCount"), { count: draft.length })),
        ),
        saveState === "error"
          ? h("p", { className: "dcm-error", role: "alert" }, saveError || t("saveFailed"))
          : null,
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
