export type LogBuffer = { id: string; cursor: number; lines: string[] };
export function mergeLogs(
  buffer: LogBuffer,
  packet: { lines: string[]; nextCursor: number; reset?: boolean },
): LogBuffer {
  if (
    !Array.isArray(packet.lines) ||
    packet.lines.some((line) => typeof line !== "string") ||
    !Number.isInteger(packet.nextCursor) ||
    packet.nextCursor < 0
  )
    throw Error("编译日志格式不正确");
  const reset = packet.reset || packet.nextCursor < buffer.cursor;
  const base = reset ? [] : buffer.lines;
  if (packet.nextCursor !== (reset ? 0 : buffer.cursor) + packet.lines.length)
    throw Error("编译日志游标不一致，请重新连接任务");
  return {
    ...buffer,
    lines: [...base, ...packet.lines],
    cursor: packet.nextCursor,
  };
}
export function diagnostic(line: string) {
  const match = line.match(
    /(?:^|[\\/])((?:source|resources)[\\/][^:\s]+):(\d+)(?:,(\d+))?/,
  );
  return match
    ? { path: match[1].replaceAll("\\", "/"), line: Number(match[2]) }
    : null;
}
