import {download as downloadLocal} from "./storage";
import AodPixelSummary from "./AodPixelSummary";
import {analyzeAodPixels,type AodPixelReport} from "./aodPixels";
import { useEffect, useState } from "react";
import { buildFetch, downloadBuild } from "./buildAccess";
import {
  checkNativeState,
  nativeArtifactPath,
  nativeStatuses,
  nativeActive,
  nativeFailureMessage,
  type NativeState,
} from "./nativeVerification";
export default function NativeVerificationPanel({
  buildId,
  compiled,
  matchesCurrent,
}: {
  buildId: string;
  compiled: boolean;
  matchesCurrent: boolean;
}) {
  const [state, setState] = useState<NativeState>({
    buildId,
    status: "not_requested",
  });
  const [service, setService] = useState({ enabled: false, ready: false });
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [pixels,setPixels]=useState<AodPixelReport|null>(null);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState("");
  const path = `/api/builds/${buildId}/native-verification`;
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let enabled = false;
    async function poll() {
      try {
        const r = await buildFetch(path, {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]),
        });
        if (r.status === 404 && !enabled) {
          if (!abort.signal.aborted) setState({ buildId, status: "disabled" });
          return;
        }
        if (!r.ok) throw Error("无法读取原生验证状态，请刷新或重新编译");
        const next = checkNativeState(await r.json(), buildId);
        if (abort.signal.aborted) return;
        setState(next);
        setError("");
        if (nativeActive(next.status))
          timer = setTimeout(() => void poll(), 2000);
      } catch (e) {
        if (!abort.signal.aborted) setError((e as Error).message);
      }
    }
    async function start() {
      try {
        const r = await fetch("/api/capabilities", {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]),
          cache: "no-store",
        });
        if (!r.ok) throw Error("无法读取验证服务状态");
        const cap = (await r.json()).nativeVerification;
        enabled = !!cap?.enabled;
        if (abort.signal.aborted) return;
        setService({ enabled, ready: !!cap?.ready });
        await poll();
      } catch (e) {
        if (!abort.signal.aborted) setError((e as Error).message);
      }
    }
    void start();
    return () => {
      abort.abort();
      if (timer) clearTimeout(timer);
    };
  }, [buildId, path, refresh]);
  useEffect(() => {
    const abort = new AbortController();
    let owned = "";
    setImage("");
    setPixels(null);
    setImageError("");
    if (state.status !== "succeeded" || state.expired) return;
    async function load() {
      try {
        const url = nativeArtifactPath(state, "screen.png");
        if (!url) return;
        const r = await buildFetch(url, {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]),
        });
        if (!r.ok) throw Error("截图已过期或无法读取");
        const blob = await r.blob();
        if (blob.size > 2 * 1024 * 1024) throw Error("截图超出读取预算");
        if (abort.signal.aborted) return;
        owned = URL.createObjectURL(blob);
        setImage(owned);
      } catch (e) {
        if (!abort.signal.aborted) setImageError((e as Error).message);
      }
    }
    void load();
    return () => {
      abort.abort();
      if (owned) URL.revokeObjectURL(owned);
    };
  }, [buildId, state.status, state.attempt, state.expired, refresh]);
  async function command(cancel = false) {
    setSending(true);
    setError("");
    try {
      const r = await buildFetch(path + (cancel ? "/cancel" : ""), {
        method: "POST",
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw Error(body.error || body.detail || "无法启动原生验证");
      }
      setState(checkNativeState(await r.json(), buildId));
      setRefresh((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  function download(file: "screen.png" | "metadata.json") {
    try {
      const url = nativeArtifactPath(state, file);
      if (url)
        void downloadBuild(
          url,
          file === "screen.png" ? "native-screen.png" : "native-metadata.json",
        ).catch((e) => setError(e.message));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const active = nativeActive(state.status),
    mayStart =
      service.enabled &&
      service.ready &&
      compiled &&
      !sending &&
      !active &&
      (state.status === "not_requested" || !!state.canRetry);
  const target =
    state.target === "venu445mm"
      ? "Venu 4 45mm"
      : state.target === "venu441mm"
        ? "Venu 4 41mm"
        : state.target;
  return (
    <details className="native-verification" open data-native-verification>
      <summary>
        SDK 模拟器验证 ·{" "}
        {state.expired ? "产物已过期" : nativeStatuses[state.status]}
      </summary>
      <p className="hint">
        可选运行已编译工程，不调用模型，会占用验证配额。当前支持带平台帧报告的本地或AI工程，目标为 Venu 4 两尺寸。
      </p>
      {!matchesCurrent && (
        <p className="hint">
          验证对象是此编译任务中的工程。当前画布或源码若有修改，请重新编译后验证最新设计。
        </p>
      )}
      {!service.enabled ? (
        <p className="hint">
          当前环境未启用新的模拟器任务；已有截图仍按保留期提供。
        </p>
      ) : (
        !service.ready && (
          <p className="hint">原生验证服务暂不可用，编译与PRG下载不受影响。</p>
        )
      )}
      <div className="native-actions">
        <button
          type="button"
          disabled={!mayStart}
          onClick={() => void command()}
        >
          {state.canRetry ? "重试原生验证" : "运行 SDK 模拟器"}
        </button>
        {active && (
          <button
            type="button"
            disabled={sending || state.status === "cancelling"}
            onClick={() => void command(true)}
          >
            取消原生验证
          </button>
        )}
        <button
          type="button"
          disabled={sending}
          onClick={() => setRefresh((v) => v + 1)}
        >
          刷新验证状态
        </button>
      </div>
      <p role="status">
        {state.expired
          ? "原生截图和报告已过保留期"
          : nativeStatuses[state.status]}
        {state.attempt ? ` · 第 ${state.attempt} 次` : ""}
        {target ? ` · ${target}` : ""}
      </p>
      {error && <p role="alert">{error}</p>}
      {imageError && <p role="alert">{imageError}</p>}
      {["failed", "cancelled", "interrupted"].includes(state.status) && (
        <p>{nativeFailureMessage(state.error)}。编译结果与PRG保持独立。</p>
      )}
      {["failed", "cancelled", "interrupted"].includes(state.status) &&
        service.enabled &&
        !state.canRetry &&
        !state.expired && (
          <p className="hint">
            此任务已达验证次数上限；需要再次验证时请重新编译。
          </p>
        )}
      {state.report && (
        <p className="hint">
          SDK {state.report.sdkVersion} ·{" "}
          {state.report.width > 0 && state.report.height > 0
            ? `${state.report.width}×${state.report.height}`
            : "未取得盘面"}{" "}
          · 应用首次报告
          {state.report.applicationMode === "active"
            ? "亮屏"
            : state.report.applicationMode === "aod"
              ? "息屏"
              : "模式未核验"}
          。模拟器使用独立动态数据，与网页固定样本可能不同。
        </p>
      )}
      {image && (
        <img
          src={image}
          alt="SDK 模拟器原生盘面截图"
          onLoad={e=>{try{const img=e.currentTarget;if(img.currentSrc!==image)return;const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;if(canvas.width>1024||canvas.height>1024)throw Error("图像尺寸超出统计预算");const ctx=canvas.getContext("2d");if(!ctx)throw Error("像素画布不可用");ctx.drawImage(img,0,0);setPixels(analyzeAodPixels(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,state.target||"unknown","native-frame",state.report?.applicationMode==="aod"?"aod":state.report?.applicationMode==="active"?"active":"unknown"));}catch(error){setImageError("像素统计失败："+(error as Error).message);}}}
          onError={() => setImageError("截图无法解码，请下载报告检查")}
        />
      )}
      {pixels&&<><AodPixelSummary report={pixels}/><button type="button" onClick={()=>downloadLocal("native-pixel-analysis.json",{...pixels,buildId,projectId:state.projectId,revision:state.revision,prgSha256:state.prgSha256,sourceSha256:state.sourceSha256,generatorVersion:state.generatorVersion,capturedAtUtc:state.report?.capturedAtUtc})}>下载像素统计</button></>}
      {!!state.artifacts?.length && !state.expired && (
        <div className="native-actions">
          {image && (
            <a href={image} target="_blank" rel="noopener noreferrer">
              查看完整截图
            </a>
          )}
          <button type="button" onClick={() => download("screen.png")}>
            下载原生截图
          </button>
          <button type="button" onClick={() => download("metadata.json")}>
            下载验证元数据
          </button>
        </div>
      )}
      <p className="hint">
        这是 SDK
        模拟器截图。真实手表的显示、Sleep切换与功耗仍待验证；取得截图不等于真机验收。
      </p>
      {(state.generatorVersion || state.report) && (
        <details>
          <summary>工程依据与独立日志</summary>
          <p className="hint">
            工程修订 {state.revision} · {state.generatorVersion}
          </p>
          <p className="native-digest">
            PRG SHA256：{state.prgSha256}
            <br />
            源码 SHA256：{state.sourceSha256}
          </p>
          {state.report && (
            <>
              <p className="hint">
                清理：{state.report.cleanupStatus} · {state.report.samples}{" "}
                个采样，最高采样{" "}
                {state.report.maxSampledMemoryBytes == null
                  ? "未知"
                  : (state.report.maxSampledMemoryBytes / 1048576).toFixed(1) +
                    " MiB"}
                ；不是精确峰值或表盘内存。
              </p>
              <pre>{state.report.logs}</pre>
            </>
          )}
        </details>
      )}
    </details>
  );
}
