import { localGenerate, LOCAL_PROVENANCE } from "./localGenerator";
import type { CodeProvenance } from "./domain";
import { applyLayout, type LayoutChoice } from "./layouts";
import { graphicsCapabilities } from "./graphics";
import { anchorPosition, coordinatePatch } from "./anchors";
import LayerList from "./LayerList";
import Palette from "./Palette";
import { renderChanged, organizeReferenceLayers } from "./groups";
import { exportSources } from "./sourceExport";
import { groupBox, layerBox, insideBox, type Box } from "./selection";
import ThresholdEditor from "./ThresholdEditor";
import { defaultThresholds } from "./thresholds";
import { crossesScreen } from "./bounds";
import { saveDesignSnapshot, restoreDesignSnapshot } from "./designHistory";
import { binaryAssets } from "./assets";
import { activeVersion, addCodeVersion, retainHistory } from "./history";
import { mergeLogs, diagnostic, type LogBuffer } from "./buildLogs";
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
import { generate, GenerationFailure } from "./api";
import Models from "./Models";
import { loadReferences, isReference, copyReference } from "./builtins";
import Scene, { reading, type Preview } from "./Scene";
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
  const [selection, setSelection] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<Box | null>(null);
  const marquee = useRef<{ x: number; y: number; before: string[] } | null>(
    null,
  );
  const [profiles, setProfiles] = useState(readProfiles);
  const [generationProfileId, setGenerationProfileId] = useState("");
  const generationProfile =
    profiles.find((profile) => profile.id === generationProfileId) ||
    profiles[0];
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
  const generationLock = useRef(false);
  const [pendingProvenance, setPendingProvenance] = useState<CodeProvenance>({
    primary: "ai",
  });
  const [buildId, setBuildId] = useState("");
  const [artifacts, setArtifacts] = useState<
    { id: string; url: string; fileName?: string }[]
  >([]);
  const [logs, setLogs] = useState("编译服务尚未连接。生成代码后可提交编译。");
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [fileIndex, setFileIndex] = useState(0);
  const [codeFromBuild, setCodeFromBuild] = useState(false);
  const [codeLine, setCodeLine] = useState<number | null>(null);
  const shownFiles = codeFromBuild
    ? p?.files || []
    : files.length
      ? files
      : p?.files || [];
  const logBuffer = useRef<LogBuffer>({ id: "", cursor: 0, lines: [] });
  const [generationFailure, setGenerationFailure] =
    useState<GenerationFailure | null>(null);
  const rawOutput = useRef<HTMLTextAreaElement>(null);
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
    project: Project;
    latest: Layer[];
    resize?: number;
    ids: string[];
  } | null>(null);
  const propertyEdit = useRef<{
    projectId: string;
    before: Layer[];
    changed: boolean;
  } | null>(null);
  const current = p?.layers.find((l) => l.id === selected);
  const textMeasure = useRef<CanvasRenderingContext2D | null>(null);
  textMeasure.current ||= document.createElement("canvas").getContext("2d");
  const boundaryWarnings = (p?.layers || []).filter((l) => {
    if (!["text", "time", "date", "metric"].includes(l.kind))
      return crossesScreen(l);
    const ctx = textMeasure.current;
    if (!ctx) return crossesScreen(l);
    ctx.font = `${l.fontWeight || (l.kind === "time" ? 600 : 400)} ${l.size}px Arial`;
    const measured = ctx.measureText(
      (l.kind === "metric" && l.source === "heartRate" ? "♡ " : "") +
        reading(l, preview),
    );
    return crossesScreen(l, {
      width: measured.width,
      height: Math.max(
        l.size,
        measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent,
      ),
    });
  });
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
        setNotice("无法读取本地项目：" + storageMessage(e));
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (
      !p ||
      !ready ||
      drag.current ||
      halted.current.has(p.id) ||
      persisted.current === p
    )
      return;
    setSaved("保存中…");
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (drag.current?.project.id === p.id || halted.current.has(p.id))
          return;
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
  function selectOne(value: string | ((id: string) => string)) {
    const id = typeof value === "function" ? value(selected) : value;
    setSelected(id);
    setSelection(id ? [id] : []);
  }
  function selectLayer(id: string, additive = false) {
    if (!additive) {
      selectOne(id);
      return;
    }
    const next = selection.includes(id)
      ? selection.filter((v) => v !== id)
      : [...selection, id];
    setSelection(next);
    setSelected(next.at(-1) || "");
  }
  function batchAlign(mode: "center" | "left" | "right" | "top" | "bottom") {
    if (!p) return;
    const movable = p.layers.filter(
      (l) => selection.includes(l.id) && !l.locked,
    );
    if (!movable.length) return;
    const bounds = groupBox(movable);
    editLayers(
      p.layers.map((l) => {
        if (!movable.some((item) => item.id === l.id)) return l;
        const b = layerBox(l);
        return mode === "center"
          ? { ...l, x: l.x + 227 - (bounds.x + bounds.w / 2) }
          : mode === "left"
            ? { ...l, x: l.x + bounds.x - b.x }
            : mode === "right"
              ? { ...l, x: l.x + bounds.x + bounds.w - b.x - b.w }
              : mode === "top"
                ? { ...l, y: l.y + bounds.y - b.y }
                : { ...l, y: l.y + bounds.y + bounds.h - b.y - b.h };
      }),
    );
  }
  function batchLock() {
    if (!p || !selection.length) return;
    const locked = !p.layers
      .filter((l) => selection.includes(l.id))
      .every((l) => l.locked);
    editLayers(
      p.layers.map((l) => (selection.includes(l.id) ? { ...l, locked } : l)),
    );
  }
  function editLayers(layers: Layer[], record = true) {
    if (!p) return;
    if (record) {
      setPast((x) => [...x.slice(-49), structuredClone(p.layers)]);
      setFuture([]);
    }
    setP({
      ...p,
      layers,
      revision: p.revision + (renderChanged(p.layers, layers) ? 1 : 0),
      updated: Date.now(),
    });
  }
  function beginProperty(e: React.FocusEvent<HTMLElement>) {
    if (
      !p ||
      !(e.target instanceof HTMLInputElement) ||
      ["checkbox", "file"].includes(e.target.type)
    )
      return;
    propertyEdit.current = {
      projectId: p.id,
      before: structuredClone(p.layers),
      changed: false,
    };
  }
  function endProperty() {
    const edit = propertyEdit.current;
    propertyEdit.current = null;
    if (
      edit?.changed &&
      activeProject.current?.id === edit.projectId &&
      JSON.stringify(edit.before) !==
        JSON.stringify(activeProject.current.layers)
    ) {
      setPast((items) => [...items.slice(-49), edit.before]);
      setFuture([]);
    }
  }
  function patch(v: Partial<Layer>) {
    if (
      !p ||
      !current ||
      Object.entries(v).every(
        ([key, value]) => current[key as keyof Layer] === value,
      )
    )
      return;
    if (current.locked) {
      setNotice("请先解锁图层再编辑属性");
      return;
    }
    const transaction =
      propertyEdit.current?.projectId === p.id ? propertyEdit.current : null;
    if (transaction) transaction.changed = true;
    editLayers(
      p.layers.map((l) => (l.id === selected ? { ...l, ...v } : l)),
      !transaction,
    );
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
    selectOne((id) => (layers.some((l) => l.id === id) ? id : ""));
    setP({
      ...p,
      layers,
      revision: p.revision + (renderChanged(p.layers, layers) ? 1 : 0),
      updated: Date.now(),
    });
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
    selectOne("");
    setPast([]);
    setFuture([]);
    setFiles([]);
    setGenerationFailure(null);
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
  async function finishCreate(
    device: ReturnType<typeof deviceFor>,
    choice?: LayoutChoice,
  ) {
    if (!newProject) return;
    const base = {
      ...createProject(
        newProject.name,
        choice ? choice.presetId === "blank" : newProject.blank,
      ),
      target: device.id,
      deviceSize: device.size,
    };
    const item = choice ? applyLayout(base, choice) : base;
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
      selectOne(l.id);
    }
  }
  function duplicate() {
    if (!p) return;
    const copiedGroups = new Map<string, string>();
    const copies = p.layers
      .filter((l) => selection.includes(l.id) && !l.locked)
      .map((l) => {
        if (l.groupId && !copiedGroups.has(l.groupId))
          copiedGroups.set(l.groupId, uid());
        return {
          ...l,
          groupId: l.groupId ? copiedGroups.get(l.groupId) : undefined,
          groupName: l.groupName ? l.groupName + " 副本" : undefined,
          id: uid(),
          name: l.name + " 副本",
          x: l.x + 8,
          y: l.y + 8,
        };
      });
    if (!copies.length) return;
    if (p.layers.length + copies.length > 200) {
      setNotice("最多 200 个图层");
      return;
    }
    editLayers([...p.layers, ...copies]);
    setSelection(copies.map((l) => l.id));
    setSelected(copies.at(-1)!.id);
  }
  function remove() {
    if (!p) return;
    const ids = p.layers
      .filter((l) => selection.includes(l.id) && !l.locked)
      .map((l) => l.id);
    if (!ids.length) return;
    editLayers(p.layers.filter((l) => !ids.includes(l.id)));
    const next = selection.filter((id) => !ids.includes(id));
    setSelection(next);
    setSelected(next.at(-1) || "");
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
      if (drag.current) {
        if (e.key === "Escape") {
          const before = drag.current.project;
          drag.current = null;
          setP(before);
          setSaveAttempt((n) => n + 1);
        }
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo(e.shiftKey);
      } else if (e.key === "Delete") remove();
      else if (
        p?.layers.some((l) => selection.includes(l.id) && !l.locked) &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (p)
          editLayers(
            p.layers.map((l) =>
              selection.includes(l.id) && !l.locked
                ? {
                    ...l,
                    x:
                      l.x +
                      (e.key === "ArrowRight"
                        ? step
                        : e.key === "ArrowLeft"
                          ? -step
                          : 0),
                    y:
                      l.y +
                      (e.key === "ArrowDown"
                        ? step
                        : e.key === "ArrowUp"
                          ? -step
                          : 0),
                  }
                : l,
            ),
          );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [p, current, page, past, future, showPreview, selection]);
  function pointer(
    e: React.PointerEvent<SVGGElement>,
    l: Layer,
    resize?: number,
  ) {
    e.stopPropagation();
    if (e.shiftKey) {
      selectLayer(l.id, true);
      return;
    }
    const ids = selection.includes(l.id) ? selection : [l.id];
    if (!selection.includes(l.id)) selectOne(l.id);
    else setSelected(l.id);
    if (!p || l.locked || e.button !== 0) return;
    endProperty();
    const svg = e.currentTarget.ownerSVGElement!;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM()!.inverse(),
    );
    drag.current = {
      id: l.id,
      x: pt.x,
      y: pt.y,
      original: l,
      before: structuredClone(p.layers),
      project: p,
      latest: p.layers,
      resize,
      ids,
    };
    svg.setPointerCapture(e.pointerId);
  }
  function dragLayers(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return null;
    const svg = e.currentTarget.querySelector("svg.watch")! as SVGSVGElement;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM()!.inverse(),
    );
    const dx = Math.round(pt.x - d.x),
      dy = Math.round(pt.y - d.y);
    let changed: Layer;
    if (d.resize !== undefined) {
      const angle = (d.original.rotation * Math.PI) / 180,
        cos = Math.cos(angle),
        sin = Math.sin(angle);
      const localX = dx * cos + dy * sin,
        localY = -dx * sin + dy * cos;
      const left = d.resize === 0 || d.resize === 2,
        top = d.resize === 0 || d.resize === 1;
      const w = Math.max(10, d.original.w + (left ? -localX : localX));
      const h = Math.max(10, d.original.h + (top ? -localY : localY));
      const shiftX = (w - d.original.w) * (left ? -0.5 : 0.5),
        shiftY = (h - d.original.h) * (top ? -0.5 : 0.5);
      changed = {
        ...d.original,
        w,
        h,
        x:
          d.original.x + d.original.w / 2 + shiftX * cos - shiftY * sin - w / 2,
        y:
          d.original.y + d.original.h / 2 + shiftX * sin + shiftY * cos - h / 2,
      };
    } else {
      let moveX = dx,
        moveY = dy;
      if (dx === 0 && dy === 0) {
        d.latest = d.before;
        return d.latest;
      }
      const group = d.before.filter((l) => d.ids.includes(l.id) && !l.locked);
      if (!e.altKey && group.length) {
        const box = groupBox(group);
        const horizontal = [
          box.x + moveX,
          box.x + box.w / 2 + moveX,
          box.x + box.w + moveX,
        ];
        const vertical = [
          box.y + moveY,
          box.y + box.h / 2 + moveY,
          box.y + box.h + moveY,
        ];
        const sx = horizontal.find((v) => Math.abs(v - 227) <= 2),
          sy = vertical.find((v) => Math.abs(v - 227) <= 2);
        if (sx !== undefined) moveX += 227 - sx;
        if (sy !== undefined) moveY += 227 - sy;
      }
      d.latest = d.before.map((l) =>
        d.ids.includes(l.id) && !l.locked
          ? { ...l, x: l.x + moveX, y: l.y + moveY }
          : l,
      );
      return d.latest;
    }
    d.latest = d.before.map((l) => (l.id === d.id ? changed : l));
    return d.latest;
  }
  function canvasPoint(e: React.PointerEvent<HTMLDivElement>) {
    const svg = e.currentTarget.querySelector(
      "svg.watch",
    ) as SVGSVGElement | null;
    return svg
      ? new DOMPoint(e.clientX, e.clientY).matrixTransform(
          svg.getScreenCTM()!.inverse(),
        )
      : null;
  }
  function startMarquee(e: React.PointerEvent<HTMLDivElement>) {
    if (
      e.button !== 0 ||
      (e.target as Element).closest("[data-layer],button,input")
    )
      return;
    const point = canvasPoint(e);
    if (!point) return;
    marquee.current = {
      x: point.x,
      y: point.y,
      before: e.shiftKey ? selection : [],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (marquee.current) {
      const point = canvasPoint(e),
        start = marquee.current;
      if (!point) return;
      setSelectionBox({
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.abs(point.x - start.x),
        h: Math.abs(point.y - start.y),
      });
      return;
    }
    const layers = dragLayers(e),
      d = drag.current;
    if (d && layers) setP({ ...d.project, layers });
  }
  function end(e: React.PointerEvent<HTMLDivElement>, cancel = false) {
    if (marquee.current) {
      const start = marquee.current,
        point = canvasPoint(e);
      marquee.current = null;
      setSelectionBox(null);
      if (!cancel && point && p) {
        const box = {
          x: Math.min(start.x, point.x),
          y: Math.min(start.y, point.y),
          w: Math.abs(point.x - start.x),
          h: Math.abs(point.y - start.y),
        };
        const next = [
          ...new Set([
            ...start.before,
            ...p.layers
              .filter(
                (l) => !l.hidden && box.w > 2 && box.h > 2 && insideBox(l, box),
              )
              .map((l) => l.id),
          ]),
        ];
        setSelection(next);
        setSelected(next.at(-1) || "");
      }
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (!cancel) dragLayers(e);
    drag.current = null;
    if (cancel || JSON.stringify(d.before) === JSON.stringify(d.latest)) {
      setP(d.project);
      setSaveAttempt((n) => n + 1);
      return;
    }
    setPast((items) => [...items.slice(-49), d.before]);
    setFuture([]);
    setP({
      ...d.project,
      layers: d.latest,
      revision: d.project.revision + 1,
      updated: Date.now(),
    });
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
        assetId: uid(),
        name: file.name,
        image: canvas.toDataURL("image/png"),
        w: 180,
        h: (180 * canvas.height) / canvas.width,
      };
      editLayers([...p.layers, l]);
      selectOne(l.id);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("项目文件上限 20MB");
      const imported = JSON.parse(await file.text());
      const item = validateProject(imported);
      if (
        (imported.files?.length ||
          imported.versions?.length ||
          imported.designSnapshots?.length) &&
        !confirm(
          "本次仅恢复当前画布设计，原工程代码、代码快照及设计快照不会导入。是否继续？取消后现有项目保持不变。",
        )
      )
        return;
      item.storageVersion = await saveProject(item);
      setProjects([item, ...projects]);
      open(item);
    } catch (e) {
      setNotice("导入失败：" + (e as Error).message);
    }
  }
  function genLocal() {
    if (!p || busy || generationLock.current) return;
    generationLock.current = true;
    try {
      const result = localGenerate(p);
      setFiles(result);
      setPendingProvenance(LOCAL_PROVENANCE);
      setGenRevision(p.revision);
      setFileIndex(0);
      setCodeFromBuild(false);
      setCodeLine(null);
      setGenerationFailure(null);
      setDrawer("代码");
      setNotice(
        "本地生成完成，请审阅后应用。系统字体为近似映射，需要设备检查。",
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      generationLock.current = false;
    }
  }
  async function gen() {
    if (!p || busy || generationLock.current) return;
    if (!generationProfile?.model) {
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
    generationLock.current = true;
    setPendingProvenance({ primary: "ai" });
    setBusy(true);
    setDrawer("AI");
    setGenerationFailure(null);
    setFiles([]);
    setGenRevision(p.revision);
    abort.current = new AbortController();
    try {
      const result = await generate(
        generationProfile,
        p,
        instruction,
        abort.current.signal,
      );
      setFiles(result);
      setFileIndex(0);
      setCodeFromBuild(false);
      setCodeLine(null);
      setNotice("生成完成，请审阅文件后应用");
    } catch (e) {
      if (e instanceof GenerationFailure) setGenerationFailure(e);
      setNotice(
        (e as Error).name === "AbortError"
          ? "已取消生成"
          : e instanceof TypeError
            ? "网络或跨域错误，请检查模型服务"
            : (e as Error).message,
      );
    } finally {
      generationLock.current = false;
      setBusy(false);
    }
  }
  async function build() {
    if (!p) return;
    setDrawer("编译");
    if (!p.files.length) {
      setLogs("尚无工程代码。请先生成并审阅应用。");
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
      for (const asset of binaryAssets(p))
        form.append(
          "files",
          await (await fetch(asset.data)).blob(),
          asset.path,
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
      await observeBuild(job.buildId);
    } catch (e) {
      setLogs((old) => old + "\n" + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function observeBuild(build: string) {
    const id = encodeURIComponent(build);
    if (logBuffer.current.id !== build)
      logBuffer.current = { id: build, cursor: 0, lines: [] };
    let failures = 0;
    for (let attempt = 0; attempt < 240; attempt++) {
      try {
        const stateResponse = await fetch(`/api/builds/${id}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!stateResponse.ok)
          throw Error(
            stateResponse.status === 404
              ? "任务已不存在或已过期"
              : "获取构建状态失败",
          );
        const state = await stateResponse.json();
        const logResponse = await fetch(
          `/api/builds/${id}/logs?after=${logBuffer.current.cursor}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (!logResponse.ok) throw Error("获取构建日志失败");
        logBuffer.current = mergeLogs(
          logBuffer.current,
          await logResponse.json(),
        );
        failures = 0;
        setLogs(
          `任务 ${build} · ${state.status}\n` +
            logBuffer.current.lines.join("\n") +
            (state.artifactExpired ? "\n编译产物已过期，请重新编译。" : "") +
            (state.logsExpired ? "\n诊断日志已过保留期。" : ""),
        );
        if (
          ["succeeded", "failed", "cancelled", "interrupted"].includes(
            state.status,
          )
        ) {
          if (state.status === "succeeded")
            setArtifacts(
              (state.artifacts || []).filter((a: { url: string }) =>
                a.url.startsWith(`/api/builds/${id}/artifacts/`),
              ),
            );
          return;
        }
      } catch (error) {
        failures++;
        setLogs(
          `任务 ${build} · 连接中断，正在重试 ${failures}/3\n` +
            logBuffer.current.lines.join("\n"),
        );
        if (failures >= 3) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw Error("前端等待超时，可继续观察原任务");
  }
  async function resumeBuild() {
    setBusy(true);
    try {
      await observeBuild(buildId);
    } catch (error) {
      setLogs((old) => old + "\n" + (error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function locateDiagnostic(path: string, line: number) {
    const index = p?.files.findIndex((file) => file.path === path) ?? -1;
    if (index < 0) {
      setNotice("当前工程找不到文件：" + path);
      return;
    }
    setCodeFromBuild(true);
    setFileIndex(index);
    setCodeLine(line);
    setDrawer("代码");
    setTimeout(
      () =>
        document
          .querySelector(".code-drawer mark")
          ?.scrollIntoView({ block: "center" }),
      0,
    );
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
            <button disabled={busy} onClick={genLocal}>
              本地生成（试验）
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
                {leftTab === "控件" && (
                  <button
                    onClick={() => {
                      const guide = {
                        ...layer("line"),
                        name: "辅助线",
                        guide: true,
                        exportIncluded: false,
                        allowClip: true,
                        color: "#698798",
                        strokeWidth: 1,
                      };
                      editLayers([...p.layers, guide]);
                      selectOne(guide.id);
                    }}
                  >
                    添加辅助线
                  </button>
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
                        <button key={l.id} onClick={() => selectOne(l.id)}>
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
                <div className="group-actions">
                  <button
                    disabled={selection.length < 2}
                    onClick={() => {
                      const name = prompt("分组名称", "新分组");
                      if (!name?.trim()) return;
                      const id = uid();
                      editLayers(
                        p.layers.map((l) =>
                          selection.includes(l.id)
                            ? {
                                ...l,
                                groupId: id,
                                groupName: name.trim().slice(0, 80),
                              }
                            : l,
                        ),
                      );
                    }}
                  >
                    选中图层分组
                  </button>
                  <button
                    onClick={() =>
                      editLayers(organizeReferenceLayers(p.layers))
                    }
                  >
                    按名称整理
                  </button>
                </div>
                <LayerList
                  layers={p.layers}
                  selection={selection}
                  preview={preview}
                  onSelect={selectLayer}
                  onSelectGroup={(ids, additive) => {
                    const next = additive
                      ? [...new Set([...selection, ...ids])]
                      : ids;
                    setSelection(next);
                    setSelected(next.at(-1) || "");
                  }}
                  onChange={editLayers}
                />
                <Palette
                  layers={p.layers}
                  selection={selection}
                  onChange={editLayers}
                />
                <button
                  className="export-button"
                  disabled={!p.files.length}
                  onClick={async () => {
                    try {
                      const result = await exportSources(p),
                        url = URL.createObjectURL(result.blob),
                        link = document.createElement("a");
                      link.href = url;
                      link.download = result.name;
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      setNotice(result.licenseStatus);
                    } catch (error) {
                      setNotice((error as Error).message);
                    }
                  }}
                >
                  <Download size={15} />
                  导出源码工程 ZIP
                </button>
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
                    onClick={() => batchAlign("center")}
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
                  {selection.length > 1 && (
                    <>
                      <span aria-label="已选图层数">
                        已选 {selection.length}
                      </span>
                      <button onClick={() => batchAlign("left")}>左对齐</button>
                      <button onClick={() => batchAlign("right")}>
                        右对齐
                      </button>
                      <button onClick={() => batchAlign("top")}>
                        顶部对齐
                      </button>
                      <button onClick={() => batchAlign("bottom")}>
                        底部对齐
                      </button>
                      <button onClick={batchLock}>批量锁定/解锁</button>
                    </>
                  )}
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
                  onPointerDown={startMarquee}
                  onPointerMove={move}
                  onPointerUp={(e) => end(e)}
                  onPointerCancel={(e) => end(e, true)}
                  onLostPointerCapture={(e) => end(e, true)}
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
                      selection={selection}
                      selectionBox={selectionBox}
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
              <aside
                className="inspector"
                onFocusCapture={beginProperty}
                onBlurCapture={endProperty}
              >
                {boundaryWarnings.length > 0 && (
                  <details className="boundary-warning">
                    <summary>
                      {boundaryWarnings.length} 个图层超出圆屏边界
                    </summary>
                    <p>
                      按当前网页字体与预览值估算，请在目标设备检查实际字形。
                    </p>
                    {boundaryWarnings.map((l) => (
                      <button key={l.id} onClick={() => selectOne(l.id)}>
                        定位 {l.name}
                      </button>
                    ))}
                  </details>
                )}
                {selection.length > 1 && (
                  <p className="hint">
                    已选 {selection.length}{" "}
                    个图层，属性仅修改主选图层。批量操作使用画布工具栏；锁定图层不会被移动、复制或删除。按住
                    Alt 拖动可暂时关闭吸附。
                  </p>
                )}
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
                    <label>
                      坐标锚点
                      <select
                        aria-label="坐标锚点"
                        value={current.anchor || "topLeft"}
                        onChange={(e) =>
                          patch({ anchor: e.target.value as Layer["anchor"] })
                        }
                      >
                        {[
                          ["topLeft", "左上"],
                          ["center", "中心"],
                          ["topRight", "右上"],
                          ["bottomLeft", "左下"],
                          ["bottomRight", "右下"],
                        ].map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="hint">
                      X/Y 按所选锚点显示；保存与生成仍使用统一左上角坐标。
                    </p>
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
                              value={
                                k === "x" || k === "y"
                                  ? Math.round(
                                      anchorPosition(current)[k] * 1000,
                                    ) / 1000
                                  : current[k]
                              }
                              min={["w", "h", "size"].includes(k) ? 1 : -454}
                              max={k === "size" ? 200 : 1000}
                              onChange={(e) => {
                                const value = Math.max(
                                  ["w", "h", "size"].includes(k) ? 1 : -454,
                                  Math.min(
                                    k === "size" ? 200 : 1000,
                                    Number(e.target.value),
                                  ),
                                );
                                patch(
                                  k === "x" || k === "y"
                                    ? coordinatePatch(current, k, value)
                                    : { [k]: value },
                                );
                              }}
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
                    {["rect", "circle", "line"].includes(current.kind) && (
                      <>
                        {current.kind !== "line" && (
                          <label className="inline">
                            <input
                              type="checkbox"
                              checked={current.fillEnabled !== false}
                              onChange={(e) =>
                                patch({ fillEnabled: e.target.checked })
                              }
                            />
                            填充形状
                          </label>
                        )}
                        <label className="inline">
                          <input
                            type="checkbox"
                            checked={
                              current.strokeEnabled ?? current.kind === "line"
                            }
                            onChange={(e) =>
                              patch({ strokeEnabled: e.target.checked })
                            }
                          />
                          启用描边
                        </label>
                        {(current.strokeEnabled ?? current.kind === "line") && (
                          <>
                            <label>
                              描边颜色
                              <input
                                aria-label="描边颜色"
                                type="color"
                                value={current.strokeColor || current.color}
                                onChange={(e) =>
                                  patch({ strokeColor: e.target.value })
                                }
                              />
                            </label>
                            <button
                              onClick={() => patch({ strokeColor: undefined })}
                            >
                              描边跟随基础色
                            </button>
                            <label>
                              线宽
                              <input
                                aria-label="线宽"
                                type="number"
                                min={1}
                                max={32}
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
                          </>
                        )}
                        <label>
                          不透明度
                          <input
                            aria-label="形状不透明度"
                            type="number"
                            step={0.05}
                            min={0}
                            max={1}
                            disabled={!graphicsCapabilities(p).alphaBlending}
                            value={current.opacity ?? 1}
                            onChange={(e) =>
                              patch({
                                opacity: Math.max(
                                  0,
                                  Math.min(1, Number(e.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>
                        {current.kind === "rect" && (
                          <label>
                            圆角半径
                            <input
                              aria-label="圆角半径"
                              type="number"
                              min={0}
                              max={500}
                              value={current.cornerRadius ?? 4}
                              onChange={(e) =>
                                patch({
                                  cornerRadius: Math.max(
                                    0,
                                    Math.min(500, Number(e.target.value) || 0),
                                  ),
                                })
                              }
                            />
                          </label>
                        )}
                        <p className="hint">
                          {graphicsCapabilities(p).enhancedGraphics
                            ? "当前目标已核查增强图形与透明混合能力。"
                            : "当前目标尚未核查增强图形，不开放透明度。"}
                          浏览器与设备的色深、抗锯齿可能不同。
                        </p>
                      </>
                    )}
                    {["text", "time", "date", "metric"].includes(
                      current.kind,
                    ) && (
                      <>
                        <label>
                          文字对齐
                          <select
                            aria-label="文字对齐"
                            value={current.textAlign || "center"}
                            onChange={(e) =>
                              patch({
                                textAlign: e.target.value as Layer["textAlign"],
                              })
                            }
                          >
                            <option value="left">左对齐</option>
                            <option value="center">居中</option>
                            <option value="right">右对齐</option>
                          </select>
                        </label>
                        <label>
                          字重
                          <select
                            aria-label="字重"
                            value={
                              current.fontWeight ||
                              (current.kind === "time" ? 600 : 400)
                            }
                            onChange={(e) =>
                              patch({
                                fontWeight: Number(
                                  e.target.value,
                                ) as Layer["fontWeight"],
                              })
                            }
                          >
                            <option value="400">常规</option>
                            <option value="600">半粗</option>
                            <option value="700">粗体</option>
                          </select>
                        </label>
                        <label>
                          Garmin 字体
                          <select
                            aria-label="Garmin 字体"
                            value={current.garminFont || "auto"}
                            onChange={(e) =>
                              patch({
                                garminFont: e.target
                                  .value as Layer["garminFont"],
                              })
                            }
                          >
                            {[
                              ["auto", "自动选择"],
                              ["tiny", "FONT_TINY"],
                              ["small", "FONT_SMALL"],
                              ["medium", "FONT_MEDIUM"],
                              ["large", "FONT_LARGE"],
                              ["numberHot", "FONT_NUMBER_HOT"],
                            ].map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="hint">
                          网页使用替代字体。原生字体的字号、字重和中文字形取决于目标设备，不随工程分发
                          SDK 字体。
                        </p>
                      </>
                    )}
                    <label className="inline">
                      <input
                        type="checkbox"
                        checked={!!current.allowClip}
                        onChange={(e) => patch({ allowClip: e.target.checked })}
                      />
                      允许装饰裁切
                    </label>
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
                                thresholdRules: defaultThresholds(
                                  e.target.value,
                                  current.color,
                                ),
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
                        <label>
                          数据标签
                          <input
                            aria-label="数据标签"
                            maxLength={100}
                            value={current.label || ""}
                            onChange={(e) => patch({ label: e.target.value })}
                          />
                        </label>
                        <label>
                          数据单位
                          <input
                            aria-label="数据单位"
                            maxLength={100}
                            placeholder="输入自定义单位；空值隐藏"
                            value={current.unit ?? ""}
                            onChange={(e) => patch({ unit: e.target.value })}
                          />
                        </label>
                        <p className="hint">
                          {current.unit === undefined
                            ? "当前使用数据源默认单位"
                            : "当前使用自定义单位（可留空隐藏）"}
                        </p>
                        <button onClick={() => patch({ unit: undefined })}>
                          恢复默认单位
                        </button>
                        <label>
                          小数位
                          <select
                            aria-label="小数位"
                            value={current.precision ?? "auto"}
                            onChange={(e) =>
                              patch({
                                precision:
                                  e.target.value === "auto"
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          >
                            <option value="auto">自动格式</option>
                            {[0, 1, 2, 3].map((n) => (
                              <option key={n} value={n}>
                                {n} 位
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          缺失值
                          <input
                            aria-label="缺失值"
                            maxLength={100}
                            value={current.missingValue ?? "--"}
                            onChange={(e) =>
                              patch({ missingValue: e.target.value })
                            }
                          />
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
                              <ThresholdEditor
                                layer={current}
                                onApply={patch}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}
                    {current.kind === "ring" && (
                      <>
                        <h4>圆环参数</h4>
                        <label>
                          刻度数
                          <input
                            aria-label="圆环刻度数"
                            type="number"
                            min={4}
                            max={180}
                            value={current.ringTicks || 60}
                            onChange={(e) =>
                              patch({
                                ringTicks: Math.max(
                                  4,
                                  Math.min(180, Number(e.target.value) || 4),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          起始角
                          <input
                            aria-label="圆环起始角"
                            type="number"
                            min={0}
                            max={360}
                            value={current.ringStart ?? 0}
                            onChange={(e) =>
                              patch({
                                ringStart: Math.max(
                                  0,
                                  Math.min(360, Number(e.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          结束角
                          <input
                            aria-label="圆环结束角"
                            type="number"
                            min={0}
                            max={360}
                            value={current.ringEnd ?? 360}
                            onChange={(e) =>
                              patch({
                                ringEnd: Math.max(
                                  0,
                                  Math.min(360, Number(e.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          刻度线宽
                          <input
                            aria-label="圆环线宽"
                            type="number"
                            min={1}
                            max={32}
                            value={current.ringWidth || 2}
                            onChange={(e) =>
                              patch({
                                ringWidth: Math.max(
                                  1,
                                  Math.min(32, Number(e.target.value) || 1),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          未点亮透明度
                          <input
                            aria-label="圆环暗色透明度"
                            type="number"
                            step={0.05}
                            min={0}
                            max={1}
                            value={current.ringDim ?? 0.25}
                            onChange={(e) =>
                              patch({
                                ringDim: Math.max(
                                  0,
                                  Math.min(1, Number(e.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          圆环数据
                          <select
                            aria-label="圆环数据"
                            value={current.ringSource || "seconds"}
                            onChange={(e) =>
                              patch({
                                ringSource: e.target
                                  .value as Layer["ringSource"],
                                ringGoal: undefined,
                              })
                            }
                          >
                            {[
                              ["seconds", "秒数"],
                              ["steps", "步数"],
                              ["battery", "电量"],
                              ["heartRate", "心率"],
                              ["static", "全部点亮"],
                            ].map(([id, name]) => (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {current.ringSource &&
                          !["seconds", "static"].includes(
                            current.ringSource,
                          ) && (
                            <label>
                              圆环目标
                              <input
                                aria-label="圆环目标"
                                type="number"
                                min={1}
                                value={
                                  current.ringGoal ||
                                  (current.ringSource === "steps"
                                    ? 10000
                                    : current.ringSource === "battery"
                                      ? 100
                                      : 180)
                                }
                                onChange={(e) =>
                                  patch({
                                    ringGoal: Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    ),
                                  })
                                }
                              />
                            </label>
                          )}
                      </>
                    )}
                    <h4>显示条件</h4>
                    <label className="inline">
                      <input
                        type="checkbox"
                        checked={current.exportIncluded !== false}
                        onChange={(e) =>
                          patch({
                            exportIncluded: e.target.checked,
                            ...(e.target.checked ? { guide: false } : {}),
                          })
                        }
                      />
                      包含在原生导出
                    </label>
                    {current.kind === "line" && (
                      <label className="inline">
                        <input
                          type="checkbox"
                          checked={!!current.guide}
                          onChange={(e) =>
                            patch({
                              guide: e.target.checked,
                              exportIncluded: !e.target.checked,
                            })
                          }
                        />
                        作为辅助线
                      </label>
                    )}
                    <p className="hint">
                      眼睛图标控制编辑器显隐；独立预览和原生输出按导出开关显示。
                    </p>
                    <label className="inline">
                      <input
                        type="checkbox"
                        checked={current.aod}
                        onChange={(e) => patch({ aod: e.target.checked })}
                      />
                      在息屏布局显示
                    </label>
                    {current.aod && current.kind !== "image" && (
                      <>
                        <label>
                          息屏颜色
                          <input
                            aria-label="息屏颜色"
                            type="color"
                            value={current.aodColor || "#777777"}
                            onChange={(e) =>
                              patch({ aodColor: e.target.value })
                            }
                          />
                        </label>
                        {["text", "time", "date", "metric"].includes(
                          current.kind,
                        ) && (
                          <label>
                            息屏字号
                            <input
                              aria-label="息屏字号"
                              type="number"
                              min={1}
                              max={200}
                              value={current.aodSize || current.size}
                              onChange={(e) =>
                                patch({
                                  aodSize: Math.max(
                                    1,
                                    Math.min(200, Number(e.target.value) || 1),
                                  ),
                                })
                              }
                            />
                          </label>
                        )}
                        {(current.kind === "ring" ||
                          (current.kind === "metric" &&
                            current.source === "seconds")) && (
                          <label>
                            息屏秒数与动画
                            <select
                              aria-label="息屏秒数与动画"
                              value={current.aodSeconds || "zero"}
                              onChange={(e) =>
                                patch({
                                  aodSeconds: e.target
                                    .value as Layer["aodSeconds"],
                                })
                              }
                            >
                              <option value="zero">固定 00 / 圆环全暗</option>
                              <option value="hide">隐藏</option>
                            </select>
                          </label>
                        )}
                      </>
                    )}
                    <p className="hint">
                      息屏预览仅作布局参考，导出时还需验证像素占用与字体。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="hint">
                      选择一个图层，调整它的位置、外观与数据来源。
                    </p>
                    {p.layoutGuide && (
                      <div>
                        <h4>布局指导</h4>
                        <p>
                          布局：{p.layoutGuide.presetId} · 正文建议{" "}
                          {p.layoutGuide.minFontPx}px · 数字建议{" "}
                          {p.layoutGuide.numberFontPx}px
                        </p>
                        <label className="inline">
                          <input
                            type="checkbox"
                            checked={p.layoutGuide.showGuide}
                            onChange={(e) =>
                              setP({
                                ...p,
                                layoutGuide: {
                                  ...p.layoutGuide!,
                                  showGuide: e.target.checked,
                                },
                              })
                            }
                          />
                          显示编辑器安全圈
                        </label>
                      </div>
                    )}
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
                          当前模型：{generationProfile?.name || "尚未配置"} ·{" "}
                          {generationProfile?.model || "请选择模型 ID"}
                        </p>
                        <label>
                          本次生成模型
                          <select
                            aria-label="本次生成模型"
                            disabled={busy}
                            value={generationProfile?.id || ""}
                            onChange={(e) =>
                              setGenerationProfileId(e.target.value)
                            }
                          >
                            {!profiles.length && (
                              <option value="">请先配置模型</option>
                            )}
                            {profiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name} · {profile.model}
                              </option>
                            ))}
                          </select>
                        </label>
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
                        {generationFailure && (
                          <details className="generation-failure" open>
                            <summary>
                              生成失败：{generationFailure.message}
                            </summary>
                            <p>
                              原设计及已应用代码保持不变。原文仅保留在当前页面，不自动发送到编译服务。
                            </p>
                            <textarea
                              ref={rawOutput}
                              aria-label="模型原始返回"
                              readOnly
                              value={generationFailure.raw}
                            />
                            <button
                              onClick={async () => {
                                try {
                                  if (navigator.clipboard)
                                    await navigator.clipboard.writeText(
                                      generationFailure.raw,
                                    );
                                  else {
                                    rawOutput.current?.select();
                                    if (!document.execCommand("copy"))
                                      throw Error("请选择原文并按 Ctrl+C 复制");
                                  }
                                  setNotice("已复制原始返回");
                                } catch {
                                  rawOutput.current?.select();
                                  setNotice("请选择原文并按 Ctrl+C 复制");
                                }
                              }}
                            >
                              复制原始返回
                            </button>
                            <button onClick={() => setGenerationFailure(null)}>
                              清除失败原文
                            </button>
                          </details>
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
                        onChange={(e) => {
                          setFileIndex(Number(e.target.value));
                          setCodeLine(null);
                        }}
                      >
                        {shownFiles.map((f, i) => (
                          <option key={f.path} value={i}>
                            {f.path}
                          </option>
                        ))}
                      </select>
                      <pre>
                        {(
                          shownFiles[fileIndex]?.content ||
                          "AI 生成后可在这里审阅工程代码。"
                        )
                          .split("\n")
                          .map((line, index) => (
                            <span key={index} data-line={index + 1}>
                              {codeLine === index + 1 ? (
                                <mark>{line}</mark>
                              ) : (
                                line
                              )}
                              {"\n"}
                            </span>
                          ))}
                      </pre>
                      {!codeFromBuild && files.length > 0 && (
                        <button
                          className="primary"
                          onClick={() => {
                            if (genRevision !== p.revision) {
                              setNotice("生成期间设计已变化，请重新生成");
                              return;
                            }
                            try {
                              if (
                                p.files.length &&
                                (p.codeProvenance?.primary || "unknown") !==
                                  pendingProvenance.primary &&
                                !confirm(
                                  "切换生成来源并应用？当前代码会保留快照；设计画布不会改变。",
                                )
                              )
                                return;
                              setP(addCodeVersion(p, files, pendingProvenance));
                            } catch (error) {
                              setNotice((error as Error).message);
                              return;
                            }
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
                          新建编译任务
                        </button>
                        {buildId && (
                          <button disabled={busy} onClick={resumeBuild}>
                            继续观察原任务
                          </button>
                        )}
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
                      <pre>
                        {logs.split("\n").map((line, index) => {
                          const location = diagnostic(line);
                          return (
                            <span
                              key={index}
                              className={
                                /\bERROR\b|编译失败/i.test(line)
                                  ? "log-error"
                                  : /\bWARNING\b/i.test(line)
                                    ? "log-warning"
                                    : ""
                              }
                            >
                              {line}
                              {location && (
                                <button
                                  className="log-location"
                                  onClick={() =>
                                    locateDiagnostic(
                                      location.path,
                                      location.line,
                                    )
                                  }
                                >
                                  打开 {location.path}:{location.line}
                                </button>
                              )}
                              {"\n"}
                            </span>
                          );
                        })}
                      </pre>
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
                      <h4>设计快照</h4>
                      <p>
                        最多 10 个 /
                        20MB；恢复后需要重新生成代码，当前设计和代码快照分别管理。
                      </p>
                      <button
                        onClick={() => {
                          const name = prompt(
                            "设计快照名称",
                            "设计 " + new Date().toLocaleString(),
                          );
                          if (!name?.trim()) return;
                          try {
                            setP(saveDesignSnapshot(p, name.trim()));
                          } catch (error) {
                            setNotice((error as Error).message);
                          }
                        }}
                      >
                        保存设计快照
                      </button>
                      {(p.designSnapshots || []).map((snapshot) => (
                        <div key={snapshot.id}>
                          <span>{snapshot.name}</span>
                          <button
                            aria-label={`恢复设计快照 ${snapshot.name}`}
                            onClick={() => {
                              if (
                                !confirm(
                                  "恢复此设计快照将替换当前画布和素材，代码将标记过期。请先保存需要保留的设计。",
                                )
                              )
                                return;
                              try {
                                setP(restoreDesignSnapshot(p, snapshot.id));
                                setPast([]);
                                setFuture([]);
                                selectOne("");
                              } catch (error) {
                                setNotice((error as Error).message);
                              }
                            }}
                          >
                            恢复设计
                          </button>
                          <button
                            aria-label={`${snapshot.pinned ? "取消固定" : "固定"}设计快照 ${snapshot.name}`}
                            onClick={() =>
                              setP({
                                ...p,
                                designSnapshots: p.designSnapshots?.map(
                                  (item) =>
                                    item.id === snapshot.id
                                      ? { ...item, pinned: !item.pinned }
                                      : item,
                                ),
                              })
                            }
                          >
                            {snapshot.pinned ? "取消固定" : "固定"}
                          </button>
                          <button
                            aria-label={`删除设计快照 ${snapshot.name}`}
                            disabled={
                              snapshot.pinned ||
                              snapshot.id === p.activeDesignSnapshot
                            }
                            onClick={() =>
                              setP({
                                ...p,
                                designSnapshots: p.designSnapshots?.filter(
                                  (item) => item.id !== snapshot.id,
                                ),
                              })
                            }
                          >
                            删除
                          </button>
                        </div>
                      ))}
                      <h4>代码快照</h4>
                      <p>
                        代码历史：{p.versions.length}/20 个，上限
                        10MB。当前版本和固定版本受保护；请在清理前导出所需工程。
                      </p>
                      <button
                        onClick={() => {
                          try {
                            setP(retainHistory(p));
                            halted.current.delete(p.id);
                            setSaveError("");
                            setSaveAttempt((n) => n + 1);
                            setNotice("已按上限清理最旧的未固定历史");
                          } catch (error) {
                            setNotice((error as Error).message);
                          }
                        }}
                      >
                        清理超限的未固定历史
                      </button>
                      {p.versions.length ? (
                        p.versions.map((v, i) => (
                          <div key={i}>
                            <Code2 size={16} />
                            代码版本 {v.revision} ·{" "}
                            {v.provenance?.primary || "unknown"}{" "}
                            {v.provenance?.generatorVersion || ""}
                            <span>{new Date(v.at).toLocaleString()}</span>
                            <button
                              onClick={() => {
                                if (
                                  confirm("恢复此代码快照？设计画布不会改变。")
                                )
                                  setP({
                                    ...p,
                                    files: v.files,
                                    codeProvenance: v.provenance || {
                                      primary: "unknown",
                                    },
                                    codeRevision: v.revision,
                                    activeCodeVersion: v.id,
                                    assets: v.assets
                                      ? structuredClone(v.assets)
                                      : p.assets,
                                  });
                              }}
                            >
                              恢复代码
                            </button>
                            <button
                              aria-label={`${v.pinned ? "取消固定" : "固定"}代码版本 ${i + 1}`}
                              onClick={() =>
                                setP({
                                  ...p,
                                  versions: p.versions.map((item, index) =>
                                    index === i
                                      ? { ...item, pinned: !item.pinned }
                                      : item,
                                  ),
                                })
                              }
                            >
                              {v.pinned ? "取消固定" : "固定"}
                            </button>
                            <button
                              aria-label={`删除代码版本 ${i + 1}`}
                              disabled={v.pinned || v.id === activeVersion(p)}
                              onClick={() =>
                                setP({
                                  ...p,
                                  versions: p.versions.filter(
                                    (_, index) => index !== i,
                                  ),
                                })
                              }
                            >
                              删除
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
              <span>模型：{generationProfile?.name || "未配置"}</span>
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
