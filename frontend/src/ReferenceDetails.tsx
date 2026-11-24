import { referenceAttribution } from "./attribution";
export default function ReferenceDetails({ id }: { id?: string }) {
  const ref = referenceAttribution(id);
  return ref ? (
    <details className="hint">
      <summary>参考来源与许可</summary>
      <p>{ref.summary}</p>
      <a href={ref.source} target="_blank" rel="noreferrer">
        {ref.name} 来源
      </a>
      {ref.files.map((file) => (
        <a
          key={file}
          style={{ display: "block" }}
          href={"/reference-notices/" + file}
          target="_blank"
          rel="noreferrer"
        >
          {file}
        </a>
      ))}
      <p>
        {ref.upstreamCommit
          ? `上游提交：${String(ref.upstreamCommit).slice(0, 12)}。`
          : "原始上游提交未记录。"}
        导出附当前参考包指纹及实际工程源码；保留来源关联不代表所有后续内容适用同一许可。
      </p>
    </details>
  ) : null;
}
