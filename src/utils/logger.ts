/**
 * Lightweight opt-in logging.
 *
 * The MCP server speaks JSON-RPC over stdout, so all diagnostics go to stderr.
 * Verbose per-call tracing is noisy in normal use and was previously always-on
 * (plus written to a hardcoded /tmp file). It is now gated behind the
 * DISCORD_MCP_DEBUG environment variable and off by default.
 */

const DEBUG_ENABLED = (() => {
  const flag = process.env.DISCORD_MCP_DEBUG;
  return flag === '1' || flag === 'true';
})();

/** Verbose tracing — only emitted when DISCORD_MCP_DEBUG is set. */
export function debug(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.error('[debug]', ...args);
  }
}

/** Operational messages that should always be visible (startup, shutdown). */
export function info(...args: unknown[]): void {
  console.error(...args);
}

/** Warnings that are worth surfacing but are not fatal. */
export function warn(...args: unknown[]): void {
  console.error('[warn]', ...args);
}
