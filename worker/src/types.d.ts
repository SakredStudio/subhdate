// Minimal Cloudflare Workers ambient types so the Worker typechecks without @cloudflare/workers-types.
// When the Worker is deployed for real, `npm i -D @cloudflare/workers-types` and delete this file.
interface D1Result<T = unknown> { results: T[]; success: boolean; meta: any; }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Database { prepare(query: string): D1PreparedStatement; batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>; }
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void; }
interface ScheduledEvent { readonly scheduledTime: number; readonly cron: string; }
