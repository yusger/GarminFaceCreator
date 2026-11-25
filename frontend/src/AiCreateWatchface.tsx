import { useEffect, useRef, useState } from "react";
import { Sparkles, Plus, X } from "lucide-react";
import type { Profile, Project } from "./domain";
import { devices } from "./devices";
import {
  designSources,
  parseDesign,
  readDesignReference,
  type DesignChoices,
  type DesignReference,
  type DesignStyle,
} from "./aiDesign";
import { requestDesign, GenerationFailure } from "./api";
import Scene, { type Preview } from "./Scene";
import Models from "./Models";
import { download } from "./storage";

export default function AiCreateWatchface({
  profiles,
  onProfiles,
  preview,
  onClose,
  onCreate,
}: {
  profiles: Profile[];
  onProfiles: (profiles: Profile[]) => void;
  preview: Preview;
  onClose: () => void;
  onCreate: (p: Project) => Promise<void>;
}) {
  const [choices, setChoices] = useState<DesignChoices>({
    name: "AIWatch",
    target: "venu445mm",
    deviceSize: "45mm",
    style: "DIGITAL",
    seconds: false,
    date: true,
    dateLocale: "en",
    sources: ["heartRate", "steps", "battery"],
    instruction: "简洁清晰，时间突出，青色点缀，保留独立可编辑的数据控件。",
  });
  const [step, setStep] = useState(0),
    [profileId, setProfileId] = useState(profiles[0]?.id || ""),
    [configuring, setConfiguring] = useState(false);
  const [refs, setRefs] = useState<DesignReference[]>([]),
    [busy, setBusy] = useState(false),
    [loadingImages, setLoadingImages] = useState(false),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [raw, setRaw] = useState(""),
    [result, setResult] = useState<Project | null>(null);
  const controller = useRef<AbortController | null>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  const device = devices.find(
    (d) => d.id === choices.target && d.size === choices.deviceSize,
  )!;
  const profile = profiles.find((p) => p.id === profileId) || profiles[0];
  const input = useRef<HTMLInputElement>(null);
  function change(patch: Partial<DesignChoices>) {
    setChoices((c) => ({ ...c, ...patch }));
    setResult(null);
    setError("");
    setRaw("");
  }
  function changeRefs(next: DesignReference[]) {
    setRefs(next);
    setResult(null);
    setRaw("");
    setError("");
  }
  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    if (refs.length + files.length > 3) {
      setError("最多添加3张参考图");
      return;
    }
    setLoadingImages(true);
    setError("");
    try {
      const images = await Promise.all(
        Array.from(files).map(readDesignReference),
      );
      if (!alive.current) return;
      const next = [...refs, ...images];
      if (next.reduce((n, r) => n + r.data.length, 0) > 12_000_000)
        throw Error("参考图总量过大，请减少图片或缩小尺寸");
      changeRefs(next);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoadingImages(false);
    }
  }
  async function run() {
    if (!profile?.model.trim()) {
      setError("请先配置并选择模型");
      return;
    }
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setError("");
    setRaw("");
    try {
      const text = await requestDesign(profile, choices, refs, c.signal);
      if (!alive.current || c.signal.aborted) return;
      setRaw(text);
      const safe = {
        ...choices,
        instruction: profile.key
          ? choices.instruction.replaceAll(profile.key, "[REDACTED]")
          : choices.instruction,
      };
      const candidate = parseDesign(text, safe, refs);
      setResult(candidate);
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof GenerationFailure) setRaw(e.raw);
      setError(
        c.signal.aborted
          ? "已取消，未保存新项目；可修改要求后重试。"
          : (e as Error).message,
      );
    } finally {
      if (alive.current) {
        setBusy(false);
        controller.current = null;
      }
    }
  }
  async function adopt() {
    if (!result) return;
    setSaving(true);
    setError("");
    try {
      await onCreate(result);
    } catch (e) {
      if (alive.current)
        setError(
          "保存失败：" +
            (e as Error).message +
            "；有效设计仍保留，可重试或下载备份。",
        );
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  if (configuring)
    return (
      <div className="ai-design-overlay">
        <section className="ai-design-dialog ai-design-models">
          <Models
            profiles={profiles}
            onSave={onProfiles}
            onBack={() => setConfiguring(false)}
          />
        </section>
      </div>
    );
  return (
    <div className="ai-design-overlay">
      <section
        className="ai-design-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="AI 创建表盘"
      >
        <header className="ai-design-heading">
          <div>
            <h2>
              <Sparkles size={22} /> AI 创建表盘
            </h2>
            <p>先生成可编辑设计，调整满意后再生成工程、编译。</p>
          </div>
          <button disabled={saving} onClick={onClose} aria-label="关闭AI创建">
            <X size={20} />
          </button>
        </header>
        <nav className="ai-design-steps" aria-label="创建步骤">
          {["设备", "时间与数据", "参考与生成"].map((title, i) => (
            <button
              key={title}
              disabled={busy || saving || loadingImages}
              aria-current={i === step ? "step" : undefined}
              className={i === step ? "active" : ""}
              onClick={() => setStep(i)}
            >
              {i + 1}. {title}
            </button>
          ))}
        </nav>
        <div className="ai-design-body">
          <div className="ai-design-form">
            <fieldset disabled={busy || saving || loadingImages}>
              {step === 0 && (
                <>
                  <label>
                    项目名称
                    <input
                      aria-label="AI项目名称"
                      maxLength={80}
                      value={choices.name}
                      onChange={(e) => change({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    系列
                    <select
                      aria-label="AI手表系列"
                      value={device.series}
                      onChange={(e) => {
                        const d = devices.find(
                          (d) => d.series === e.target.value,
                        )!;
                        change({ target: d.id, deviceSize: d.size });
                      }}
                    >
                      {[...new Set(devices.map((d) => d.series))].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    型号
                    <select
                      aria-label="AI手表型号"
                      value={device.model}
                      onChange={(e) => {
                        const d = devices.find(
                          (d) =>
                            d.series === device.series &&
                            d.model === e.target.value,
                        )!;
                        change({ target: d.id, deviceSize: d.size });
                      }}
                    >
                      {[
                        ...new Set(
                          devices
                            .filter((d) => d.series === device.series)
                            .map((d) => d.model),
                        ),
                      ].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    尺寸
                    <select
                      aria-label="AI手表尺寸"
                      value={device.size}
                      onChange={(e) => change({ deviceSize: e.target.value })}
                    >
                      {devices
                        .filter(
                          (d) =>
                            d.series === device.series &&
                            d.model === device.model,
                        )
                        .map((d) => (
                          <option key={d.size}>{d.size}</option>
                        ))}
                    </select>
                  </label>
                  <p className="hint">
                    {device.model} {device.size} · {device.pixels} ×{" "}
                    {device.pixels} 像素
                    <br />
                    设计坐标保持454 × 454，工程生成时适配目标分辨率。
                  </p>
                </>
              )}
              {step === 1 && (
                <>
                  <label>
                    时间风格
                    <select
                      aria-label="时间风格"
                      value={choices.style}
                      onChange={(e) =>
                        change({ style: e.target.value as DesignStyle })
                      }
                    >
                      <option value="DIGITAL">数字模式</option>
                      <option value="ANALOG">指针模式</option>
                      <option value="HYBRID">混合模式</option>
                    </select>
                  </label>
                  <p className="hint">
                    时分必选。混合模式包含时针、分针和数字时分。
                  </p>
                  <div className="ai-design-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={choices.seconds}
                        onChange={(e) => change({ seconds: e.target.checked })}
                      />
                      显示秒数
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={choices.date}
                        onChange={(e) => change({ date: e.target.checked })}
                      />
                      显示日期
                    </label>
                  </div>
                  {choices.date && (
                    <label>
                      日期语言
                      <select
                        aria-label="AI日期语言"
                        value={choices.dateLocale}
                        onChange={(e) =>
                          change({ dateLocale: e.target.value as "en" | "zh" })
                        }
                      >
                        <option value="en">英文</option>
                        <option value="zh">中文</option>
                      </select>
                    </label>
                  )}
                  <h3>
                    子数据 <small>可全部取消，由AI安排布局</small>
                  </h3>
                  <div className="ai-design-sources">
                    {designSources.map(([id, label]) => (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={choices.sources.includes(id)}
                          onChange={(e) =>
                            change({
                              sources: e.target.checked
                                ? [...choices.sources, id]
                                : choices.sources.filter((s) => s !== id),
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="hint">
                    当前使用24小时制和整数秒。12h、农历、节气、节假日、通知数与平滑扫秒暂未开放。部分健康/天气数据可能在设备上缺失。
                  </p>
                </>
              )}
              {step === 2 && (
                <>
                  <label>
                    本次模型
                    <select
                      aria-label="AI创建模型"
                      value={profile?.id || ""}
                      onChange={(e) => {
                        setProfileId(e.target.value);
                        setError("");
                      }}
                    >
                      {!profiles.length && <option value="">尚未配置</option>}
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} / {p.model || "未选择模型"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button onClick={() => setConfiguring(true)}>
                    配置创建模型
                  </button>
                  <label>
                    设计提示词
                    <textarea
                      aria-label="设计提示词"
                      rows={5}
                      maxLength={4000}
                      value={choices.instruction}
                      onChange={(e) => change({ instruction: e.target.value })}
                      placeholder="描述配色、布局、风格和特殊效果。"
                    />
                  </label>
                  <div className="inline">
                    <h3>参考图片</h3>
                    <button
                      onClick={() => input.current?.click()}
                      disabled={refs.length >= 3}
                    >
                      <Plus size={14} />
                      添加参考图
                    </button>
                  </div>
                  <input
                    ref={input}
                    type="file"
                    hidden
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      void addImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <div className="ai-design-references">
                    {refs.map((r) => (
                      <div key={r.id}>
                        <img src={r.data} alt={r.name} />
                        <span>{r.name}</span>
                        <select
                          aria-label={"参考图用途 " + r.name}
                          value={r.usage}
                          onChange={(e) =>
                            changeRefs(
                              refs.map((v) =>
                                v.id === r.id
                                  ? {
                                      ...v,
                                      usage: e.target
                                        .value as DesignReference["usage"],
                                    }
                                  : v,
                              ),
                            )
                          }
                        >
                          <option value="style">风格参考</option>
                          <option value="layout">布局参考</option>
                          <option value="asset">实际素材</option>
                        </select>
                        <button
                          onClick={() =>
                            changeRefs(refs.filter((v) => v.id !== r.id))
                          }
                          aria-label={"移除参考图 " + r.name}
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="hint">
                    最多3张，每张4MB；图片在浏览器转换为PNG并限制最长边1600。参考图将直发所选模型，需要模型支持图片理解。标为“实际素材”且被采用的图片会进入项目，并在后续编译时发送到编译服务。
                  </p>
                </>
              )}
            </fieldset>
            {loadingImages && <p role="status">正在读取参考图…</p>}
            <div className="inline ai-design-actions">
              {step > 0 && (
                <button
                  disabled={busy || saving || loadingImages}
                  onClick={() => setStep(step - 1)}
                >
                  上一步
                </button>
              )}
              {step < 2 ? (
                <button
                  className="primary"
                  disabled={
                    !choices.name.trim() || busy || saving || loadingImages
                  }
                  onClick={() => setStep(step + 1)}
                >
                  下一步
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    saving ||
                    loadingImages ||
                    !choices.name.trim() ||
                    !profile?.model.trim()
                  }
                  onClick={() => void run()}
                >
                  {result ? "重新生成设计" : "生成表盘项目"}
                </button>
              )}
              {busy && (
                <button onClick={() => controller.current?.abort()}>
                  取消设计生成
                </button>
              )}
            </div>
            <p className="hint">
              调用所选模型可能消耗Token。此步骤只生成设计，不生成工程、不编译、不自动重试。
            </p>
            {busy && <p role="status">AI正在设计表盘，请稍候…</p>}
            {error && (
              <p className="ai-design-error" role="alert">
                {error}
              </p>
            )}
            {raw && (
              <details>
                <summary>模型响应</summary>
                <pre className="ai-design-raw">{raw}</pre>
                <button onClick={() => download("ai-design-response.txt", raw)}>
                  下载模型响应
                </button>
              </details>
            )}
          </div>
          <aside className="ai-design-result">
            {result ? (
              <>
                <h3>设计预览</h3>
                <Scene project={result} preview={preview} />
                <p>
                  {result.layers.length}个独立图层 · {device.model}{" "}
                  {device.size}
                </p>
                <p className="hint">
                  可继续手动调整。
                  {result.layers.some((l) => l.effectPrompt?.trim())
                    ? "包含原生效果说明，网页仅显示基础静态布局，生成工程后验证实际效果。"
                    : "网页字体和颜色为近似效果。"}
                </p>
                <button
                  className="primary"
                  disabled={busy || saving || loadingImages}
                  onClick={() => void adopt()}
                >
                  {saving ? "正在保存…" : "采用设计并编辑"}
                </button>
                <button
                  disabled={saving}
                  onClick={() => download(result.name + ".json", result)}
                >
                  下载设计备份
                </button>
              </>
            ) : (
              <div className="ai-design-placeholder">
                <Sparkles size={42} />
                <h3>从想法到可编辑表盘</h3>
                <p>选择时间和数据，再用参考图与描述完成设计。</p>
                <p className="hint">
                  设计完成后再生成工程，减少反复修改代码的Token消耗。
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
