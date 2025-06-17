import { logSeverity } from "@/db/schema";

export type LogSeverity = typeof logSeverity.enumValues[number];

export function parseLogSeverity(value: string): LogSeverity | null {
  return logSeverity.enumValues.includes(value as LogSeverity)
    ? (value as LogSeverity)
    : null;
}
