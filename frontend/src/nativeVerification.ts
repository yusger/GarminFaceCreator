export type NativeState = {
  buildId: string;
  status: string;
  attempt?: number;
  target?: string;
  revision?: number;
  generatorVersion?: string;
  prgSha256?: string;
  sourceSha256?: string;
  projectId?: string;
  error?: string;
  expired?: boolean;
  canRetry?: boolean;
  artifacts?: { id: string; url: string }[];
  report?: {
    width: number;
    height: number;
    applicationMode: string;
    sdkVersion: string;
    capturedAtUtc: string;
    logs: string;
    maxSampledMemoryBytes: number | null;
    samples: number;
    cleanupStatus: string;
    hardware: string;
    sleepTransition: string;
  };
};
export const nativeStatuses: Record<string, string> = {
  disabled: "未启用",
  not_requested: "未运行",
  queued: "排队中",
  running: "运行中",
  cancelling: "正在取消",
  succeeded: "截图已取得",
  failed: "验证失败",
  cancelled: "已取消",
  interrupted: "服务中断",
};
export const nativeActive = (s: string) =>
  ["queued", "running", "cancelling"].includes(s);
export function checkNativeState(value: unknown, id: string): NativeState {
  const state = value as NativeState;
  if (
    !state ||
    state.buildId !== id ||
    !Object.hasOwn(nativeStatuses, state.status)
  )
    throw Error("原生验证状态格式不正确");
  if (state.status === "succeeded" && !state.expired) {
    const pixels =
      state.target === "venu445mm"
        ? 454
        : state.target === "venu441mm"
          ? 390
          : 0;
    if (
      !pixels ||
      !state.report ||
      state.report.cleanupStatus !== "completed" ||
      state.report.width !== pixels ||
      state.report.height !== pixels ||
      !/^[a-f0-9]{64}$/.test(state.prgSha256 || "") ||
      !/^[a-f0-9]{64}$/.test(state.sourceSha256 || "") ||
      !Array.isArray(state.artifacts) ||
      !nativeArtifactPath(state, "screen.png") ||
      !nativeArtifactPath(state, "metadata.json")
    )
      throw Error("缺少原生截图的有效依据，未显示为验证成功");
  }
  return state;
}
export function nativeArtifactPath(
  state: NativeState,
  file: "screen.png" | "metadata.json",
) {
  const value = state.artifacts?.find((a) => a.id === file)?.url;
  if (!value) return undefined;
  if (
    value !==
    `/api/builds/${state.buildId}/native-verification/artifacts/${file}`
  )
    throw Error("拒绝不匹配任务的原生产物地址");
  return value;
}
export const nativeFailureMessage = (code?: string) =>
  ({
    frame_report_missing: "没有取得绘制完成报告",
    simulator_exited_before_capture: "模拟器在取得截图前退出",
    verification_timeout: "原生验证超时",
    cancelled: "验证已取消",
    service_restarted: "服务重启，本轮已中断",
    worker_failed: "验证服务失败或暂不可用，可按剩余次数重试",
    application_error_reported: "程序报告运行错误，请查看独立日志",
    capture_dimensions_invalid: "截图尺寸与目标设备不一致",
    invalid_verification_record: "验证记录无效，需要重新编译",
    container_cleanup_failed: "模拟器清理失败，本轮不交付通过结果",
  })[code || ""] ||
  code ||
  "验证未完成";
