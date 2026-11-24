import PreviewStudio from "./PreviewStudio";
import DevicePicker from "./DevicePicker";
import { deviceFor, deviceLabel } from "./devices";
import { useState, useEffect, useRef } from "react";
import {
  MousePointer2,
  Hand,
  Undo2,
  Redo2,
  Clock,
  Calendar,
  Heart,
  Image,
  RotateCw,
  Type,
  Square,
  Circle,
  Minus,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Copy,
  Folder,
  Settings,
  ArrowLeft,
  Download,
  Upload,
  Play,
  Code2,
  Hammer,
  ChevronDown,
  Sun,
  Moon,
  MoveHorizontal,
  Check,
  X,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  project as createProject,
  layer,
  uid,
  metrics,
  validateProject,
  type Project,
  type Layer,
  type Kind,
  type Profile,
  type CodeFile,
} from "./domain";
import {
  StorageConflict,
  storageMessage,
  loadProjects,
  saveProject,
  removeProject,
  readProfiles,
  download,
} from "./storage";
import { generate } from "./api";
import Models from "./Models";
import { loadReferences, isReference, copyReference } from "./builtins";
import Scene, { type Preview } from "./Scene";
const tools = [
  ["time", "时间", Clock],
  ["date", "日期", Calendar],
  ["metric", "数据", Heart],
  ["image", "图片", Image],
  ["ring", "圆环", RotateCw],
  ["rect", "矩形", Square],
  ["text", "文字", Type],
  ["circle", "圆形", Circle],
  ["line", "直线", Minus],
] as const;
export default function App() {
  const [newProject, setNewProject] = useState<{
    name: string;
    blank: boolean;
  } | null>(null);
  const [page, setPage] = useState("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [p, setP] = useState<Project | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("");
  const [profiles, setProfiles] = useState(readProfiles);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const bases = useRef(new Map<string, number>());
  const saveQueue = useRef(Promise.resolve());
  const persisted = useRef<Project | null>(null);
  const halted = useRef(new Set<string>());
  const activeProject = useRef(p);
  activeProject.current = p;
  const [aod, setAod] = useState(false);
  const [zoom, setZoom] = useState(125);
  const [preview, setPreview] = useState<Preview>({
    time: "09:41",
    heartRate: 72,
    steps: 8642,
    battery: 78,
    seconds: 24,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [leftTab, setLeftTab] = useState("控件");
  const [drawer, setDrawer] = useState("");
  const [busy, setBusy] = useState(false);
  const [buildId, setBuildId] = useState("");
  const [artifacts, setArtifacts] = useState<
    { id: string; url: string; fileName?: string }[]
  >([]);
  const [logs, setLogs] = useState("编译服务尚未连接。生成代码后可提交编译。");
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [fileIndex, setFileIndex] = useState(0);
  const [genRevision, setGenRevision] = useState(-1);
  const [instruction, setInstruction] = useState(
    "按当前画布生成完整表盘，保留数据绑定和息屏布局。",
  );
  const [search, setSearch] = useState("");
  const [past, setPast] = useState<Layer[][]>([]);
  const [future, setFuture] = useState<Layer[][]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    original: Layer;
    before: Layer[];
    resize: boolean;
  } | null>(null);
  const current = p?.layers.find((l) => l.id === selected);
  useEffect(() => {
    loadProjects()
      .then(async (items) => {
        try {
          const references = await loadReferences();
          items = [...references, ...items.filter((x) => !isReference(x))];
        } catch (error) {
          setNotice((error as Error).message);
        }
        setProjects(items);
        if (items.length) {
          const active = items.find(
            (x) => x.id === localStorage.getItem("gfc-active"),
          );
          if (active && !isReference(active)) {
            bases.current.set(active.id, active.storageVersion ?? 0);
            persisted.current = active;
            setSaved("已保存到本机");
            setP(active);
          }
        }
        setReady(true);
      })
      .catch((e) => {
        setNotice("无法读取本地项目：" + e.message);
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (!p || !ready || halted.current.has(p.id) || persisted.current === p)
      return;
    setSaved("保存中…");
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (halted.current.has(p.id)) return;
        try {
          const version = await saveProject(
            p,
            bases.current.get(p.id) ?? p.storageVersion ?? 0,
          );
          bases.current.set(p.id, version);
          persisted.current = p;
          setProjects((items) => [
            { ...p, storageVersion: version },
            ...items.filter((x) => x.id !== p.id),
          ]);
          if (activeProject.current === p) {
            setSaved("已保存到本机");
            setSaveError("");
          }
          try {
            localStorage.setItem("gfc-active", p.id);
          } catch {
            /* IndexedDB save succeeded independently. */
          }
        } catch (error) {
          halted.current.add(p.id);
          if (activeProject.current?.id === p.id) {
            setSaved("保存失败，请导出备份");
            setSaveError(storageMessage(error));
            setConflict(error instanceof StorageConflict);
          }
        }
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [p, ready, saveAttempt]);
  async function resolveSave(action: "load" | "copy" | "cancel" | "retry") {
    if (!p) return;
    if (action === "cancel") {
      setConflict(false);
      return;
    }
    if (action === "retry") {
      halted.current.delete(p.id);
      setSaveError("");
      setSaveAttempt((x) => x + 1);
      return;
    }
    try {
      if (action === "load") {
        if (
          !confirm(
            "加载最新版本将替换当前页面未保存的修改，是否继续？建议先导出备份。",
          )
        )
          return;
        const latest = (await loadProjects()).find((x) => x.id === p.id);
        if (!latest) throw Error("项目已被删除，可另存为冲突副本。");
        halted.current.delete(p.id);
        persisted.current = p;
        open(latest);
      } else {
        const copy = {
          ...structuredClone(p),
          id: uid(),
          appId: uid().replaceAll("-", ""),
          name: p.name + " 冲突副本",
          updated: Date.now(),
          storageVersion: 0,
          files: [],
          versions: [],
          codeRevision: -1,
        };
        copy.storageVersion = await saveProject(copy);
        setProjects((items) => [copy, ...items]);
        halted.current.delete(p.id);
        persisted.current = p;
        open(copy);
        setNotice("已保留设计为独立副本，请重新生成代码后编译。");
      }
      setSaveError("");
      setConflict(false);
    } catch (error) {
      setSaveError(storageMessage(error));
    }
  }
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (saved === "保存中…" || saved.startsWith("保存失败")) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [saved]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function editLayers(layers: Layer[], record = true) {
    if (!p) return;
    if (record) {
      setPast((x) => [...x.slice(-49), structuredClone(p.layers)]);
      setFuture([]);
    }
    setP({ ...p, layers, revision: p.revision + 1, updated: Date.now() });
  }
  function patch(v: Partial<Layer>) {
    if (p && current)
      editLayers(p.layers.map((l) => (l.id === selected ? { ...l, ...v } : l)));
  }
  function undo(redo = false) {
    if (!p) return;
    const from = redo ? future : past;
    if (!from.length) return;
    const layers = from[from.length - 1];
    if (redo) {
      setPast([...past, p.layers]);
      setFuture(future.slice(0, -1));
    } else {
      setFuture([...future, p.layers]);
      setPast(past.slice(0, -1));
    }
    setP({ ...p, layers, revision: p.revision + 1, updated: Date.now() });
  }
  function open(item: Project) {
    if (p && item.id !== p.id && persisted.current !== p) {
      setNotice("当前项目有未保存修改，请先完成保存或使用恢复选项并导出备份。");
      return;
    }
    if (isReference(item)) {
      const existing = projects.filter((x) =>
        x.name.startsWith(item.name + " 副本"),
      ).length;
      const copy = copyReference(
        item,
        item.name + " 副本" + (existing ? " " + (existing + 1) : ""),
      );
      saveProject(copy)
        .then((version) => {
          copy.storageVersion = version;
          setProjects((items) => [...items, copy]);
          open(copy);
          setNotice("已创建可编辑副本，默认参考项目保留。副本可直接编译。");
        })
        .catch(() => setNotice("创建副本失败，请检查浏览器存储"));
      return;
    }
    bases.current.set(item.id, item.storageVersion ?? 0);
    halted.current.delete(item.id);
    setSaveError("");
    setConflict(false);
    persisted.current = item;
    setSaved("已保存到本机");
    setP(item);
    setSelected("");
    setPast([]);
    setFuture([]);
    setFiles([]);
    setPage("editor");
  }
  async function create(blank = false) {
    const name = prompt(
      "项目名称",
      blank
        ? "未命名表盘"
        : "极夜 " + String(projects.length + 1).padStart(2, "0"),
    );
    if (!name?.trim()) return;
    setNewProject({ name: name.trim(), blank });
  }
  async function finishCreate(device: ReturnType<typeof deviceFor>) {
    if (!newProject) return;
    const item = {
      ...createProject(newProject.name, newProject.blank),
      target: device.id,
      deviceSize: device.size,
    };
    try {
      item.storageVersion = await saveProject(item);
      setProjects((items) => [item, ...items]);
      setNewProject(null);
      open(item);
    } catch {
      setNotice("项目保存失败，请检查浏览器存储");
    }
  }

  function add(kind: Kind) {
    if (kind === "image") {
      fileInput.current?.click();
      return;
    }
    if (p) {
      const l = layer(kind);
      if (kind === "ring") {
        l.x = 12;
        l.y = 12;
        l.w = l.h = 430;
      }
      editLayers([...p.layers, l]);
      setSelected(l.id);
    }
  }
  function duplicate() {
    if (!p || !current) return;
    const l = {
      ...current,
      id: uid(),
      name: current.name + " 副本",
      x: current.x + 8,
      y: current.y + 8,
    };
    editLayers([...p.layers, l]);
    setSelected(l.id);
  }
  function remove() {
    if (p && current) {
      editLayers(p.layers.filter((l) => l.id !== selected));
      setSelected("");
    }
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (showPreview) return;
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        ) ||
        page !== "editor"
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo(e.shiftKey);
      } else if (e.key === "Delete") remove();
      else if (
        current &&
        !current.locked &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        patch({
          x:
            current.x +
            (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
          y:
            current.y +
            (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0),
        });
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [p, current, page, past, future, showPreview]);
  function pointer(
    e: React.PointerEvent<SVGGElement>,
    l: Layer,
    resize = false,
  ) {
    e.stopPropagation();
    setSelected(l.id);
    if (l.locked) return;
    const svg = e.currentTarget.ownerSVGElement!;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM()!.inverse(),
    );
    drag.current = {
      id: l.id,
      x: pt.x,
      y: pt.y,
      original: l,
      before: structuredClone(p!.layers),
      resize,
    };
    svg.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || !p) return;
    const svg = e.currentTarget.querySelector("svg.watch")! as SVGSVGElement;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM()!.inverse(),
    );
    const dx = Math.round(pt.x - d.x),
      dy = Math.round(pt.y - d.y);
    setP({
      ...p,
      layers: p.layers.map((l) =>
        l.id !== d.id
          ? l
          : d.resize
            ? {
                ...l,
                w: Math.max(10, d.original.w + dx),
                h: Math.max(10, d.original.h + dy),
              }
            : {
                ...l,
                x: Math.max(-454, Math.min(454, d.original.x + dx)),
                y: Math.max(-454, Math.min(454, d.original.y + dy)),
              },
      ),
    });
  }
  function end() {
    const d = drag.current;
    if (d && p) {
      setPast((x) => [...x.slice(-49), d.before]);
      setFuture([]);
      setP({ ...p, revision: p.revision + 1, updated: Date.now() });
      drag.current = null;
    }
  }
  async function image(file?: File) {
    if (!file || !p) return;
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error("请上传 8MB 以内的 PNG、JPEG 或 WebP");
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const l = {
        ...layer("image"),
        name: file.name,
        image: canvas.toDataURL("image/png"),
        w: 180,
        h: (180 * canvas.height) / canvas.width,
      };
      editLayers([...p.layers, l]);
      setSelected(l.id);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("项目文件上限 20MB");
      const item = validateProject(JSON.parse(await file.text()));
      item.storageVersion = await saveProject(item);
      setProjects([item, ...projects]);
      open(item);
    } catch (e) {
      setNotice("导入失败：" + (e as Error).message);
    }
  }
  async function gen() {
    if (!p) return;
    if (!profiles.length || !profiles[0].model) {
      setNotice("请先配置模型地址和模型 ID");
      setPage("models");
      return;
    }
    if (
      !confirm(
        "将设计 JSON 和资源清单发送到当前模型服务？不发送 API Key 到编译服务。",
      )
    )
      return;
    setBusy(true);
    setDrawer("AI");
    setFiles([]);
    setGenRevision(p.revision);
    abort.current = new AbortController();
    try {
      const result = await generate(
        profiles[0],
        p,
        instruction,
        abort.current.signal,
      );
      setFiles(result);
      setFileIndex(0);
      setNotice("生成完成，请审阅文件后应用");
    } catch (e) {
      setNotice(
        (e as Error).name === "AbortError"
          ? "已取消生成"
          : e instanceof TypeError
            ? "网络或跨域错误，请检查模型服务"
            : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function build() {
    if (!p) return;
    setDrawer("编译");
    if (!p.files.length) {
      setLogs("尚无工程代码。请先使用 AI 生成并审阅应用。");
      return;
    }
    if (p.codeRevision !== p.revision) {
      setLogs("设计已更新，当前代码过期。请重新生成代码后再编译。");
      return;
    }
    setBusy(true);
    setArtifacts([]);
    setLogs("正在连接 .NET 10 编译服务…");
    try {
      const capabilities = await fetch("/api/capabilities", {
        signal: AbortSignal.timeout(5000),
      });
      if (
        !capabilities.ok ||
        !capabilities.headers.get("content-type")?.includes("application/json")
      )
        throw Error(
          "编译服务未连接。前端可继续编辑与导出项目；需启动 .NET 10 后端才能生成 PRG。",
        );
      const environment = await capabilities.json();
      const target = p.target || "venu445mm";
      const device = environment.devices?.find(
        (item: { target: string }) => item.target === target,
      );
      if (!device || !device.ready) {
        throw Error(
          `目标 ${target} 编译环境未就绪：${device?.reasons?.join("；") || "服务未提供该设备的就绪信息，请更新后端"}`,
        );
      }
      const form = new FormData();
      form.append(
        "project",
        JSON.stringify({
          projectId: p.id,
          projectName: p.name,
          deviceSize: deviceFor(p).size,
          appId: p.appId,
          target: p.target || "venu445mm",
          revision: p.revision,
        }),
      );
      p.files.forEach((f) =>
        form.append(
          "files",
          new Blob([f.content], { type: "text/plain" }),
          f.path,
        ),
      );
      for (const asset of p.assets || [])
        form.append(
          "files",
          await (await fetch(asset.data)).blob(),
          asset.path,
        );
      for (const l of p.layers)
        if (l.image)
          form.append(
            "files",
            await (await fetch(l.image)).blob(),
            "assets/" + l.id + ".png",
          );
      const r = await fetch("/api/builds", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) {
        const error = await r.json().catch(() => ({}));
        throw Error(
          error.error || error.detail || "提交构建失败 HTTP " + r.status,
        );
      }
      const job = await r.json();
      setBuildId(job.buildId);
      const id = encodeURIComponent(job.buildId);
      for (let attempt = 0; attempt < 240; attempt++) {
        const [stateResponse, logResponse] = await Promise.all([
          fetch(`/api/builds/${id}`, { signal: AbortSignal.timeout(10000) }),
          fetch(`/api/builds/${id}/logs`, {
            signal: AbortSignal.timeout(10000),
          }),
        ]);
        if (!stateResponse.ok || !logResponse.ok)
          throw Error("获取构建状态失败");
        const state = await stateResponse.json();
        const log = await logResponse.json();
        setLogs(
          `任务 ${job.buildId} · ${state.status}\n` +
            (log.lines || []).join("\n"),
        );
        if (
          ["succeeded", "failed", "cancelled", "interrupted"].includes(
            state.status,
          )
        ) {
          if (state.status === "succeeded")
            setArtifacts(
              (state.artifacts || []).filter((a: { id: string; url: string }) =>
                a.url.startsWith(`/api/builds/${id}/artifacts/`),
              ),
            );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw Error("前端等待超时，可通过任务 ID 查询服务端状态");
    } catch (e) {
      setLogs((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          image(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={importInput}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => {
          importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {notice && (
        <div className="toast" role="alert">
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      <header className="topbar">
        <button className="brand" onClick={() => setPage("projects")}>
          <strong>GFC</strong>
          <span>GarminFaceCreator</span>
        </button>
        <div className="project-title">
          {page === "editor" && p ? (
            <button
              onClick={() => {
                const name = prompt("项目名称", p.name);
                if (name?.trim())
                  setP({ ...p, name: name.trim(), updated: Date.now() });
              }}
            >
              {p.name}
              <ChevronDown size={14} />
            </button>
          ) : (
            <span>
              {page === "models" ? "设置 / 模型配置" : "你的表盘设计工作台"}
            </span>
          )}
        </div>
        <span className="save-status">
          {page === "editor" ? (
            <>
              <Check size={13} />
              {saved}
            </>
          ) : (
            <>
              <span className="status-dot" />
              本地工作区
            </>
          )}
        </span>
        {page === "editor" && p ? (
          <div className="header-actions">
            <span className="device">
              {deviceLabel(p)}{" "}
              <small>
                {deviceFor(p).pixels} × {deviceFor(p).pixels}
              </small>
            </span>
            <button onClick={() => setShowPreview(!showPreview)}>
              <Play size={14} />
              预览
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setDrawer("AI");
              }}
            >
              <Sparkles size={15} />
              AI 生成代码
            </button>
            <button className="primary" disabled={busy} onClick={build}>
              <Hammer size={15} />
              编译
            </button>
          </div>
        ) : (
          <button onClick={() => (p ? setPage("editor") : setPage("projects"))}>
            <ArrowLeft size={15} />
            {p ? "返回编辑器" : "返回项目"}
          </button>
        )}
      </header>
      {saveError && (
        <div role="alert" className="storage-error">
          <strong>{saveError}</strong>
          <p>当前设计仍保留在页面中。请处理后再关闭或切换项目。</p>
          <button onClick={() => p && download(p.name + ".json", p)}>
            导出未保存设计
          </button>
          {conflict ? (
            <>
              <button onClick={() => resolveSave("load")}>
                加载已保存的最新版本
              </button>
              <button onClick={() => resolveSave("copy")}>
                另存为冲突副本
              </button>
              <button onClick={() => resolveSave("cancel")}>
                放弃本次保存
              </button>
            </>
          ) : (
            <>
              <button onClick={() => resolveSave("retry")}>重试保存</button>
              <button onClick={() => setConflict(true)}>恢复选项</button>
            </>
          )}
        </div>
      )}
      {page === "models" ? (
        <div className="app-layout">
          <nav className="sidebar">
            <button onClick={() => setPage("projects")}>
              <Folder size={18} />
              项目
            </button>
            <button onClick={() => (p ? setPage("editor") : create())}>
              <MousePointer2 size={18} />
              表盘编辑器
            </button>
            <div className="nav-label">工作区设置</div>
            <button className="active">
              <Settings size={18} />
              模型配置
            </button>
            <p className="sidebar-note">
              模型请求由浏览器发出
              <br />
              项目数据保存在本机
            </p>
          </nav>
          <Models
            profiles={profiles}
            onSave={setProfiles}
            onBack={() => setPage(p ? "editor" : "projects")}
          />
        </div>
      ) : page === "projects" ? (
        <div className="app-layout">
          <nav className="sidebar">
            <button className="active">
              <Folder size={18} />
              我的项目
            </button>
            <button onClick={() => setPage("models")}>
              <Settings size={18} />
              模型配置
            </button>
            <p className="sidebar-note">
              DESIGNED FOR
              <br />
              <b>Venu · Forerunner · fēnix</b>
              <br />
              圆形 AMOLED
            </p>
          </nav>
          <main className="projects">
            <div className="page-heading">
              <div>
                <span className="eyebrow">YOUR CREATIVE WORKSPACE</span>
                <h1>把灵感，戴在腕上。</h1>
                <p>使用内置参考项目，或从空白画布开始设计。</p>
              </div>
              <div className="inline">
                <button onClick={() => importInput.current?.click()}>
                  <Upload size={16} />
                  导入项目
                </button>
                <button className="primary" onClick={() => create()}>
                  <Plus size={16} />
                  新建表盘
                </button>
              </div>
            </div>
            <div className="project-filters">
              <b>
                全部项目 <small>{projects.length}</small>
              </b>
              <input
                placeholder="搜索项目"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="project-grid">
              <button className="new-project" onClick={() => create(true)}>
                <div>
                  <Plus size={30} />
                </div>
                <b>空白画布</b>
                <span>让每一个像素都由你决定</span>
              </button>
              {[...projects]
                .sort((a, b) => Number(isReference(b)) - Number(isReference(a)))
                .filter((x) =>
                  x.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((item) => (
                  <article
                    className={
                      "project-card" +
                      (isReference(item) ? " reference-card" : "")
                    }
                    key={item.id}
                  >
                    <button
                      className="project-thumbnail"
                      aria-label={
                        (isReference(item) ? "使用 " : "打开 ") + item.name
                      }
                      onClick={() => open(item)}
                    >
                      <Scene project={item} preview={preview} />
                    </button>
                    <div className="project-card-info">
                      <div>
                        <b>{item.name}</b>
                        {isReference(item) && (
                          <span className="reference-badge">
                            默认参考 · 不可删除
                          </span>
                        )}
                        <p>
                          {deviceLabel(item)} ·{" "}
                          {isReference(item)
                            ? "完整工程 · 点击创建副本"
                            : new Date(item.updated).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        aria-label={"导出 " + item.name}
                        onClick={() => download(item.name + ".json", item)}
                      >
                        <Download size={15} />
                      </button>
                      {!isReference(item) && (
                        <button
                          aria-label={"删除 " + item.name}
                          onClick={async () => {
                            if (
                              confirm(
                                "删除本地项目 " +
                                  item.name +
                                  "？建议先导出备份。",
                              )
                            ) {
                              try {
                                await removeProject(item.id);
                                setProjects(
                                  projects.filter((x) => x.id !== item.id),
                                );
                                if (p?.id === item.id) setP(null);
                              } catch {
                                setNotice("删除失败");
                              }
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
            {!projects.length && (
              <div className="welcome">
                <Sparkles size={20} />
                <div>
                  <b>第一次使用？试试基础数字表盘</b>
                  <p>内置时间、秒环和两个数据控件，所有元素都可以自由调整。</p>
                </div>
                <button onClick={() => create()}>
                  使用示例 <Plus size={14} />
                </button>
              </div>
            )}
            <p className="hint">
              内置参考项目不可删除。点击封面创建可编辑副本，可直接编译。
              网页为近似或静态预览，实际效果以原生表盘为准。个人项目保存在当前浏览器。
            </p>
          </main>
        </div>
      ) : (
        p && (
          <>
            <div className="editor">
              <nav className="tool-rail">
                <button className="active" title="选择">
                  <MousePointer2 size={21} />
                </button>
                <button title="添加文字" onClick={() => add("text")}>
                  <Type size={21} />
                </button>
                <button title="添加圆形" onClick={() => add("circle")}>
                  <Circle size={21} />
                </button>
                <button title="添加直线" onClick={() => add("line")}>
                  <Minus size={21} />
                </button>
                <button title="添加图片" onClick={() => add("image")}>
                  <Image size={21} />
                </button>
                <button title="项目" onClick={() => setPage("projects")}>
                  <Folder size={21} />
                </button>
                <div className="rail-bottom">
                  <button title="模型配置" onClick={() => setPage("models")}>
                    <Settings size={21} />
                  </button>
                </div>
              </nav>
              <aside className="left-panel">
                <div className="panel-tabs">
                  {["控件", "图层", "素材"].map((t) => (
                    <button
                      key={t}
                      className={leftTab === t ? "active" : ""}
                      onClick={() => setLeftTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {leftTab === "控件" && (
                  <div className="tool-grid">
                    {tools.map(([kind, title, Icon]) => (
                      <button key={kind} onClick={() => add(kind)}>
                        <Icon size={20} />
                        {title}
                      </button>
                    ))}
                  </div>
                )}
                {leftTab === "素材" && (
                  <div className="asset-list">
                    <button onClick={() => add("image")}>
                      <Upload size={16} />
                      上传图片
                    </button>
                    <p className="hint">
                      PNG / JPEG / WebP · 最大 8MB
                      <br />
                      导入后转为 PNG 并随项目保存
                    </p>
                    {p.layers
                      .filter((l) => l.kind === "image")
                      .map((l) => (
                        <button key={l.id} onClick={() => setSelected(l.id)}>
                          <img src={l.image} />
                          {l.name}
                        </button>
                      ))}
                  </div>
                )}
                <div className="layer-heading">
                  <b>图层</b>
                  <span>{p.layers.length}</span>
                </div>
                <div className="layer-list">
                  {p.layers.map((l, i) => (
                    <div
                      key={l.id}
                      className={
                        "layer-row " + (l.id === selected ? "selected" : "")
                      }
                      onClick={() => setSelected(l.id)}
                    >
                      <Layers size={14} />
                      <span>{l.name}</span>
                      <button
                        aria-label={"隐藏 " + l.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          editLayers(
                            p.layers.map((x) =>
                              x.id === l.id ? { ...x, hidden: !x.hidden } : x,
                            ),
                          );
                        }}
                      >
                        {l.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        aria-label={"锁定 " + l.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          editLayers(
                            p.layers.map((x) =>
                              x.id === l.id ? { ...x, locked: !x.locked } : x,
                            ),
                          );
                        }}
                      >
                        {l.locked ? <Lock size={13} /> : <Unlock size={13} />}
                      </button>
                      <button
                        title="上移图层"
                        disabled={!i}
                        onClick={(e) => {
                          e.stopPropagation();
                          const a = [...p.layers];
                          [a[i], a[i - 1]] = [a[i - 1], a[i]];
                          editLayers(a);
                        }}
                      >
                        ↑
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="export-button"
                  onClick={() => download(p.name + ".json", p)}
                >
                  <Download size={15} />
                  导出项目
                </button>
              </aside>
              <main className="canvas-panel">
                <div className="canvas-toolbar">
                  <button
                    title="撤销"
                    disabled={!past.length}
                    onClick={() => undo()}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    title="重做"
                    disabled={!future.length}
                    onClick={() => undo(true)}
                  >
                    <Redo2 size={17} />
                  </button>
                  <span className="separator" />
                  <button
                    title="水平居中"
                    disabled={!current}
                    onClick={() =>
                      current && patch({ x: Math.round((454 - current.w) / 2) })
                    }
                  >
                    <MoveHorizontal size={18} />
                  </button>
                  <button
                    title="复制图层"
                    disabled={!current}
                    onClick={duplicate}
                  >
                    <Copy size={16} />
                  </button>
                  <button title="删除图层" disabled={!current} onClick={remove}>
                    <Trash2 size={16} />
                  </button>
                  <div className="mode-tabs">
                    <button
                      className={!aod ? "active" : ""}
                      onClick={() => setAod(false)}
                    >
                      <Sun size={14} />
                      亮屏
                    </button>
                    <button
                      className={aod ? "active" : ""}
                      onClick={() => setAod(true)}
                    >
                      <Moon size={14} />
                      息屏
                    </button>
                  </div>
                </div>
                <div
                  className="canvas-space"
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                >
                  <div className="ruler">
                    0　　　50　　　100　　　150　　　200　　　250　　　300　　　350　　　400　454
                  </div>
                  <div
                    className="watch-holder"
                    style={{
                      width: (478 * zoom) / 100,
                      height: (478 * zoom) / 100,
                    }}
                  >
                    <Scene
                      project={p}
                      selected={selected}
                      preview={preview}
                      aod={aod}
                      onDown={pointer}
                    />
                  </div>
                  <span className="canvas-badge">
                    {deviceFor(p).pixels} × {deviceFor(p).pixels} 屏幕 · 454 ×
                    454 设计坐标
                  </span>
                  <div className="zoom">
                    <button onClick={() => setZoom(Math.max(60, zoom - 10))}>
                      −
                    </button>
                    <span>{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(170, zoom + 10))}>
                      ＋
                    </button>
                  </div>
                </div>
              </main>
              <aside className="inspector">
                <div className="inspector-title">
                  <b>{current?.name || "画布属性"}</b>
                  <SlidersHorizontal size={16} />
                </div>
                {current ? (
                  <>
                    <label>
                      图层名称
                      <input
                        value={current.name}
                        onChange={(e) => patch({ name: e.target.value })}
                      />
                    </label>
                    <h4>布局</h4>
                    <div className="numeric-grid">
                      {(["x", "y", "w", "h", "rotation", "size"] as const).map(
                        (k) => (
                          <label key={k}>
                            {
                              {
                                x: "X",
                                y: "Y",
                                w: "宽度",
                                h: "高度",
                                rotation: "旋转",
                                size: "字号",
                              }[k]
                            }
                            <input
                              type="number"
                              value={current[k]}
                              min={["w", "h", "size"].includes(k) ? 1 : -454}
                              max={k === "size" ? 200 : 1000}
                              onChange={(e) =>
                                patch({
                                  [k]: Math.max(
                                    ["w", "h", "size"].includes(k) ? 1 : -454,
                                    Math.min(
                                      k === "size" ? 200 : 1000,
                                      Number(e.target.value),
                                    ),
                                  ),
                                })
                              }
                            />
                          </label>
                        ),
                      )}
                    </div>
                    <h4>外观</h4>
                    <label className="color-control">
                      颜色
                      <input
                        type="color"
                        value={current.color}
                        onChange={(e) => patch({ color: e.target.value })}
                      />
                      <code>{current.color.toUpperCase()}</code>
                    </label>
                    {current.kind === "line" && (
                      <label>
                        线宽
                        <input
                          aria-label="线宽"
                          type="number"
                          min="1"
                          max="32"
                          value={current.strokeWidth || 2}
                          onChange={(e) =>
                            patch({
                              strokeWidth: Math.max(
                                1,
                                Math.min(32, Number(e.target.value) || 1),
                              ),
                            })
                          }
                        />
                      </label>
                    )}
                    {current.kind === "text" && (
                      <label>
                        文字内容
                        <input
                          value={current.text}
                          onChange={(e) => patch({ text: e.target.value })}
                        />
                      </label>
                    )}
                    {current.kind === "metric" && (
                      <>
                        <h4>数据绑定</h4>
                        <label>
                          数据源
                          <select
                            aria-label="数据源"
                            value={current.source}
                            onChange={(e) =>
                              patch({
                                source: e.target.value,
                                name: metrics[e.target.value],
                              })
                            }
                          >
                            {Object.entries(metrics).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                        {["heartRate", "battery"].includes(current.source) && (
                          <>
                            <label className="inline">
                              <input
                                type="checkbox"
                                checked={current.threshold}
                                onChange={(e) =>
                                  patch({ threshold: e.target.checked })
                                }
                              />
                              启用阈值颜色
                            </label>
                            {current.threshold && (
                              <div className="thresholds">
                                {(current.source === "heartRate"
                                  ? [
                                      ["#55ff99", "＜120"],
                                      ["#ffee44", "120–149"],
                                      ["#ff5566", "≥150"],
                                    ]
                                  : [
                                      [current.color, "≥30%"],
                                      ["#ffee44", "10–29%"],
                                      ["#ff5566", "＜10%"],
                                    ]
                                ).map(([c, t]) => (
                                  <div key={t}>
                                    <i style={{ background: c }} />
                                    {t}
                                    <code>{c}</code>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                    <h4>显示条件</h4>
                    <label className="inline">
                      <input
                        type="checkbox"
                        checked={current.aod}
                        onChange={(e) => patch({ aod: e.target.checked })}
                      />
                      在息屏布局显示
                    </label>
                    <p className="hint">
                      息屏预览仅作布局参考，导出时还需验证像素占用与字体。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="hint">
                      选择一个图层，调整它的位置、外观与数据来源。
                    </p>
                    <div className="device-info">
                      <span>设备</span>
                      <b>{deviceLabel(p)}</b>
                      <span>画布尺寸</span>
                      <b>
                        {deviceFor(p).pixels} × {deviceFor(p).pixels}
                      </b>
                      <span>应用 ID</span>
                      <code>{p.appId}</code>
                    </div>
                  </>
                )}
              </aside>
            </div>
            <section className={"drawer " + (drawer ? "open" : "")}>
              <div className="drawer-tabs">
                {["AI", "代码", "编译", "历史"].map((t) => (
                  <button
                    key={t}
                    className={drawer === t ? "active" : ""}
                    onClick={() => setDrawer(drawer === t ? "" : t)}
                  >
                    {t === "AI" ? <Sparkles size={14} /> : null}
                    {t}
                  </button>
                ))}
                <span className="drawer-caption">
                  {p.files.length
                    ? `代码版本 ${p.codeRevision} · ${p.codeRevision === p.revision ? "与设计一致" : "设计已更新"}`
                    : "尚未生成代码"}
                </span>
                <button onClick={() => setDrawer("")}>
                  收起 <ChevronDown size={13} />
                </button>
              </div>
              {drawer && (
                <div className="drawer-content">
                  {drawer === "AI" ? (
                    <div className="ai-drawer">
                      <div>
                        <b>让设计成为代码</b>
                        <p>
                          当前模型：{profiles[0]?.name || "尚未配置"} ·{" "}
                          {profiles[0]?.model || "请选择模型 ID"}
                        </p>
                        <textarea
                          aria-label="生成需求"
                          value={instruction}
                          onChange={(e) => setInstruction(e.target.value)}
                        />
                      </div>
                      <div>
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={gen}
                        >
                          <Sparkles size={15} />
                          {busy ? "生成中…" : "生成完整工程"}
                        </button>
                        {busy && (
                          <button onClick={() => abort.current?.abort()}>
                            取消生成
                          </button>
                        )}
                        {files.length > 0 && (
                          <>
                            <span>{files.length} 个文件待审阅</span>
                            <button onClick={() => setDrawer("代码")}>
                              审阅代码
                            </button>
                          </>
                        )}
                        <button onClick={() => setPage("models")}>
                          模型配置
                        </button>
                      </div>
                    </div>
                  ) : drawer === "代码" ? (
                    <div className="code-drawer">
                      <select
                        aria-label="代码文件"
                        value={fileIndex}
                        onChange={(e) => setFileIndex(Number(e.target.value))}
                      >
                        {(files.length ? files : p.files).map((f, i) => (
                          <option key={f.path} value={i}>
                            {f.path}
                          </option>
                        ))}
                      </select>
                      <pre>
                        {(files.length ? files : p.files)[fileIndex]?.content ||
                          "AI 生成后可在这里审阅工程代码。"}
                      </pre>
                      {files.length > 0 && (
                        <button
                          className="primary"
                          onClick={() => {
                            if (genRevision !== p.revision) {
                              setNotice("生成期间设计已变化，请重新生成");
                              return;
                            }
                            setP({
                              ...p,
                              files,
                              codeRevision: p.revision,
                              versions: [
                                ...p.versions,
                                { at: Date.now(), revision: p.revision, files },
                              ],
                            });
                            setFiles([]);
                            setFileIndex(0);
                            setNotice("代码已应用，可提交编译");
                          }}
                        >
                          应用生成结果
                        </button>
                      )}
                    </div>
                  ) : drawer === "编译" ? (
                    <div className="build-drawer">
                      <div>
                        <span className="pill">.NET 10 构建服务</span>
                        <button disabled={busy} onClick={build}>
                          重新连接并编译
                        </button>
                      </div>
                      {busy && buildId && (
                        <button
                          onClick={async () => {
                            try {
                              const r = await fetch(
                                `/api/builds/${encodeURIComponent(buildId)}/cancel`,
                                { method: "POST" },
                              );
                              if (!r.ok) throw Error("取消失败");
                            } catch (e) {
                              setNotice((e as Error).message);
                            }
                          }}
                        >
                          取消构建
                        </button>
                      )}
                      <pre>{logs}</pre>
                      {artifacts.map((a) => (
                        <a
                          className="download-link"
                          key={a.id}
                          href={a.url}
                          download={a.fileName || a.id}
                        >
                          <Download size={16} />
                          下载 {a.fileName || a.id}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="history">
                      {p.versions.length ? (
                        p.versions.map((v, i) => (
                          <div key={i}>
                            <Code2 size={16} />
                            代码版本 {v.revision}
                            <span>{new Date(v.at).toLocaleString()}</span>
                            <button
                              onClick={() => {
                                if (
                                  confirm("恢复此代码快照？设计画布不会改变。")
                                )
                                  setP({
                                    ...p,
                                    files: v.files,
                                    codeRevision: v.revision,
                                  });
                              }}
                            >
                              恢复代码
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="hint">
                          应用 AI 生成结果后，会在这里保留代码快照。
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
            <footer className="statusbar">
              <span>
                <Eye size={13} />
                网页预览
              </span>
              <span>模型：{profiles[0]?.name || "未配置"}</span>
              <button onClick={() => setPage("models")}>
                <Settings size={13} />
                模型设置
              </button>
              <span className="right-status">
                {p.layers.length} 个图层 · 设计版本 {p.revision}
              </span>
            </footer>
          </>
        )
      )}
      {newProject && (
        <DevicePicker
          onChoose={finishCreate}
          onCancel={() => setNewProject(null)}
        />
      )}
      {showPreview && p && (
        <PreviewStudio
          project={p}
          preview={preview}
          setPreview={setPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
      {!ready && <div className="loading">正在读取本地工作区…</div>}
    </>
  );
}
