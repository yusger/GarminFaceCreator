import {prepareVisualKit} from "./visualKits";
import BitmapTypographyPanel from "./BitmapTypographyPanel";
import {bitmapLayerPatch,bitmapTypographyReset} from "./bitmapFontLayout.ts";
import {meterSources,meterDefaultGoal} from "./meters.ts";
import ChartInspector from "./ChartInspector";
import {acceptGeneratedProvenance} from "./generationContext";
import {generationDiagnostics} from "./generationDiagnostics";
import NativeVerificationPanel from "./NativeVerificationPanel";
import DiagnosticExport from "./DiagnosticExportPanel";
import {createStateGroup} from "./stateMapping";
import { sourceMapFor, mappedDiagnostic } from "./sourceMap";
import ReadoutInspector from "./ReadoutInspector";
import ResourceInspector from "./ResourceInspector";
import GenerationChecks from "./GenerationChecks";
import PolygonEditor from "./PolygonEditor";
import FontLibrary from "./FontLibraryPanel";
import ArrangeTools from "./ArrangeTools";
import DesignChat from "./DesignChatPanel";
import {chatFingerprint} from "./designChat";
import {resizeModelLayers} from "./selection";
import CompoundInspector from "./CompoundInspector";
import WidgetPicker from "./WidgetPicker";
import {insertWidget,cloneCompound,decomposeWidget,combineLayers} from "./widgets";
import {editorFrame,withEditorLayers,type EditorFrame} from "./editorHistory";
import { handImageSets,handImagePatch,createHandImageSet } from "./handImages";
import { handStyles,handStylePatch } from "./handStyles";
import TemplatePicker from "./TemplatePicker";
import { buildFetch, downloadBuild } from "./buildAccess";
import AiCreateWatchface from "./AiCreateWatchface";
import {resolvedLayerEdits,themeLayers} from "./themes";
import WatchfaceControls from "./WatchfaceControls";
import { resolveControls, setControl } from "./projectControls";
import { preparedCodeFiles } from "./chalkFonts";
import { referenceAttribution } from "./attribution";
import VisibilityEditor from "./VisibilityEditor";
import AdaptationAssistant from "./AdaptationAssistant";
import { adaptationFingerprint, applyAdaptation } from "./adaptation";
import DeviceAdaptations from "./DeviceAdaptations";
import {
  clearDeviceCode,
  reconcileDevices,
  deviceKey,
  projectForDevice,
} from "./multiDevice";
import ReferenceDetails from "./ReferenceDetails";
import IconDetails from "./IconDetails";
import IconGallery from "./IconGallery";
import { rasterIcon, preparedAssets, type LibraryIcon } from "./iconLibrary";
import RepairPanel from "./RepairPanel";
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
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
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
  HelpCircle,
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
const HelpAbout=lazy(()=>import("./HelpAbout"));
const tools = [
  ["time", "时间", Clock],
  ["date", "日期", Calendar],
  ["metric", "数据", Heart],
  ["image", "图片", Image],
  ["ring", "圆环", RotateCw],
  ["meter", "目标仪表", SlidersHorizontal],
  ["calendar", "三周日历", Calendar],
  ["chart", "历史图表", SlidersHorizontal],
  ["celestial", "昼夜场景", Circle],
  ["moon", "月相", Circle],
  ["hand", "指针", Clock],
  ["wordTime", "文字报时", Type],
  ["rect", "矩形", Square],
  ["polygon", "多边形", Square],
  ["text", "文字", Type],
  ["arcText", "曲线文字", Type],
  ["circle", "圆形", Circle],
  ["line", "直线", Minus],
] as const;
export default function App() {
  const [statePreset,setStatePreset]=useState<"heartRate"|"battery">("heartRate");
  const [handImageSet,setHandImageSet]=useState("hand-atelier/silver-sword");
  const [libraryTemplate,setLibraryTemplate]=useState("monolith");
  const [newProject, setNewProject] = useState<{
    name: string;
    blank: boolean;
    templateId?: string;
  } | null>(null);
  const [page, setPage] = useState("projects");
  const [aiCreating, setAiCreating] = useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [fontsOpen,setFontsOpen]=useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSection, setProjectSection] = useState<"builtins" | "mine">(
    () => {
      try {
        return sessionStorage.getItem("gfc-project-section") === "mine"
          ? "mine"
          : "builtins";
      } catch {
        return "builtins";
      }
    },
  );
  function selectProjectSection(section: "builtins" | "mine") {
    setProjectSection(section);
    try {
      sessionStorage.setItem("gfc-project-section", section);
    } catch {
      /* Navigation remains usable without session storage. */
    }
  }
  const [p, setProjectState] = useState<Project | null>(null);
  function setP(next: Project | null) {
    setProjectState((previous) => {
      try {
        return reconcileDevices(previous, next);
      } catch (error) {
        queueMicrotask(() => setNotice((error as Error).message));
        return previous;
      }
    });
  }
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
  const [batchBusy, setBatchBusy] = useState(false);
  const [showAdaptation, setShowAdaptation] = useState(false);
  const [batchResults, setBatchResults] = useState<
    {
      key: string;
      label: string;
      status: string;
      buildId?: string;
      artifacts?: { url: string; fileName?: string }[];
    }[]
  >([]);
  const generationLock = useRef(false);
  const [genProjectId, setGenProjectId] = useState("");
  const [pendingProvenance, setPendingProvenance] = useState<CodeProvenance>({
    primary: "ai",
  });
  const [buildId, setBuildId] = useState("");
  const [artifacts, setArtifacts] = useState<
    { id: string; url: string; fileName?: string }[]
  >([]);
  const buildSourceIdentity = useRef<{projectId:string;target?:string;deviceSize?:string;files:string;revision:number}|null>(null);
  const layerSourceMap = useMemo(()=>sourceMapFor(p?.files || []),[p?.files]);
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
  const [past, setPast] = useState<EditorFrame[]>([]);
  const [future, setFuture] = useState<EditorFrame[]>([]);
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
  const current = p
    ? resolveControls(p).layers.find((l) => l.id === selected)
    : undefined;
  const textMeasure = useRef<CanvasRenderingContext2D | null>(null);
  textMeasure.current ||= document.createElement("canvas").getContext("2d");
  const boundaryWarnings = (p?.layers || []).filter((l) => {
    if (!["text", "time", "date", "metric", "wordTime", "chart"].includes(l.kind))
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
        setProjects((current) => [
          ...items.filter(isReference),
          ...current.filter((x) => !isReference(x)),
          ...items.filter(
            (x) => !isReference(x) && !current.some((c) => c.id === x.id),
          ),
        ]);
        if (items.length && !activeProject.current) {
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
        const copy = clearDeviceCode({
          ...structuredClone(p),
          id: uid(),
          appId: uid().replaceAll("-", ""),
          name: p.name + " 冲突副本",
          updated: Date.now(),
          storageVersion: 0,
          files: [],
          versions: [],
          codeRevision: -1,
        });
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
  function editLayers(layers: Layer[], record = true, base = p) {
    if (!p || !base) return;
    if (record) {
      setPast((x) => [...x.slice(-49), editorFrame(p)]);
      setFuture([]);
    }
    const nextProject={
      ...withEditorLayers(base,layers),
      revision:p.revision+((renderChanged(p.layers,layers)||base.backgroundColor!==p.backgroundColor||JSON.stringify(base.controlValues)!==JSON.stringify(p.controlValues))?1:0),
      updated:Date.now(),
    };
    activeProject.current=nextProject;
    setP(nextProject);
    return nextProject;
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
      setPast((items) => [...items.slice(-49), editorFrame(activeProject.current!,edit.before)]);
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
    for (const c of p.controls || [])
      for (const t of c.targets.filter((t) => t.layerId === selected)) {
        const value =
          t.property === "source"
            ? v.source
            : t.property === "color"
              ? v.color
              : undefined;
        if (value !== undefined) {
          try {
            setP(setControl(p, c.id, value));
          } catch (e) {
            setNotice((e as Error).message);
          }
          return;
        }
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
    const frame = from[from.length - 1];
    const layers = frame.layers;
    if (redo) {
      setPast([...past, editorFrame(p)]);
      setFuture(future.slice(0, -1));
    } else {
      setFuture([...future, editorFrame(p)]);
      setPast(past.slice(0, -1));
    }
    selectOne((id) => (layers.some((l) => l.id === id) ? id : ""));
    setP({
      ...p,
      ...frame,
      revision: p.revision + ((renderChanged(p.layers, layers)||JSON.stringify(p.controls)!==JSON.stringify(frame.controls)||JSON.stringify(p.controlValues)!==JSON.stringify(frame.controlValues)) ? 1 : 0),
      updated: Date.now(),
    });
  }
  function open(item: Project) {
    if (batchBusy) {
      setNotice("请等待设备编译队列结束后切换项目。");
      return;
    }
    setBatchResults([]);
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
    selectProjectSection("mine");
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
    try {
      const layout=choice?applyLayout(base,choice):base;
      const item=await prepareVisualKit(layout,choice?.presetId.startsWith("template:")?choice.presetId.slice(9):undefined);
      item.storageVersion = await saveProject(item);
      setProjects((items) => [item, ...items]);
      setNewProject(null);
      open(item);
    } catch(e) {
      setNotice("项目创建失败："+(e as Error).message);
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
          ...cloneCompound(l),
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
    // Scene may supply a transparent hit area; editing always starts from the stored object.
    const stored = p?.layers.find(item => item.id === l.id);
    if (!stored) return;
    l = stored;
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
      let w = Math.max(10, d.original.w + (left ? -localX : localX));
      let h = Math.max(10, d.original.h + (top ? -localY : localY));
      if(d.original.kind==="widget"){const ratio=Math.max(10/d.original.w,10/d.original.h,Math.abs(w/d.original.w-1)>Math.abs(h/d.original.h-1)?w/d.original.w:h/d.original.h);w=d.original.w*ratio;h=d.original.h*ratio;}
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
    d.latest = resizeModelLayers(d.before,d.id,changed);
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
    setPast((items) => [...items.slice(-49), editorFrame(d.project,d.before)]);
    setFuture([]);
    setP({
      ...d.project,
      layers: d.latest,
      revision: d.project.revision + 1,
      updated: Date.now(),
    });
  }
  async function insertLibraryIcon(icon: LibraryIcon) {
    if (!p) return;
    const projectId = p.id;
    try {
      const l = {
        ...layer("image"),
        name: icon.name,
        w: 64,
        h: 64,
        x: 195,
        y: 195,
        color: "#45d6be",
        libraryIcon: { id: icon.id, recolor: false, strokeWidth: 2 },
      };
      const png = await rasterIcon(l, p);
      if (activeProject.current?.id !== projectId) return;
      const latest = activeProject.current;
      setPast((items) => [...items.slice(-49), editorFrame(latest)]);
      setFuture([]);
      setP({
        ...latest,
        layers: [...latest.layers, { ...l, image: png }],
        revision: latest.revision + 1,
        updated: Date.now(),
      });
      selectOne(l.id);
    } catch (e) {
      setNotice((e as Error).message);
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
  function requireDeviceScope() {
    if (
      p?.multiDevice?.scope === "master" &&
      p.multiDevice.variants.some((v) => Object.keys(v.overrides).length)
    ) {
      setNotice("请切换到当前设备微调后生成或编译，确保包含设备专用配置。");
      return false;
    }
    return true;
  }
  function genLocal() {
    if (!p || busy || generationLock.current || !requireDeviceScope()) return;
    generationLock.current = true;
    try {
      const result = localGenerate(p);
      setFiles(result);
      setPendingProvenance(LOCAL_PROVENANCE);
      setGenRevision(p.revision);
      setGenProjectId(p.id);
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
    if (!p || busy || generationLock.current || !requireDeviceScope()) return;
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
    setGenProjectId(p.id);
    abort.current = new AbortController();
    try {
      const result = await generate(
        generationProfile,
        p,
        instruction,
        abort.current.signal,
      );
      if (activeProject.current?.id !== p.id) return;
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
  function generateAllDevices() {
    if (!p?.multiDevice || busy || batchBusy) return;
    if (
      !confirm(
        "为全部适配设备使用本地生成器生成并应用代码？不调用 AI。各设备原代码保留历史；任一设备不支持则全部保持原样。",
      )
    )
      return;
    try {
      const variants = p.multiDevice.variants.map((v) => {
        const resolved = projectForDevice(p, v.key),
          generated = addCodeVersion(
            resolved,
            localGenerate(resolved),
            LOCAL_PROVENANCE,
          );
        return {
          ...v,
          code: {
            files: generated.files,
            versions: generated.versions,
            codeRevision: generated.codeRevision,
            codeProvenance: generated.codeProvenance,
            activeCodeVersion: generated.activeCodeVersion,
          },
        };
      });
      const next = { ...p, multiDevice: { ...p.multiDevice, variants } };
      const active = variants.find((v) => v.key === deviceKey(p))!;
      // Restore the newly generated current code without recapturing the old code.
      setP({
        ...next,
        ...active.code,
        layers: projectForDevice(p, deviceKey(p)).layers,
        multiDevice: {
          ...next.multiDevice,
          scope: "device",
          viewVersion: (next.multiDevice.viewVersion || 0) + 1,
        },
      });
      setNotice(
        "全部设备代码已分别生成并应用，可以逐设备编译。系统字体仍需设备检查。",
      );
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  async function buildAllDevices() {
    if (!p?.multiDevice || busy || batchBusy) return;
    const targets = p.multiDevice.variants.map((v) =>
      projectForDevice(p, v.key),
    );
    if (targets.some((t) => !t.files.length || t.revision !== t.codeRevision)) {
      setNotice("部分设备尚未生成代码或代码已过期，请先生成全部设备代码。");
      return;
    }
    setBatchBusy(true);
    setBatchResults([]);
    try {
      for (const target of targets) {
        const result = await build(target);
        setBatchResults((items) => [
          ...items,
          {
            key: deviceKey(target),
            label: deviceLabel(target),
            status: result?.status || "提交失败",
            buildId: result?.buildId,
            artifacts: result?.artifacts?.filter((a: { url: string }) =>
              a.url.startsWith(`/api/builds/${result.buildId}/artifacts/`),
            ),
          },
        ]);
      }
    } finally {
      setBatchBusy(false);
    }
  }
  async function build(candidate?: Project) {
    const p = candidate || activeProject.current;
    if (!p || (!candidate && !requireDeviceScope())) return;
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
    buildSourceIdentity.current=null;
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
      (await preparedCodeFiles(p)).forEach((f) =>
        form.append(
          "files",
          new Blob([f.content], { type: "text/plain" }),
          f.path,
        ),
      );
      for (const asset of await preparedAssets(p))
        form.append(
          "files",
          await (await fetch(asset.data)).blob(),
          asset.path,
        );
      const r = await buildFetch("/api/builds", {
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
      buildSourceIdentity.current={projectId:p.id,target:p.target,deviceSize:p.deviceSize,files:JSON.stringify(p.files),revision:p.revision};
      setBuildId(job.buildId);
      const state = await observeBuild(job.buildId);
      const current = activeProject.current;
      if (current?.id === p.id && current.multiDevice)
        setP({
          ...current,
          multiDevice: {
            ...current.multiDevice,
            variants: current.multiDevice.variants.map((v) =>
              v.key === deviceKey(p)
                ? { ...v, buildId: job.buildId, buildStatus: state.status }
                : v,
            ),
          },
        });
      return { ...state, buildId: job.buildId };
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
        const stateResponse = await buildFetch(`/api/builds/${id}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!stateResponse.ok)
          throw Error(
            stateResponse.status === 404
              ? "任务已不存在或已过期"
              : "获取构建状态失败",
          );
        const state = await stateResponse.json();
        const logResponse = await buildFetch(
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
          return state;
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
  const builtinCount = projects.filter(isReference).length;
  const personalCount = projects.length - builtinCount;
  const visibleProjects = projects
    .filter((item) => isReference(item) === (projectSection === "builtins"))
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort(
      (a, b) =>
        Number(referenceAttribution(b.id)?.authorship === "self") -
        Number(referenceAttribution(a.id)?.authorship === "self"),
    );
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
          <img className="brand-mark" src="/brand/gfc-mark.svg" alt="GFC" width="36" height="36" />
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
              {page === "models" ? "设置 / 模型配置" : page === "help" ? "帮助 / 关于" : "你的表盘设计工作台"}
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
            <DeviceAdaptations
              project={p}
              disabled={busy || batchBusy}
              onChange={(next) => {
                setP(next);
                setPast([]);
                setFuture([]);
                selectOne("");
                setFiles([]);
                setGenProjectId("");
                setArtifacts([]);
                setBuildId("");
                setLogs("已切换适配上下文，请选择设备代码编译或重新生成。");
              }}
            />
            <span className="device">
              {deviceLabel(p)}{" "}
              <small>
                {deviceFor(p).pixels} × {deviceFor(p).pixels}
              </small>
            </span>
            <WatchfaceControls project={p} onChange={next=>{setPast(v=>[...v.slice(-49),editorFrame(p)]);setFuture([]);if(p.themes?.activeId!==next.themes?.activeId){setSelection([]);setSelected("");}setP(next);}} />
            <button onClick={()=>setChatOpen(v=>!v)} aria-pressed={chatOpen}><Sparkles size={15}/> AI 设计助手</button>
            <button onClick={() => setShowPreview(!showPreview)}>
              <Play size={14} />
              预览
            </button>
            <button
              disabled={busy || batchBusy}
              onClick={() => {
                setDrawer("AI");
              }}
            >
              <Sparkles size={15} />
              AI 生成代码
            </button>
            <button disabled={busy || batchBusy} onClick={genLocal}>
              本地生成（试验）
            </button>
            {p.multiDevice && (
              <>
                <button
                  disabled={busy || batchBusy}
                  onClick={() => setShowAdaptation(true)}
                >
                  AI 辅助适配
                </button>
                <button
                  disabled={busy || batchBusy}
                  onClick={generateAllDevices}
                >
                  生成全部设备代码
                </button>
                <button disabled={busy || batchBusy} onClick={buildAllDevices}>
                  编译全部设备
                </button>
              </>
            )}
            <button
              className="primary"
              disabled={busy || batchBusy}
              onClick={() => build()}
            >
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
      {page === "help" ? (
        <div className="app-layout help-layout">
          <nav className="sidebar help-sidebar" aria-label="工作区导航">
            <button onClick={()=>setPage("projects")}><Folder size={18}/>表盘项目</button>
            {p && <button onClick={()=>setPage("editor")}><MousePointer2 size={18}/>表盘编辑器</button>}
            <div className="nav-label">工作区设置</div>
            <button onClick={()=>setPage("models")}><Settings size={18}/>模型配置</button>
            <button className="active" aria-current="page"><HelpCircle size={18}/>帮助与关于</button>
            <p className="sidebar-note">设计保存在当前浏览器<br/>先备份，再迁移工作区</p>
          </nav>
          <Suspense fallback={<main className="help-loading" role="status">正在打开帮助…</main>}><HelpAbout onProjects={()=>setPage("projects")} onModels={()=>setPage("models")} onEditor={p?()=>setPage("editor"):undefined}/></Suspense>
        </div>
      ) : page === "models" ? (
        <div className="app-layout">
          <nav className="sidebar">
            <button onClick={() => setPage("projects")}>
              <Folder size={18} />
              项目
            </button>
            <button
              disabled={!ready && !p}
              onClick={() => (p ? setPage("editor") : create())}
            >
              <MousePointer2 size={18} />
              表盘编辑器
            </button>
            <div className="nav-label">工作区设置</div>
            <button className="active">
              <Settings size={18} />
              模型配置
            </button>
            <button onClick={()=>setPage("help")}><HelpCircle size={18}/>帮助与关于</button>
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
            <div className="sidebar-group-label">
              <Folder size={18} />
              表盘项目
            </div>
            <div className="project-submenu" role="group" aria-label="表盘项目">
              <button
                className={projectSection === "builtins" ? "active" : ""}
                aria-current={
                  projectSection === "builtins" ? "page" : undefined
                }
                aria-label="内置表盘"
                onClick={() => selectProjectSection("builtins")}
              >
                内置表盘 <small>{builtinCount}</small>
              </button>
              <button
                className={projectSection === "mine" ? "active" : ""}
                aria-current={projectSection === "mine" ? "page" : undefined}
                aria-label="我的表盘"
                onClick={() => selectProjectSection("mine")}
              >
                我的表盘 <small>{personalCount}</small>
              </button>
            </div>
            <button onClick={() => setPage("models")}>
              <Settings size={18} />
              模型配置
            </button>
            <button onClick={()=>setPage("help")}><HelpCircle size={18}/>帮助与关于</button>
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
                <button
                  disabled={!ready}
                  className="primary"
                  onClick={() => create()}
                >
                  <Plus size={16} />
                  新建表盘
                </button>
              </div>
            </div>
            <div className="project-filters">
              <b>
                {projectSection === "builtins" ? "内置表盘" : "我的表盘"}{" "}
                <small>
                  {projectSection === "builtins" ? builtinCount : personalCount}
                </small>
              </b>
              <input
                placeholder="搜索项目"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="project-grid">
              <button
                disabled={!ready}
                className="new-project"
                onClick={() => create(true)}
              >
                <div>
                  <Plus size={30} />
                </div>
                <b>空白画布</b>
                <span>让每一个像素都由你决定</span>
              </button>
              <button
                disabled={!ready}
                className="new-project ai-project-card"
                onClick={() => setAiCreating(true)}
              >
                <div>
                  <Sparkles size={30} />
                </div>
                <b>AI 创建表盘</b>
                <span>选择设备和数据，用参考图与描述生成设计</span>
              </button>
              {visibleProjects.map((item) => (
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
                  <ReferenceDetails id={item.referenceId || item.id} />
                  <div className="project-card-info">
                    <div>
                      <b>{item.name}</b>
                      {isReference(item) && (
                        <span className="project-badges">
                          <span className="reference-badge">
                            默认参考 · 不可删除
                          </span>
                          {referenceAttribution(item.id)?.authorship ===
                            "self" && (
                            <span className="authorship-badge">自主</span>
                          )}
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
            {ready &&
              projectSection === "mine" &&
              personalCount === 0 &&
              !search && (
                <div className="welcome">
                  <Sparkles size={20} />
                  <div>
                    <b>第一次使用？试试基础数字表盘</b>
                    <p>
                      内置时间、秒环和两个数据控件，所有元素都可以自由调整。
                    </p>
                  </div>
                  <button disabled={!ready} onClick={() => create()}>
                    使用示例 <Plus size={14} />
                  </button>
                </div>
              )}
            {ready && search && !visibleProjects.length && (
              <p className="hint">当前分类中没有匹配的表盘。</p>
            )}
            <p className="hint">
              {projectSection === "builtins"
                ? "内置参考项目不可删除。点击封面创建可编辑副本，可直接编译。"
                : "我的表盘保存在当前浏览器，可编辑、导出和删除。"}
              网页为近似或静态预览，实际效果以原生表盘为准。
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
                  <button title="帮助与关于" aria-label="帮助与关于" onClick={()=>setPage("help")}><HelpCircle size={21}/></button>
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
                    <ResourceInspector project={p} onLocate={selectOne}/>
                    {p.layers.some(l=>l.widgetOrigin&&l.groupId&&l.kind!=="widget")&&<p className="hint">部分历史控件含交错图层或跨组配置，已保留原结构以维持原效果。新添加的控件采用复合对象。</p>}
                    <WidgetPicker disabled={p.multiDevice?.scope === "device"} onInsert={id=>{try {const next=insertWidget(p,id);editLayers(next.layers,true,next);const added=next.layers.slice(p.layers.length);setSelection(added.map(l=>l.id));setSelected(added[0].id);setNotice("已添加复合控件；选中后在右侧配置内部部件。");}catch(e){setNotice((e as Error).message);}}}/>
                    <details><summary>布局模板</summary><TemplatePicker label="素材库布局模板" value={libraryTemplate} onChange={setLibraryTemplate}/><button disabled={!libraryTemplate} onClick={()=>setNewProject({name:"模板表盘",blank:true,templateId:libraryTemplate})}>使用模板创建表盘</button></details>
                    <details><summary>图片指针套装</summary><label>指针套装<select aria-label="指针套装" value={handImageSet} onChange={e=>setHandImageSet(e.target.value)}>{handImageSets.map(s=><option key={s.key} value={s.key}>{s.name}</option>)}</select></label><img width="130" height="130" alt="指针套装预览" src={handImageSets.find(s=>s.key===handImageSet)?.images.minute}/><button onClick={()=>{const items=createHandImageSet(handImageSet);editLayers([...p.layers,...items]);selectOne(items[0].id);}}>添加整套指针</button></details>
                    <IconGallery onInsert={insertLibraryIcon} />
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
                  <span>{themeLayers(p).length}</span>
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
                  layers={resolveControls(p).layers}
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
                  onChange={layers=>{const next=resolvedLayerEdits(p,layers);editLayers(next.layers,true,next);}}
                />
                <Palette
                  layers={resolveControls(p).layers}
                  selection={selection}
                  onChange={layers=>{const next=resolvedLayerEdits(p,layers);editLayers(next.layers,true,next);}}
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
                  <button disabled={selection.length < 2 || p.multiDevice?.scope === "device"} onClick={()=>{try{const next=combineLayers(p,selection);editLayers(next.layers,true,next);selectOne(next.layers.find(l=>!p.layers.some(old=>old.id===l.id))!.id);}catch(e){setNotice((e as Error).message);}}}>合为复合控件</button>
                  <select aria-label="数据状态预设" value={statePreset} onChange={e=>setStatePreset(e.target.value as "heartRate"|"battery")}><option value="heartRate">心率四态</option><option value="battery">电量三态</option></select><button disabled={!current || current.kind==="widget" || !!p.multiDevice} onClick={()=>{try{const next=createStateGroup(p,current!.id,statePreset);editLayers(next.layers,true,next);selectOne(next.layers.find(l=>!p.layers.some(old=>old.id===l.id))!.id);}catch(e){setNotice((e as Error).message);}}}>生成数据状态组</button>
                  <ArrangeTools project={p} selection={selection} onError={setNotice} onChange={next=>editLayers(next.layers,true,next)}/>
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
              {current?.kind==="image"&&!current.libraryIcon&&<label className="inline"><input type="checkbox" checked={!!current.iconMask} onChange={e=>patch({iconMask:e.target.checked})}/>透明位图作为可换色单色图标（最大128px）</label>}
              {fontsOpen && current && <FontLibrary layer={current} project={p} onClose={()=>setFontsOpen(false)} onImport={f=>{if(!current||current.locked)throw Error("请先解锁图层");const fonts=[...(p.localFonts||[]).filter(x=>x.id!==f.id),f];const next={...p,localFonts:fonts};validateProject(next);editLayers(p.layers.map(l=>l.id===current.id?{...l,...bitmapTypographyReset,bitmapFontId:undefined,customFont:{id:f.id,family:f.family,file:f.file},fontWeight:400 as const,garminFont:"auto" as const}:l),true,next);}} onBitmapImport={f=>{if(!current||current.locked)throw Error("请先解锁图层");const next={...p,bitmapFonts:[...(p.bitmapFonts||[]).filter(x=>x.id!==f.id),f]};validateProject(next);editLayers(p.layers.map(l=>l.id===current.id?{...l,...bitmapLayerPatch(next,f.id)}:l),true,next);}} onApply={patch}/>}
              <DesignChat key={p.id} project={p} preview={preview} profiles={profiles} selection={selection} open={chatOpen} disabled={busy||batchBusy} onClose={()=>setChatOpen(false)} onModels={()=>setPage("models")} canUndo={!!past.length} onUndo={()=>undo()} onApply={(fingerprint,next)=>{
                const latest=activeProject.current;
                if(!latest||chatFingerprint(latest)!==fingerprint)throw Error("等待期间设计已变化，本轮未应用；请基于最新设计重新发送。");
                if(chatFingerprint(next)!==fingerprint){const applied=editLayers(next.layers,true,next);selectOne("");return applied!;}
                return latest;
              }}/>
              <aside
                className="inspector"
                onFocusCapture={beginProperty}
                onBlurCapture={endProperty}
              >
                <GenerationChecks project={p} onLocate={selectOne}/>
                <DiagnosticExport key={p.id} project={p} secrets={profiles.map(v=>v.key)} logs={buildSourceIdentity.current?.projectId===p.id ? logs : undefined} preview={preview} mode={aod?"aod":"active"}/>
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
                {current?.kind==="widget" ? (<CompoundInspector key={current.id} layer={current} project={p} onChange={patch} onDecompose={()=>{try{const next=decomposeWidget(p,current.id);editLayers(next.layers,true,next);selectOne(next.layers.find(l=>!p.layers.some(old=>old.id===l.id))?.id||"");setNotice("已拆解为基础图层，可撤销恢复复合控件。");}catch(e){setNotice((e as Error).message);}}}/>) : current ? (
                  <>
                    <label>
                      图层名称
                      <input
                        value={current.name}
                        onChange={(e) => patch({ name: e.target.value })}
                      />
                    </label>
                    <label>
                      原生效果说明
                      <textarea
                        aria-label="原生效果说明"
                        rows={3}
                        maxLength={2000}
                        value={current.effectPrompt || ""}
                        onChange={(e) =>
                          patch({ effectPrompt: e.target.value })
                        }
                        placeholder="可选：描述需要AI在生成工程时实现的额外效果。"
                      />
                    </label>
                    {current.effectPrompt?.trim() && (
                      <p className="hint">
                        网页显示基础布局；效果在AI生成工程时实现。本地生成不会执行此说明。
                      </p>
                    )}
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
                              disabled={k==="size"&&!!current.bitmapFontId}
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
                    {current.libraryIcon && (
                      <>
                        <p className="hint">
                          素材 ID：{current.libraryIcon.id}
                          。颜色由上方颜色控制；天气 Flat/Line 默认保留原色。
                        </p>
                        <label className="inline">
                          <input
                            type="checkbox"
                            aria-label="素材统一颜色"
                            checked={current.libraryIcon.recolor}
                            onChange={(e) =>
                              patch({
                                libraryIcon: {
                                  ...current.libraryIcon!,
                                  recolor: e.target.checked,
                                },
                              })
                            }
                          />
                          统一素材颜色
                        </label>
                        {current.libraryIcon.id.startsWith("lucide_") && (
                          <label>
                            图标线宽
                            <input
                              type="number"
                              aria-label="图标线宽"
                              min="0.5"
                              max="8"
                              step="0.5"
                              value={current.libraryIcon.strokeWidth}
                              onChange={(e) =>
                                patch({
                                  libraryIcon: {
                                    ...current.libraryIcon!,
                                    strokeWidth: Math.max(
                                      0.5,
                                      Math.min(8, Number(e.target.value) || 2),
                                    ),
                                  },
                                })
                              }
                            />
                          </label>
                        )}
                        {current.libraryIcon.id.startsWith(
                          "meteocons_0_1_0_monochrome_",
                        ) && (
                          <>
                            <label className="inline">
                              <input
                                aria-label="绑定实时天气"
                                type="checkbox"
                                checked={!!current.weatherIcon}
                                onChange={(e) =>
                                  patch({
                                    weatherIcon: e.target.checked
                                      ? { period: "day" }
                                      : undefined,
                                  })
                                }
                              />
                              绑定 Garmin 缓存天气
                            </label>
                            {current.weatherIcon && (
                              <>
                                <label>
                                  昼夜图标
                                  <select
                                    aria-label="天气昼夜样式"
                                    value={current.weatherIcon.period}
                                    onChange={(e) =>
                                      patch({
                                        weatherIcon: {
                                          period: e.target.value as
                                            "day" | "night",
                                        },
                                      })
                                    }
                                  >
                                    <option value="day">日间</option>
                                    <option value="night">夜间</option>
                                  </select>
                                </label>
                                <p className="hint">
                                  昼夜样式手动选择；缺失或未知天气显示缺失图标。严重天气用概括图形，不替代天气警报。
                                </p>
                              </>
                            )}
                          </>
                        )}
                        <IconDetails id={current.libraryIcon.id} />
                      </>
                    )}
                    {["rect", "circle", "line", "polygon"].includes(current.kind) && (
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
                    {current.kind === "polygon" && <PolygonEditor points={current.polygonPoints!} onChange={polygonPoints=>patch({polygonPoints})}/>}
                    {current.kind === "arcText" && <fieldset><legend>曲线文字</legend><label>文字内容<input aria-label="曲线文字内容" value={current.text} maxLength={80} onChange={e=>patch({text:e.target.value})}/></label><label>半径比例<input aria-label="曲线半径比例" type="number" min={0.05} max={0.5} step={0.01} value={current.arcRadius??0.4} onChange={e=>patch({arcRadius:Math.max(0.05,Math.min(0.5,Number(e.target.value)||0.05))})}/></label><label>起始角<input aria-label="曲线起始角" type="number" min={-360} max={360} value={current.arcStartAngle??0} onChange={e=>patch({arcStartAngle:Math.max(-360,Math.min(360,Number(e.target.value)||0))})}/></label><label>方向<select aria-label="曲线方向" value={current.arcDirection||"clockwise"} onChange={e=>patch({arcDirection:e.target.value as "clockwise"|"counterclockwise"})}><option value="clockwise">顺时针</option><option value="counterclockwise">逆时针</option></select></label><label>字距<input aria-label="曲线字距" type="number" min={0} max={12} step={0.1} value={current.arcSpacing??0} onChange={e=>patch({arcSpacing:Math.max(0,Math.min(12,Number(e.target.value)||0))})}/></label><label>沿弧对齐<select aria-label="曲线文字对齐" value={current.textAlign||"center"} onChange={e=>patch({textAlign:e.target.value as Layer["textAlign"]})}><option value="left">从起始角开始</option><option value="center">在起始角居中</option><option value="right">在起始角结束</option></select></label><small>0°在12点；半径为宽高中较短边的比例。首版原生仅Venu4、常规设备矢量字体、6–80字号、80字内英文/数字；网页替代字形有差异。每项目最多8层，保守预算限一圈。底部正向阅读可选180°和逆时针。</small></fieldset>}
                    {current.kind === "wordTime" && (
                      <>
                        <label>
                          报时语言
                          <select
                            aria-label="报时语言"
                            value={current.wordLanguage || "en"}
                            onChange={(e) =>
                              patch({
                                wordLanguage: e.target
                                  .value as Layer["wordLanguage"],
                                garminFont:
                                  e.target.value === "zh"
                                    ? "systemXTiny"
                                    : "xtiny",
                              })
                            }
                          >
                            <option value="en">English</option>
                            <option value="zh">简体中文</option>
                          </select>
                        </label>
                        <label>
                          报时行
                          <select
                            aria-label="报时行"
                            value={current.wordRow || "all"}
                            onChange={(e) =>
                              patch({
                                wordRow: e.target.value as Layer["wordRow"],
                              })
                            }
                          >
                            <option value="all">完整三行</option>
                            <option value="top">上行</option>
                            <option value="middle">中行</option>
                            <option value="bottom">下行</option>
                          </select>
                        </label>
                        <p className="hint">
                          按最接近的五分钟报时，三行文字动态更新。中文需设备支持对应字形，建议本地化系统字体并在中文系统下检查；不分发字体。
                        </p>
                      </>
                    )}
                    {current.kind === "hand" && (
                      <>
                        <h4>指针</h4>
                        <label>
                          时间绑定
                          <select
                            aria-label="指针时间绑定"
                            value={current.handType || "hour"}
                            onChange={(e) =>
                              patch({
                                handType: e.target.value as Layer["handType"],
                                handReach:
                                  e.target.value === "hour"
                                    ? 0.58
                                    : e.target.value === "minute"
                                      ? 0.79
                                      : 0.88,
                                aod: e.target.value !== "second",
                              })
                            }
                          >
                            <option value="hour">时针</option>
                            <option value="minute">分针</option>
                            <option value="second">秒针</option>
                          </select>
                        </label>
                        <label>指针样式<select aria-label="指针样式" value={current.handBitmap?"bitmap:"+current.handBitmap.packId+"/"+current.handBitmap.setId:current.handShape?.id||""} onChange={e=>patch(e.target.value.startsWith("bitmap:")?handImagePatch(e.target.value.slice(7),current.handType):handStylePatch(e.target.value))}><option value="">直线</option>{handStyles.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{handImageSets.map(s=><option key={s.key} value={"bitmap:"+s.key}>{s.name} · 图片</option>)}</select></label>
                        {current.handBitmap&&<p className="hint">图片指针保留原始配色；控件宽高决定尺寸，几何长度与线宽设置只作用于矢量样式。息屏使用灰色。</p>}
                        {current.handShape&&<img width="70" height="130" src={"/hand-styles/"+current.handShape.id+"/preview.svg"} alt="指针样式预览"/>}
                        {(
                          [
                            ["handPivotX", "转动中心 X", 0.5, 0, 1],
                            ["handPivotY", "转动中心 Y", 0.5, 0, 1],
                            ["handReach", "指针长度比例", 0.58, 0.1, 1],
                            ["handTail", "针尾比例", 0.08, 0, 0.3],
                          ] as const
                        ).map(([key, label, value, min, max]) => (
                          <label key={key}>
                            {label}
                            <input
                              aria-label={label}
                              type="number"
                              min={min}
                              max={max}
                              step={0.01}
                              value={current[key] ?? value}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (Number.isFinite(n) && n >= min && n <= max)
                                  patch({ [key]: n });
                              }}
                            />
                          </label>
                        ))}
                        <label>
                          指针线宽
                          <input
                            aria-label="指针线宽"
                            type="number"
                            min={1}
                            max={20}
                            value={current.strokeWidth || 6}
                            onChange={(e) =>
                              patch({
                                strokeWidth: Math.max(
                                  1,
                                  Math.min(20, Number(e.target.value) || 1),
                                ),
                              })
                            }
                          />
                        </label>
                        <p className="hint">
                          转动中心为控件宽高的 0–1
                          比例；长度以中心到最近边缘的安全半径为基准。靠近边缘时会缩短以保持在控件内。使用设备本地时间，时针/分针包含当前分秒进度；秒针默认息屏隐藏，息屏保留时固定
                          12
                          点或隐藏。不添加秒计时器；本地生成暂不支持非零整体旋转。
                        </p>
                      </>
                    )}
                    {current.kind==="moon"&&<fieldset><legend>月相估算</legend><label>示意方向<select aria-label="月相示意方向" value={current.moonHemisphere||"north"} onChange={e=>patch({moonHemisphere:e.target.value as "north"|"south"})}><option value="north">北半球示意</option><option value="south">南半球示意（镜像）</option></select></label><label>暗面颜色<input aria-label="月相暗面颜色" type="color" value={current.solarNightColor||"#263344"} onChange={e=>patch({solarNightColor:e.target.value})}/></label><small>UTC地心估算，2000–2037；10分钟缓存。方向为示意，不代表本地天空倾角。16–128设计单位、不透明；息屏只画轮廓。</small></fieldset>}
                    {current.kind === "celestial" && (
                      <>
                        <h4>昼夜场景</h4>
                        <label>
                          场景部分
                          <select
                            aria-label="场景部分"
                            value={current.solarPart || "sky"}
                            onChange={(e) =>
                              patch({
                                solarPart: e.target.value as Layer["solarPart"],
                                color:
                                  e.target.value === "body"
                                    ? "#ffce60"
                                    : "#326a88",
                                solarNightColor:
                                  e.target.value === "body"
                                    ? "#dfedff"
                                    : "#0b1829",
                              })
                            }
                          >
                            <option value="sky">天空底色</option>
                            <option value="body">日月标记</option>
                          </select>
                        </label>
                        <label>
                          夜间颜色
                          <input
                            aria-label="场景夜间颜色"
                            type="color"
                            value={
                              current.solarNightColor ||
                              (current.solarPart === "body"
                                ? "#dfedff"
                                : "#0b1829")
                            }
                            onChange={(e) =>
                              patch({ solarNightColor: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          缺失底色
                          <input
                            aria-label="场景缺失底色"
                            type="color"
                            value={current.solarMissingColor || "#17212c"}
                            onChange={(e) =>
                              patch({ solarMissingColor: e.target.value })
                            }
                          />
                        </label>
                        <p className="hint">
                          上方颜色用于白天。原生使用缓存位置与 Garmin
                          日出/日落；不主动定位。无位置、极昼/极夜或 API
                          无结果时显示
                          N/A、隐藏日月。太阳弧线仅示意日间进度；月亮固定在中央作为夜间标识，不代表月相/真实月球位置。默认息屏隐藏场景；网页使用独立预览中的日出/日落样本。
                        </p>
                      </>
                    )}
                    {current.kind==="chart"&&<ChartInspector layer={current} onChange={patch} previewCase={preview.chartCase} onPreview={v=>setPreview({...preview,chartCase:v})}/>}
                    {current.kind === "calendar" && (
                      <>
                        <label>
                          周起始日
                          <select
                            aria-label="周起始日"
                            value={current.calendarStart || "monday"}
                            onChange={(e) =>
                              patch({
                                calendarStart: e.target
                                  .value as Layer["calendarStart"],
                              })
                            }
                          >
                            <option value="monday">星期一</option>
                            <option value="sunday">星期日</option>
                          </select>
                        </label>
                        {(
                          [
                            ["calendarTodayColor", "今日背景", "#70c7ff"],
                            ["calendarTodayText", "今日文字", "#07131d"],
                            ["calendarMutedColor", "跨月文字", "#586a7f"],
                            ["calendarHeaderColor", "星期标题", "#7891aa"],
                          ] as const
                        ).map(([field, title, fallback]) => (
                          <label key={field}>
                            {title}
                            <input
                              aria-label={title}
                              type="color"
                              value={current[field] || fallback}
                              onChange={(e) =>
                                patch({ [field]: e.target.value })
                              }
                            />
                          </label>
                        ))}
                        <label>
                          日历原生字体
                          <select
                            aria-label="日历原生字体"
                            value={current.garminFont || "xtiny"}
                            onChange={(e) =>
                              patch({
                                customFont:undefined,
                                ...bitmapTypographyReset,bitmapFontId:undefined,garminFont: e.target
                                  .value as Layer["garminFont"],
                              })
                            }
                          >
                            <option value="xtiny">FONT_XTINY</option>
                            <option value="tiny">FONT_TINY</option>
                            <option value="small">FONT_SMALL</option>
                            <option value="medium">FONT_MEDIUM</option>
                          </select>
                        </label>
                        <p className="hint">
                          显示前一周、本周、下一周。日期随设备本地日期更新；网页动态预览使用浏览器日期。跨月日期使用暗色，今日反色突出。原生系统字体较大，缩小控件后需检查可读性。
                        </p>
                      </>
                    )}
                    {current.kind === "meter" && (
                      <>
                        <label>
                          仪表样式
                          <select
                            aria-label="仪表样式"
                            value={current.meterShape || "bar"}
                            onChange={(e) =>
                              patch({
                                meterShape: e.target
                                  .value as Layer["meterShape"],
                                ...(e.target.value === "bar"
                                  ? { w: 320, h: 18, x: 67, y: 310 }
                                  : {
                                      w: 88,
                                      h: 320,
                                      x: e.target.value === "left" ? 0 : 366,
                                      y: 67,
                                      allowClip: true,
                                    }),
                              })
                            }
                          >
                            <option value="bar">水平分段条</option>
                            <option value="left">左侧弧形</option>
                            <option value="right">右侧弧形</option>
                          </select>
                        </label>
                        <label>
                          仪表数据
                          <select
                            aria-label="仪表数据"
                            value={current.source}
                            onChange={(e) =>
                              patch({
                                source: e.target.value,
                                threshold:false,thresholdRules:undefined,thresholdFallback:undefined,
                                meterGoal:
                                  meterDefaultGoal(e.target.value),
                              })
                            }
                          >
                            {meterSources.map(source=><option key={source} value={source}>{metrics[source]}</option>)}
                          </select>
                        </label>
                        <label>
                          目标数值
                          <input
                            aria-label="目标数值"
                            type="number"
                            min="1"
                            max="1000000"
                            value={
                              current.meterGoal ??
                              meterDefaultGoal(current.source)
                            }
                            onChange={(e) =>
                              patch({
                                meterGoal: Math.max(
                                  1,
                                  Math.min(
                                    1000000,
                                    Number(e.target.value) || 1,
                                  ),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          分段数量
                          <input
                            aria-label="分段数量"
                            type="number"
                            min="4"
                            max="32"
                            value={current.meterCount ?? 16}
                            onChange={(e) =>
                              patch({
                                meterCount: Math.max(
                                  4,
                                  Math.min(
                                    32,
                                    Math.round(Number(e.target.value) || 4),
                                  ),
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          未点亮亮度
                          <input
                            aria-label="未点亮亮度"
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={current.meterDim ?? 0.35}
                            onChange={(e) =>
                              patch({
                                meterDim: Math.max(
                                  0,
                                  Math.min(1, Number(e.target.value) || 0),
                                ),
                              })
                            }
                          />
                        </label>
                        <p className="hint">
                          目标为固定设计值，不读取 Garmin
                          自动目标。达到目标后全亮；缺失数据全暗。更换样式会应用推荐尺寸和位置，可继续拖动调整。
                        </p>
                      </>
                    )}
                    {current.kind === "time" && (
                      <>
                        <label>
                          时间基准
                          <select
                            aria-label="时间基准"
                            value={
                              current.timeUtcOffset === undefined
                                ? "local"
                                : "fixed"
                            }
                            onChange={(e) =>
                              patch({
                                timeUtcOffset:
                                  e.target.value === "local" ? undefined : 0,
                              })
                            }
                          >
                            <option value="local">设备本地时间</option>
                            <option value="fixed">固定 UTC 偏移</option>
                          </select>
                        </label>
                        {current.timeUtcOffset !== undefined && (
                          <>
                            <label>
                              UTC 偏移（分钟，东正西负）
                              <input
                                aria-label="UTC 偏移分钟"
                                type="number"
                                min={-720}
                                max={840}
                                step={15}
                                value={current.timeUtcOffset}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  if (
                                    Number.isInteger(value) &&
                                    value >= -720 &&
                                    value <= 840
                                  )
                                    patch({ timeUtcOffset: value });
                                }}
                              />
                            </label>
                            <p className="hint">
                              固定偏移不自动调整夏令时。例：UTC+8 为
                              480，UTC+5:30 为
                              330。网页按浏览器时区换算，原生按设备 UTC
                              时刻计算；不会更改设备时区。
                            </p>
                          </>
                        )}
                        <label>
                          时间部分
                          <select
                            aria-label="时间部分"
                            value={current.timePart || "full"}
                            onChange={(e) =>
                              patch({
                                timePart: e.target.value as Layer["timePart"],
                              })
                            }
                          >
                            <option value="full">完整时间 HH:MM</option>
                            <option value="hours">小时 HH</option>
                            <option value="minutes">分钟 MM</option>
                            <option value="hourTens">小时十位 H_</option>
                            <option value="hourOnes">小时个位 _H</option>
                            <option value="minuteTens">分钟十位 M_</option>
                            <option value="minuteOnes">分钟个位 _M</option>
                          </select>
                        </label>
                      </>
                    )}
                    {["text", "time", "date", "metric", "wordTime", "chart"].includes(
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
                            disabled={!!current.bitmapFontId}
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
                        <button onClick={()=>setFontsOpen(true)} type="button">字体素材库</button>
                        {current.bitmapFontId&&<BitmapTypographyPanel project={p} layer={current} selection={selection} onChange={patch} onApplyLayers={layers=>editLayers(layers)}/>}
                        <label>
                          Garmin 字体
                          <select
                            aria-label="Garmin 字体"
                            value={current.garminFont || "auto"}
                            onChange={(e) =>
                              patch({
                                customFont:undefined,
                                ...bitmapTypographyReset,bitmapFontId:undefined,garminFont: e.target
                                  .value as Layer["garminFont"],
                              })
                            }
                          >
                            {[
                              ["auto", "自动选择"],
                              ["xtiny", "FONT_XTINY"],
                              ["systemXTiny", "FONT_SYSTEM_XTINY"],
                              ["chalk", "粉笔手写（数字/英文）"],
                              ["chalkHan", "粉笔中文"],
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
                        <label className="inline"><input aria-label="自动匹配数据源格式" type="checkbox" checked={!!current.autoSourceFormat} onChange={e=>patch(e.target.checked?{autoSourceFormat:true}:{autoSourceFormat:false,label:current.label,unit:current.unit,precision:current.precision,metricDecoration:current.metricDecoration})}/>自动匹配标签、单位和精度（纯数字）</label>
                        <ReadoutInspector project={p} layer={current} onChange={patch}/>

                        {current.source === "heartRate" && (
                          <>
                            <label className="inline">
                              <input
                                aria-label="显示心形符号"
                                type="checkbox"
                                checked={current.metricDecoration !== false}
                                onChange={(e) =>
                                  patch({ metricDecoration: e.target.checked })
                                }
                              />
                              显示心形符号
                            </label>
                            <p className="hint">
                              本地生成心率使用纯数字，请关闭心形符号；需要图标时可从素材添加独立心率图标。
                            </p>
                          </>
                        )}
                        <label>
                          数据源
                          <select
                            aria-label="数据源"
                            disabled={current.sourceLocked === true}
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
                            onChange={(e) => patch({ label: e.target.value, autoSourceFormat:false })}
                          />
                        </label>
                        <label>
                          数据单位
                          <input
                            aria-label="数据单位"
                            maxLength={100}
                            placeholder="输入自定义单位；空值隐藏"
                            value={current.unit ?? ""}
                            onChange={(e) => patch({ unit: e.target.value, autoSourceFormat:false })}
                          />
                        </label>
                        <p className="hint">
                          {current.unit === undefined
                            ? "当前使用数据源默认单位"
                            : "当前使用自定义单位（可留空隐藏）"}
                        </p>
                        <button onClick={() => patch({ unit: undefined,autoSourceFormat:false })}>
                          恢复默认单位
                        </button>
                        <label>
                          小数位
                          <select
                            aria-label="小数位"
                            disabled={["sunrise","sunset"].includes(current.source)}
                            value={["sunrise","sunset"].includes(current.source)?"auto":current.precision ?? "auto"}
                            onChange={(e) =>
                              patch({
                                autoSourceFormat:false,
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
                        {Object.hasOwn(metrics,current.source) && (
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
                        <label>圆环样式<select aria-label="圆环样式" value={current.ringStyle||"ticks"} onChange={e=>patch({ringStyle:e.target.value as "ticks"|"continuous"})}><option value="ticks">分段刻度</option><option value="continuous">连续进度</option></select></label>
                        {current.ringStyle==="continuous"&&<><label>端点样式<select aria-label="圆弧端点" value={current.ringCap||"butt"} onChange={e=>patch({ringCap:e.target.value as "butt"|"round"})}><option value="butt">平直</option><option value="round">圆头</option></select></label><small>结束角小于起始角时逆时针；AOD仅显示暗色轨道，不更新秒进度。非正圆目前使用分片近似，暗轨道可能有细接缝。</small></>}

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
                    {current.kind === "date" && (
                      <label>
                        日期语言
                        <select
                          aria-label="日期语言"
                          value={current.dateLocale || "en"}
                          onChange={(e) =>
                            patch({ dateLocale: e.target.value as "en" | "zh" })
                          }
                        >
                          <option value="en">英文星期 / 日期</option>
                          <option value="zh">中文星期 / 月日</option>
                        </select>
                      </label>
                    )}
                    <h4>显示条件</h4>
                    <VisibilityEditor
                      key={current.id}
                      value={current.visibility}
                      onChange={(visibility) => patch({ visibility })}
                    />
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
                        {[
                          "text",
                          "time",
                          "date",
                          "metric",
                          "wordTime",
                          "arcText",
                          "chart",
                        ].includes(current.kind) && (
                          <label>
                            息屏字号
                            <input
                              aria-label="息屏字号"
                              disabled={!!current.bitmapFontId}
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
                          (current.kind === "hand" &&
                            current.handType === "second") ||
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
                              <option value="zero">
                                固定 00 / 圆环全暗 / 秒针 12 点
                              </option>
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
                {["AI", "代码", "编译", "修复", "历史"].map((t) => (
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
                            disabled={busy || batchBusy}
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
                          disabled={busy || batchBusy}
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
                  ) : drawer === "修复" ? (
                    <RepairPanel
                      key={`${p.id}-${p.codeProvenance?.repairRootId || activeVersion(p) || p.codeRevision}`}
                      project={p}
                      profile={generationProfile}
                      logs={logs}
                      busy={busy || batchBusy}
                      onBegin={() => {
                        if (busy || batchBusy || generationLock.current)
                          return false;
                        generationLock.current = true;
                        setBusy(true);
                        return true;
                      }}
                      onEnd={() => {
                        generationLock.current = false;
                        setBusy(false);
                      }}
                      onApply={(base, patched, provenance) => {
                        const current = activeProject.current;
                        if (
                          !current ||
                          current.id !== base.id ||
                          current.revision !== base.revision ||
                          JSON.stringify(current.files) !==
                            JSON.stringify(base.files)
                        ) {
                          setNotice(
                            "工程或设计已变化，未应用修复，请重新检查。",
                          );
                          return;
                        }
                        try {
                          setP(addCodeVersion(current, patched, provenance));
                          setNotice(
                            "修复已应用并保留代码快照，请手动编译验证。",
                          );
                        } catch (e) {
                          setNotice((e as Error).message);
                        }
                      }}
                    />
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
                      {!codeFromBuild && files.length > 0 && pendingProvenance.primary === "deterministic" && (
                        <aside data-pending-approximations className="boundary-warning">
                          <b>本次工程的显示近似</b>
                          <p>点击“应用生成结果”即记录采用下列近似，仅对应本次设计、设备与代码版本。原设计和历史保留；待验证项不会变成已验证。</p>
                          <ul>{generationDiagnostics(p).filter(d=>d.status==="approximation").map((d,i)=><li key={i}>{p.layers.find(l=>l.id===d.layerId)?.name || "控件"}：{d.message}</li>)}</ul>
                          {!generationDiagnostics(p).some(d=>d.status==="approximation") && <p>未发现已声明的显示近似。</p>}
                        </aside>
                      )}
                      {!codeFromBuild && files.length > 0 && (
                        <button
                          className="primary"
                          onClick={() => {
                            if (
                              genRevision !== p.revision ||
                              genProjectId !== p.id
                            ) {
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
                              setP(addCodeVersion(p, files, acceptGeneratedProvenance(p,files,pendingProvenance)));
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
                      {!!batchResults.length && (
                        <ul aria-label="多设备编译结果">
                          {batchResults.map((r) => (
                            <li key={r.key}>
                              {r.label} · {r.status}
                              {r.artifacts?.map((a) => (
                                <a key={a.url} href={a.url} onClick={(event) => { event.preventDefault(); void downloadBuild(a.url, a.fileName || "watchface.prg").catch(e => setNotice(e.message)); }} download>
                                  {" "}
                                  下载 {a.fileName || "PRG"}
                                </a>
                              ))}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div>
                        <span className="pill">.NET 10 构建服务</span>
                        <button
                          disabled={busy || batchBusy}
                          onClick={() => build()}
                        >
                          新建编译任务
                        </button>
                        {buildId && (
                          <button
                            disabled={busy || batchBusy}
                            onClick={resumeBuild}
                          >
                            继续观察原任务
                          </button>
                        )}
                      </div>
                      {busy && buildId && (
                        <button
                          onClick={async () => {
                            try {
                              const r = await buildFetch(
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
                          const identity=buildSourceIdentity.current;
                          const mapped=location && identity && identity.projectId===p.id && identity.target===p.target && identity.deviceSize===p.deviceSize && identity.revision===p.revision && identity.files===JSON.stringify(p.files) && p.codeProvenance?.primary==="deterministic" && !p.codeProvenance.patches?.length ? mappedDiagnostic(layerSourceMap,location) : undefined;
                          const owner=mapped && p.layers.find(l=>l.id===mapped.layerId);

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
                              {owner && <button className="log-location" onClick={()=>{selectOne(owner.id);setDrawer("");}}>定位控件 {owner.name}</button>}
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
                          onClick={(event) => { event.preventDefault(); void downloadBuild(a.url, a.fileName || a.id).catch(e => setNotice(e.message)); }}
                          download={a.fileName || a.id}
                        >
                          <Download size={16} />
                          下载 {a.fileName || a.id}
                        </a>
                      ))}
                      {buildId&&<NativeVerificationPanel key={buildId} buildId={buildId} compiled={!!artifacts.length} matchesCurrent={!!buildSourceIdentity.current&&buildSourceIdentity.current.projectId===p.id&&buildSourceIdentity.current.target===p.target&&buildSourceIdentity.current.deviceSize===p.deviceSize&&buildSourceIdentity.current.revision===p.revision&&buildSourceIdentity.current.files===JSON.stringify(p.files)}/>}
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
                            {v.provenance?.generatorVersion || ""}{" "}
                            {v.provenance?.patches?.length
                              ? `· 已修补 ${v.provenance.patches.length} 次`
                              : ""}
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
      {showAdaptation && p?.multiDevice && (
        <AdaptationAssistant
          key={p.id + deviceKey(p)}
          project={p}
          profile={generationProfile}
          preview={preview}
          onClose={() => setShowAdaptation(false)}
          onApply={(fingerprint, changes) => {
            const current = activeProject.current;
            if (!current || adaptationFingerprint(current) !== fingerprint) {
              setNotice("设计或设备已变化，请重新请求适配建议。");
              return;
            }
            try {
              setP(
                applyAdaptation(
                  saveDesignSnapshot(
                    current,
                    "AI 适配前 " + new Date().toLocaleString(),
                  ),
                  changes,
                ),
              );
              setPast([]);
              setFuture([]);
              setFiles([]);
              setGenProjectId("");
              setShowAdaptation(false);
              setNotice("已应用到当前设备，代码已过期，请重新生成后编译。");
            } catch (e) {
              setNotice((e as Error).message);
            }
          }}
        />
      )}
      {aiCreating && (
        <AiCreateWatchface
          profiles={profiles}
          onProfiles={setProfiles}
          preview={preview}
          onClose={() => setAiCreating(false)}
          onCreate={async (item) => {
            if (batchBusy) throw Error("请等待设备编译队列结束");
            if (p && persisted.current !== p)
              throw Error("当前项目尚有未保存修改，请先保存或导出备份");
            item.storageVersion = await saveProject(item);
            setProjects((items) => [item, ...items]);
            open(item);
            setAiCreating(false);
            setNotice("AI设计已保存，可继续调整；满意后再生成工程并编译。");
          }}
        />
      )}
      {newProject && (
        <DevicePicker
          blank={newProject.blank}
          templateId={newProject.templateId}
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
