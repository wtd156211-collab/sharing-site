const sensitiveKey = /(token|password|secret|cookie|authorization|api[-_]?key|vapid)/i;

export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => redact(item)) as T;
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    output[key] = sensitiveKey.test(key) ? "[REDACTED]" : redact(child);
  }
  return output as T;
}
