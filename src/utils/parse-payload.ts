import type { LogEntry } from "@/lib/constants";

export function parsePayload(log: string): LogEntry | null {
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const match = log.match(/^<([^:]+):\s*(.+)>$/);
  if (!match)
    return null;

  const [, type, content] = match;
  return { type: type.trim(), content: content.trim() };
}

export function parsePayloadDefault(log: string): LogEntry {
  const [type, ...rest] = log.split(":");
  return {
    type: type.trim(),
    content: rest.join(":").trim(),
  };
}
