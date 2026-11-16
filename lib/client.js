window.__ModuleLoader__.load({
	id: "dsh-plugin-memo-calendar",
	factory: (require) => {
		"use strict"
		var module = { exports: {} }
		var exports = module.exports

		const react = require("react")
		const h = react.createElement
		const Fragment = react.Fragment

		const NS = "memo-calendar"
		const API = "/dsh-memo/api"
		const TAB_ID = "dsh-plugin-memo-calendar"
		const TAB_KIND = "memo"
		const STYLE_ID = "dsh-memo-calendar-style"

		// ------------------------------------------------------------------ copy
		const zh = {
			title: "备忘录",
			guideTitle: "备忘录",
			guideDescription: "随手记下想法、待办和片段，自动保存在本机",
			search: "搜索笔记…",
			create: "新建笔记",
			empty: "还没有笔记，点右上角的 + 新建一条",
			emptySearch: "没有匹配的笔记",
			loading: "正在加载…",
			loadFailed: "读取失败",
			retry: "重试",
			back: "返回列表",
			untitled: "无标题",
			placeholderTitle: "标题",
			placeholderBody: "在这里写点什么…（自动保存）",
			pin: "置顶",
			unpin: "取消置顶",
			remove: "删除",
			confirmRemove: "确认删除",
			saved: "已保存",
			saving: "保存中…",
			unsaved: "未保存",
			saveFailed: "保存失败",
			pinnedTag: "置顶",
			noteCount: "{count} 条笔记",
			offline: "存储服务没有响应，请确认插件已启用后刷新页面",
		}
		const en = {
			title: "Memos",
			guideTitle: "Memos",
			guideDescription: "Jot down ideas, tasks and snippets; stored on this machine",
			search: "Search notes…",
			create: "New note",
			empty: "No notes yet — use + in the corner to create one",
			emptySearch: "No matching notes",
			loading: "Loading…",
			loadFailed: "Could not load notes",
			retry: "Retry",
			back: "Back to list",
			untitled: "Untitled",
			placeholderTitle: "Title",
			placeholderBody: "Write something… (saved automatically)",
			pin: "Pin",
			unpin: "Unpin",
			remove: "Delete",
			confirmRemove: "Confirm delete",
			saved: "Saved",
			saving: "Saving…",
			unsaved: "Unsaved",
			saveFailed: "Save failed",
			pinnedTag: "Pinned",
			noteCount: "{count} notes",
			offline: "Storage service did not answer; enable the plugin and reload",
		}

		// ------------------------------------------------------------------ http
		async function call(path, options) {
			const init = Object.assign({ cache: "no-store" }, options || {})
			const response = await fetch(API + path, init)
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

		function listNotes() {
			return call("/list")
		}

		function saveNote(note) {
			return call("/save", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(note),
			})
		}

		function removeNote(id) {
			return call("/delete", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id: id }),
			})
		}

		// ----------------------------------------------------------------- style
		const CSS = [
			".mcal-root{display:flex;flex-direction:column;height:100%;min-height:0;font-family:var(--dsw-font-family,system-ui,-apple-system,'Segoe UI',sans-serif);font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);background:transparent}",
			".mcal-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:.5px solid var(--dsw-alias-border-l2);flex:none}",
			".mcal-search{flex:1 1 auto;min-width:0;height:26px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;outline:none}",
			".mcal-search::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".mcal-search:focus{border-color:var(--dsw-alias-brand-primary)}",
			".mcal-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:26px;padding:0 8px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;white-space:nowrap}",
			".mcal-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".mcal-btn:disabled{opacity:.5;cursor:default}",
			".mcal-btn--primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:#fff}",
			".mcal-btn--primary:hover{background:var(--dsw-alias-brand-primary);color:#fff;filter:brightness(1.08)}",
			".mcal-btn--danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
			".mcal-list{flex:1 1 auto;min-height:0;overflow:auto;padding:6px}",
			".mcal-item{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;padding:8px 9px;margin:0 0 2px;border-radius:var(--dsw-radius-sm,8px);border:.5px solid transparent;background:transparent;color:inherit;font:inherit;cursor:pointer}",
			".mcal-item:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".mcal-item[data-active='true']{background:var(--dsw-alias-interactive-bg-active);border-color:var(--dsw-alias-border-l2)}",
			".mcal-item-top{display:flex;align-items:center;gap:5px;min-width:0}",
			".mcal-item-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}",
			".mcal-item-pin{flex:none;color:var(--dsw-alias-brand-primary);display:inline-flex}",
			".mcal-item-snippet{color:var(--dsw-alias-label-secondary);font-size:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;word-break:break-word}",
			".mcal-item-time{color:var(--dsw-alias-label-tertiary);font-size:11px;margin-top:2px}",
			".mcal-hint{padding:16px 12px;text-align:center;color:var(--dsw-alias-label-tertiary)}",
			".mcal-hint--error{color:var(--dsw-alias-state-error-primary)}",
			".mcal-editor{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}",
			".mcal-editor-head{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:.5px solid var(--dsw-alias-border-l2);flex:none}",
			".mcal-grow{flex:1 1 auto}",
			".mcal-title{flex:none;margin:8px 10px 0;background:transparent;border:none;outline:none;color:inherit;font:inherit;font-size:15px;font-weight:600;padding:2px 0}",
			".mcal-title::placeholder{color:var(--dsw-alias-label-tertiary);font-weight:400}",
			".mcal-body{flex:1 1 auto;min-height:0;margin:6px 10px 0;padding:0;background:transparent;border:none;outline:none;resize:none;color:inherit;font:inherit;line-height:1.6;overflow:auto}",
			".mcal-body::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".mcal-foot{flex:none;display:flex;align-items:center;gap:6px;padding:6px 10px;border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".mcal-foot--warn{color:var(--dsw-alias-state-warn-primary)}",
			".mcal-foot--error{color:var(--dsw-alias-state-error-primary)}",
			".mcal-spacer{flex:1 1 auto}",
		].join("")

		function ensureStyle() {
			if (typeof document === "undefined") return
			if (document.getElementById(STYLE_ID)) return
			const tag = document.createElement("style")
			tag.id = STYLE_ID
			tag.textContent = CSS
			document.head.appendChild(tag)
		}

		// ---------------------------------------------------------------- icons
		function svg(size, children) {
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
				children,
			)
		}

		function IconNote(size) {
			return svg(size || 14, [
				h("rect", { key: "r", x: 2.75, y: 2.75, width: 10.5, height: 10.5, rx: 2, stroke: "currentColor", strokeWidth: 1.1 }),
				h("path", { key: "l1", d: "M5.25 6.25h5.5", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round" }),
				h("path", { key: "l2", d: "M5.25 9h3.5", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round" }),
			])
		}

		function IconPlus(size) {
			return svg(size || 14, [
				h("path", { key: "p", d: "M8 3.5v9M3.5 8h9", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
			])
		}

		function IconBack(size) {
			return svg(size || 14, [
				h("path", { key: "p", d: "M9.5 3.5 5 8l4.5 4.5", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
			])
		}

		function IconPin(size) {
			return svg(size || 12, [
				h("path", { key: "p", d: "M9.6 2.6 13.4 6.4l-1.7.5-2.2 2.2-.3 2.1-3.9-3.9 2.1-.3 2.2-2.2z", stroke: "currentColor", strokeWidth: 1.05, strokeLinejoin: "round" }),
				h("path", { key: "s", d: "M5.3 10.7 2.9 13.1", stroke: "currentColor", strokeWidth: 1.05, strokeLinecap: "round" }),
			])
		}

		function IconTrash(size) {
			return svg(size || 13, [
				h("path", { key: "p", d: "M3.2 4.6h9.6M6.4 4.6V3.2h3.2v1.4M4.6 4.6l.6 8.2h5.6l.6-8.2", stroke: "currentColor", strokeWidth: 1.05, strokeLinecap: "round", strokeLinejoin: "round" }),
			])
		}

		/** Guide capsule glyph: rendered as a component by the sidebar guide. */
		function MemoGlyph(props) {
			const size = typeof props === "number" ? props : (props && props.size) || 16
			const className = props && typeof props === "object" ? props.className : undefined
			return h(
				"svg",
				{
					className: className,
					width: size,
					height: size,
					viewBox: "0 0 16 16",
					fill: "none",
					"aria-hidden": "true",
					style: { display: "block" },
				},
				[
					h("rect", { key: "r", x: 2.4, y: 2.4, width: 11.2, height: 11.2, rx: 2.4, stroke: "currentColor", strokeWidth: 1.2 }),
					h("path", { key: "l1", d: "M5.2 6.1h5.6", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
					h("path", { key: "l2", d: "M5.2 9h3.6", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
				],
			)
		}

		// ---------------------------------------------------------------- utils
		function pad(value) {
			return value < 10 ? "0" + value : String(value)
		}

		function shortTime(iso, t) {
			const date = new Date(iso)
			if (Number.isNaN(date.getTime())) return ""
			const now = new Date()
			const sameDay =
				date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
			const yesterday = new Date(now.getTime() - 86400000)
			const isYesterday =
				date.getFullYear() === yesterday.getFullYear() &&
				date.getMonth() === yesterday.getMonth() &&
				date.getDate() === yesterday.getDate()
			const clock = pad(date.getHours()) + ":" + pad(date.getMinutes())
			if (sameDay) return clock
			if (isYesterday) return (t ? "昨天 " : "Yesterday ") + clock
			if (date.getFullYear() === now.getFullYear()) return pad(date.getMonth() + 1) + "/" + pad(date.getDate())
			return date.getFullYear() + "/" + pad(date.getMonth() + 1) + "/" + pad(date.getDate())
		}

		function titleOf(note, t) {
			const title = (note.title || "").trim()
			if (title) return title
			const body = (note.body || "").trim()
			if (body) return body.split("\n")[0].slice(0, 60)
			return t("untitled")
		}

		function snippetOf(note) {
			const body = (note.body || "").trim()
			if (!body) return ""
			const lines = body.split("\n")
			const start = (note.title || "").trim() && lines[0].trim() === (note.title || "").trim() ? 1 : 0
			return lines.slice(start).join(" ").trim().slice(0, 160)
		}

		function sortNotes(notes) {
			return notes.slice().sort((a, b) => {
				if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
				const at = Date.parse(a.updatedAt || a.createdAt || "") || 0
				const bt = Date.parse(b.updatedAt || b.createdAt || "") || 0
				return bt - at
			})
		}

		// ----------------------------------------------------------- components
		function NoteRow(props) {
			const { note, active, t } = props
			const snippet = snippetOf(note)
			return h(
				"button",
				{
					type: "button",
					className: "mcal-item",
					"data-active": active ? "true" : "false",
					onClick: () => props.onOpen(note.id),
				},
				h(
					"span",
					{ className: "mcal-item-top" },
					h("span", { className: "mcal-item-title" }, titleOf(note, t)),
					note.pinned ? h("span", { className: "mcal-item-pin" }, IconPin(12)) : null,
				),
				snippet ? h("span", { className: "mcal-item-snippet" }, snippet) : null,
				h("span", { className: "mcal-item-time" }, shortTime(note.updatedAt || note.createdAt, t)),
			)
		}

		function MemoBody(props) {
			const t = typeof props.t === "function" ? props.t : (key) => zh[key] || key

			ensureStyle()

			const [status, setStatus] = react.useState("loading")
			const [error, setError] = react.useState("")
			const [notes, setNotes] = react.useState([])
			const [query, setQuery] = react.useState("")
			const [selectedId, setSelectedId] = react.useState(null)
			const [draft, setDraft] = react.useState({ title: "", body: "" })
			const [saveState, setSaveState] = react.useState("idle")
			const [saveError, setSaveError] = react.useState("")
			const [confirming, setConfirming] = react.useState(false)

			const titleRef = react.useRef(null)
			const bodyRef = react.useRef(null)
			const draftRef = react.useRef(draft)
			draftRef.current = draft
			const notesRef = react.useRef(notes)
			notesRef.current = notes
			const selectedRef = react.useRef(selectedId)
			selectedRef.current = selectedId
			const dirtyRef = react.useRef(false)

			const load = react.useCallback(() => {
				setStatus("loading")
				setError("")
				listNotes()
					.then((payload) => {
						const list = Array.isArray(payload.notes) ? payload.notes : []
						setNotes(list)
						setStatus("ready")
					})
					.catch((failure) => {
						setError(String((failure && failure.message) || failure))
						setStatus("error")
					})
			}, [])

			react.useEffect(() => {
				load()
			}, [load])

			const selected = selectedId ? notes.find((note) => note.id === selectedId) || null : null

			const openNote = react.useCallback(
				(noteId) => {
					if (noteId === selectedRef.current) return
					if (dirtyRef.current) {
						const current = selectedRef.current
						const value = draftRef.current
						if (current) {
							saveNote({ id: current, title: value.title, body: value.body })
								.then((payload) => {
									const saved = payload && payload.note
									if (!saved) return
									setNotes((previous) => previous.map((note) => (note.id === saved.id ? saved : note)))
								})
								.catch(() => {})
						}
					}
					dirtyRef.current = false
					setSaveState("idle")
					setSaveError("")
					setConfirming(false)
					setSelectedId(noteId)
					const note = notesRef.current.find((item) => item.id === noteId)
					setDraft({ title: (note && note.title) || "", body: (note && note.body) || "" })
				},
				[],
			)

			const backToList = react.useCallback(() => {
				openNote(null)
			}, [openNote])

			const createNote = react.useCallback(() => {
				setStatus((current) => (current === "error" ? "loading" : current))
				saveNote({ title: "", body: "" })
					.then((payload) => {
						const note = payload && payload.note
						if (!note) return
						setNotes((previous) => sortNotes([note].concat(previous)))
						dirtyRef.current = false
						setSaveState("idle")
						setConfirming(false)
						setSelectedId(note.id)
						setDraft({ title: "", body: "" })
						setStatus("ready")
						setTimeout(() => {
							if (titleRef.current) titleRef.current.focus()
						}, 30)
					})
					.catch((failure) => {
						setStatus("error")
						setError(String((failure && failure.message) || failure))
					})
			}, [])

			const persist = react.useCallback(() => {
				const noteId = selectedRef.current
				if (!noteId) return
				const value = draftRef.current
				setSaveState("saving")
				setSaveError("")
				saveNote({ id: noteId, title: value.title, body: value.body })
					.then((payload) => {
						const note = payload && payload.note
						if (note) {
							setNotes((previous) => sortNotes(previous.map((item) => (item.id === note.id ? note : item))))
						}
						if (draftRef.current.title === value.title && draftRef.current.body === value.body) {
							dirtyRef.current = false
							setSaveState("saved")
						}
					})
					.catch((failure) => {
						setSaveState("error")
						setSaveError(String((failure && failure.message) || failure))
					})
			}, [])

			// Debounced autosave: any edit while "dirty" schedules one write.
			react.useEffect(() => {
				if (saveState !== "dirty" || !selectedId) return undefined
				const timer = setTimeout(() => {
					persist()
				}, 600)
				return () => clearTimeout(timer)
			}, [saveState, draft, selectedId, persist])

			// Flush on unmount so a closed tab never drops the last keystrokes.
			react.useEffect(() => {
				return () => {
					if (!dirtyRef.current) return
					const noteId = selectedRef.current
					const value = draftRef.current
					if (!noteId) return
					try {
						const body = JSON.stringify({ id: noteId, title: value.title, body: value.body })
						if (typeof navigator !== "undefined" && navigator.sendBeacon) {
							navigator.sendBeacon(API + "/save", new Blob([body], { type: "application/json" }))
							return
						}
					} catch (failure) {
						// Fall through to fetch.
					}
					saveNote({ id: noteId, title: value.title, body: value.body }).catch(() => {})
				}
			}, [])

			const editTitle = react.useCallback((event) => {
				const value = event.target.value
				dirtyRef.current = true
				setDraft((previous) => ({ title: value, body: previous.body }))
				setSaveState("dirty")
			}, [])

			const editBody = react.useCallback((event) => {
				const value = event.target.value
				dirtyRef.current = true
				setDraft((previous) => ({ title: previous.title, body: value }))
				setSaveState("dirty")
			}, [])

			const togglePin = react.useCallback(() => {
				const noteId = selectedRef.current
				if (!noteId) return
				const current = notesRef.current.find((note) => note.id === noteId)
				if (!current) return
				const pinned = !current.pinned
				setNotes((previous) => sortNotes(previous.map((note) => (note.id === noteId ? Object.assign({}, note, { pinned }) : note))))
				saveNote({ id: noteId, pinned })
					.then((payload) => {
						const saved = payload && payload.note
						if (!saved) return
						setNotes((previous) => sortNotes(previous.map((note) => (note.id === saved.id ? saved : note))))
					})
					.catch(() => {
						setNotes((previous) => sortNotes(previous.map((note) => (note.id === noteId ? Object.assign({}, note, { pinned: !pinned }) : note))))
					})
			}, [])

			const removeSelected = react.useCallback(() => {
				const noteId = selectedRef.current
				if (!noteId) return
				if (!confirming) {
					setConfirming(true)
					setTimeout(() => setConfirming(false), 3000)
					return
				}
				setConfirming(false)
				dirtyRef.current = false
				removeNote(noteId)
					.then(() => {
						setNotes((previous) => previous.filter((note) => note.id !== noteId))
						setSelectedId(null)
						setSaveState("idle")
					})
					.catch((failure) => {
						setSaveState("error")
						setSaveError(String((failure && failure.message) || failure))
					})
			}, [confirming])

			const filtered = react.useMemo(() => {
				const needle = query.trim().toLowerCase()
				const base = sortNotes(notes)
				if (!needle) return base
				return base.filter((note) => {
					const haystack = ((note.title || "") + "\n" + (note.body || "")).toLowerCase()
					return haystack.indexOf(needle) >= 0
				})
			}, [notes, query])

			// --------------------------------------------------------- list view
			function renderList() {
				const head = h(
					"div",
					{ className: "mcal-head", key: "head" },
					h("input", {
						className: "mcal-search",
						value: query,
						placeholder: t("search"),
						"aria-label": t("search"),
						onChange: (event) => setQuery(event.target.value),
						onKeyDown: (event) => {
							if (event.key === "Escape") setQuery("")
						},
					}),
					h(
						"button",
						{
							type: "button",
							className: "mcal-btn mcal-btn--primary",
							title: t("create"),
							onClick: createNote,
						},
						IconPlus(13),
						t("create"),
					),
				)

				if (status === "loading") {
					return h(Fragment, { key: "loading" }, head, h("div", { className: "mcal-hint" }, t("loading")))
				}

				if (status === "error") {
					return h(
						Fragment,
						{ key: "error" },
						head,
						h(
							"div",
							{ className: "mcal-hint mcal-hint--error" },
							h("div", null, t("loadFailed")),
							h("div", { style: { fontSize: 11, marginTop: 4, wordBreak: "break-word" } }, error || t("offline")),
							h(
								"button",
								{ type: "button", className: "mcal-btn", style: { marginTop: 8 }, onClick: load },
								t("retry"),
							),
						),
					)
				}

				if (!filtered.length) {
					return h(
						Fragment,
						{ key: "empty" },
						head,
						h("div", { className: "mcal-hint" }, query.trim() ? t("emptySearch") : t("empty")),
					)
				}

				return h(
					Fragment,
					{ key: "list" },
					head,
					h(
						"div",
						{ className: "mcal-list" },
						filtered.map((note) =>
							h(NoteRow, {
								key: note.id,
								note: note,
								active: note.id === selectedId,
								t: t,
								onOpen: openNote,
							}),
						),
					),
					h("div", { className: "mcal-foot" }, String(filtered.length) + " / " + String(notes.length)),
				)
			}

			// ------------------------------------------------------- editor view
			function renderEditor() {
				const note = selected || {}
				const saveLabel =
					saveState === "saving"
						? t("saving")
						: saveState === "saved"
							? t("saved") + (note.updatedAt ? " · " + shortTime(note.updatedAt, t) : "")
							: saveState === "dirty"
								? t("unsaved")
								: saveState === "error"
									? t("saveFailed")
									: ""
				const footClass =
					"mcal-foot" + (saveState === "error" ? " mcal-foot--error" : saveState === "dirty" ? " mcal-foot--warn" : "")

				return h(
					Fragment,
					{ key: "editor" },
					h(
						"div",
						{ className: "mcal-editor-head" },
						h(
							"button",
							{ type: "button", className: "mcal-btn", title: t("back"), onClick: backToList },
							IconBack(13),
							t("back"),
						),
						h("span", { className: "mcal-grow" }),
						h(
							"button",
							{
								type: "button",
								className: "mcal-btn",
								title: note.pinned ? t("unpin") : t("pin"),
								"data-pinned": note.pinned ? "true" : "false",
								style: note.pinned ? { color: "var(--dsw-alias-brand-primary)" } : undefined,
								onClick: togglePin,
							},
							IconPin(12),
							note.pinned ? t("unpin") : t("pin"),
						),
						h(
							"button",
							{
								type: "button",
								className: "mcal-btn" + (confirming ? " mcal-btn--danger" : ""),
								title: t("remove"),
								onClick: removeSelected,
							},
							IconTrash(12),
							confirming ? t("confirmRemove") : t("remove"),
						),
					),
					h("input", {
						ref: titleRef,
						className: "mcal-title",
						value: draft.title,
						placeholder: t("placeholderTitle"),
						"aria-label": t("placeholderTitle"),
						onChange: editTitle,
					}),
					h("textarea", {
						ref: bodyRef,
						className: "mcal-body",
						value: draft.body,
						placeholder: t("placeholderBody"),
						"aria-label": t("placeholderBody"),
						spellCheck: false,
						onChange: editBody,
					}),
					h(
						"div",
						{ className: footClass },
						saveState === "error" ? h("span", { title: saveError }, saveLabel) : h("span", null, saveLabel),
						h("span", { className: "mcal-spacer" }),
						h("span", null, shortTime(note.updatedAt || new Date().toISOString(), t)),
					),
				)
			}

			return h("div", { className: "mcal-root" }, selectedId ? renderEditor() : renderList())
		}

		function MemoTitle(props) {
			const t = typeof props.t === "function" ? props.t : (key) => zh[key] || key
			return h(
				"span",
				{ style: { display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 } },
				h("span", { style: { display: "inline-flex", color: "var(--dsw-alias-label-secondary)" } }, IconNote(13)),
				h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t("title")),
			)
		}

		// --------------------------------------------------------------- plugin
		const inject = ["slots", "locale", "sidebarRightTabs"]

		function apply(ctx) {
			ctx.effect(
				() =>
					ctx.locale.register(NS, {
						zh: zh,
						en: en,
					}),
				"memo-calendar: dictionaries",
			)

			const t = ctx.locale.bind(NS)

			// The tab type: one memo tab per session, listed under the sidebar "+" guide.
			ctx.effect(
				() =>
					ctx.sidebarRightTabs.register({
						id: TAB_ID,
						kind: TAB_KIND,
						multiple: false,
						title: () => t("title"),
						guide: [
							{
								id: "memo",
								order: 30,
								title: () => t("guideTitle"),
								description: () => t("guideDescription"),
								icon: MemoGlyph,
							},
						],
					}),
				"memo-calendar: tab type",
			)

			// Body seat: the notes UI itself.
			ctx.effect(
				() =>
					ctx.slots.inject("sidebar.right.pane.tab", () =>
						ctx.slots.register(
							{
								name: "sidebar.right.pane.tab",
								key: TAB_ID,
								locale: NS,
								inject: () => ({}),
							},
							MemoBody,
						),
					),
				"memo-calendar: body",
			)

			// Title seat: the tab chip.
			ctx.effect(
				() =>
					ctx.slots.inject("sidebar.right.pane.tab.title", () =>
						ctx.slots.register(
							{
								name: "sidebar.right.pane.tab.title",
								key: TAB_ID,
								locale: NS,
								inject: () => ({}),
							},
							MemoTitle,
						),
					),
				"memo-calendar: title",
			)
		}

		exports.apply = apply
		exports.inject = inject
		return module.exports
	},
})
