import { weatherGroups } from "./weatherIcons";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Scene, { type Preview } from "./Scene";
import type { Project } from "./domain";
import { deviceFor, deviceLabel } from "./devices";
function currentClock() {
  const now = new Date();
  return {
    time:
      `${now.getHours()}`.padStart(2, "0") +
      ":" +
      `${now.getMinutes()}`.padStart(2, "0"),
    seconds: now.getSeconds(),
    date:
      now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() +
      " " +
      now.getDate(),
  };
}
export default function PreviewStudio({
  project,
  preview,
  setPreview,
  onClose,
}: {
  project: Project;
  preview: Preview;
  setPreview: Dispatch<SetStateAction<Preview>>;
  onClose: () => void;
}) {
  const [dynamic, setDynamic] = useState(true);
  const [playing, setPlaying] = useState(true),
    [speed, setSpeed] = useState(1),
    [mode, setMode] = useState("对比"),
    [scale, setScale] = useState("适应窗口"),
    [safe, setSafe] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  function manualPause() {
    setPlaying(false);
    setDynamic(false);
  }
  useEffect(() => {
    if (!dynamic) return;
    const heartRate = 50 + Math.floor(Math.random() * 111);
    setPreview((p) => ({
      ...p,
      ...currentClock(),
      heartRate,
      steps: 4500,
      missing: false,
    }));
  }, [dynamic, setPreview]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(),
      fraction = 0;
    const timer = setInterval(() => {
      const now = performance.now();
      fraction += ((now - last) * (dynamic ? 1 : speed)) / 1000;
      last = now;
      const step = Math.floor(fraction);
      if (!step) return;
      fraction -= step;
      if (dynamic) {
        const heartRate = 50 + Math.floor(Math.random() * 111),
          increment = 1 + Math.floor(Math.random() * 5),
          clock = currentClock();
        setPreview((p) => ({
          ...p,
          ...clock,
          heartRate,
          steps: Math.min(999999, p.steps + increment),
        }));
        return;
      }
      setPreview((p) => {
        const total = p.seconds + step;
        const [h, m] = p.time.split(":").map(Number);
        const minutes = (h * 60 + m + Math.floor(total / 60)) % 1440;
        return {
          ...p,
          seconds: total % 60,
          time:
            `${Math.floor(minutes / 60)}`.padStart(2, "0") +
            ":" +
            `${minutes % 60}`.padStart(2, "0"),
        };
      });
    }, 100);
    return () => clearInterval(timer);
  }, [playing, speed, dynamic, setPreview]);
  function scene(name: string) {
    const pixels = deviceFor(project).pixels;
    return (
      <figure key={name}>
        <figcaption>{name}</figcaption>
        <div
          className="preview-watch"
          style={
            scale === "适应窗口"
              ? undefined
              : {
                  width: pixels * (scale === "200%" ? 2 : 1),
                  height: pixels * (scale === "200%" ? 2 : 1),
                }
          }
        >
          <Scene
            project={project}
            preview={preview}
            aod={name === "息屏"}
            exact
          />
          {safe && (
            <div
              className="preview-safe"
              aria-label="屏幕边界辅助线"
              style={
                project.layoutGuide
                  ? {
                      inset: `${(project.layoutGuide.safeInsetPx / pixels) * 100}%`,
                    }
                  : undefined
              }
            />
          )}
        </div>
        <small>
          {pixels} × {pixels} 像素
        </small>
      </figure>
    );
  }
  return (
    <div
      className="preview-overlay"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
        if (e.key === "Tab") {
          const nodes = panel.current?.querySelectorAll<HTMLElement>(
            "button, input, select",
          );
          if (!nodes?.length) return;
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === panel.current)
          ) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div
        className="preview-studio"
        role="dialog"
        aria-modal="true"
        aria-label="表盘独立预览"
        tabIndex={-1}
        ref={panel}
      >
        <header>
          <div>
            <h2>
              {project.name} <span>预览</span>
            </h2>
            <p>{deviceLabel(project)} · 模拟数据</p>
          </div>
          <button onClick={onClose}>关闭预览</button>
        </header>
        <div className="preview-controls">
          <label>
            <input
              type="checkbox"
              aria-label="实时模拟"
              checked={dynamic}
              onChange={(e) => {
                setDynamic(e.target.checked);
                setPlaying(e.target.checked);
              }}
            />
            实时模拟
          </label>
          <button onClick={() => setPlaying(!playing)}>
            {playing ? "暂停动画" : "播放动画"}
          </button>
          <button
            onClick={() => {
              manualPause();
              setPreview((p) => ({ ...p, seconds: 0 }));
            }}
          >
            归零
          </button>
          <label>
            播放速度
            <select
              disabled={dynamic}
              aria-label="播放速度"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[1, 2, 4].map((x) => (
                <option value={x} key={x}>
                  {x}×
                </option>
              ))}
            </select>
          </label>
          <label>
            显示模式
            <select
              aria-label="预览显示模式"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {["对比", "亮屏", "息屏"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            查看尺寸
            <select
              aria-label="预览查看尺寸"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
            >
              {["适应窗口", "实际像素", "200%"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={safe}
              onChange={(e) => setSafe(e.target.checked)}
            />
            边界辅助线
          </label>
        </div>
        <div className="preview-body">
          <div className="preview-stage">
            {(mode === "对比" ? ["亮屏", "息屏"] : [mode]).map(scene)}
          </div>
          <aside className="preview-data">
            <label>
              模拟天气
              <select
                aria-label="模拟天气"
                value={preview.weatherCondition ?? 0}
                onChange={(e) => {
                  manualPause();
                  setPreview((p) => ({
                    ...p,
                    missing: false,
                    weatherCondition: Number(e.target.value),
                  }));
                }}
              >
                {weatherGroups.map((g) => (
                  <option key={g.key} value={g.values[0]}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <h3>数据场景</h3>
            <div className="preview-presets">
              {["日常", "运动", "低电量", "数据缺失"].map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    manualPause();
                    setPreview((p) => ({
                      ...p,
                      missing: name === "数据缺失",
                      heartRate: name === "运动" ? 155 : 72,
                      battery: name === "低电量" ? 8 : 78,
                      steps: name === "运动" ? 12500 : 8642,
                    }));
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <label>
              时间
              <input
                aria-label="模拟时间"
                type="time"
                value={preview.time}
                onChange={(e) => {
                  manualPause();
                  if (e.target.value)
                    setPreview((p) => ({ ...p, time: e.target.value }));
                }}
              />
            </label>
            <label>
              秒数 {preview.seconds}
              <input
                aria-label="模拟秒数"
                type="range"
                min="0"
                max="59"
                value={preview.seconds}
                onChange={(e) => {
                  manualPause();
                  setPreview((p) => ({
                    ...p,
                    seconds: Number(e.target.value),
                  }));
                }}
              />
            </label>
            {(["heartRate", "steps", "battery"] as const).map((key, i) => (
              <label key={key}>
                {["心率", "步数", "电量"][i]}
                <input
                  aria-label={"模拟" + ["心率", "步数", "电量"][i]}
                  type="number"
                  min="0"
                  max={
                    key === "battery" ? 100 : key === "heartRate" ? 255 : 999999
                  }
                  value={preview[key]}
                  onChange={(e) => {
                    manualPause();
                    setPreview((p) => ({
                      ...p,
                      missing: false,
                      [key]: Math.max(
                        0,
                        Math.min(
                          key === "battery"
                            ? 100
                            : key === "heartRate"
                              ? 255
                              : 999999,
                          Number(e.target.value) || 0,
                        ),
                      ),
                    }));
                  }}
                />
              </label>
            ))}
            <p>
              实时模拟使用浏览器当前时间；心率每秒随机取 50–160，步数从 4500
              起每秒增加
              1–5。选择场景或手动调整会暂停实时模拟。数据不会改动项目或代码。
            </p>
            <p>
              网页按图层绘制；参考截图、原生字体及动画不等同于手表运行结果。息屏仅展示已设置为息屏可见的图层。浏览器字体、抗锯齿和色彩与设备可能不同；中文和长读数需在目标设备检查。网页息屏不模拟系统全部刷新限制，也不估算功耗。
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
