/**
 * Permission name resolution
 *
 * Discord permissions are referenced throughout this server in
 * SCREAMING_SNAKE_CASE (e.g. VIEW_CHANNEL, SEND_TTS_MESSAGES), while discord.js
 * exposes them as PascalCase keys on PermissionFlagsBits (ViewChannel,
 * SendTTSMessages). Earlier code reconstructed the PascalCase name by
 * title-casing each underscore-delimited word, which mangled acronyms:
 * SEND_TTS_MESSAGES -> "SendTtsMessages" (real key is "SendTTSMessages") and
 * USE_VAD -> "UseVad" (real key is "UseVAD"). Those bits were then silently
 * dropped, so roles/channels/templates requesting them ended up without them.
 *
 * Instead of reconstructing case, we normalize both sides by discarding case
 * and separators entirely and match on the result. This is acronym-proof and
 * also tolerates PascalCase input. Unknown names are reported rather than
 * silently ignored so callers can surface a clear error.
 */

import { PermissionFlagsBits } from 'discord.js';

/** Collapse a permission name to a case/separator-insensitive key. */
function normalize(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/** normalized name -> permission bit, built once from discord.js. */
const PERMISSION_LOOKUP: Map<string, bigint> = new Map(
  Object.entries(PermissionFlagsBits).map(([key, value]) => [
    normalize(key),
    value as bigint,
  ])
);

export interface ResolvedPermissions {
  /** OR of every recognized permission bit. */
  bitfield: bigint;
  /** Input names that did not match any Discord permission. */
  unknown: string[];
}

/**
 * Resolves an array of permission names to a combined bitfield.
 * Recognized names (any casing, snake or Pascal) are OR'd together; unrecognized
 * names are collected in `unknown` instead of being silently discarded.
 */
export function resolvePermissions(names: readonly string[]): ResolvedPermissions {
  let bitfield = 0n;
  const unknown: string[] = [];

  for (const name of names) {
    const bit = PERMISSION_LOOKUP.get(normalize(name));
    if (bit === undefined) {
      unknown.push(name);
    } else {
      bitfield |= bit;
    }
  }

  return { bitfield, unknown };
}

/**
 * Resolves permission names, throwing if any are unrecognized. Use in
 * user-facing tools where a misspelled permission should fail loudly rather
 * than produce a role/overwrite that is silently missing permissions.
 */
export function resolvePermissionsStrict(names: readonly string[]): bigint {
  const { bitfield, unknown } = resolvePermissions(names);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown permission name(s): ${unknown.join(', ')}. ` +
        `Use SCREAMING_SNAKE_CASE names like VIEW_CHANNEL, SEND_MESSAGES, USE_VAD.`
    );
  }
  return bitfield;
}
