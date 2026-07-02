# Changelog

## 2.1.0

Role-hierarchy overhaul plus a batch of correctness fixes surfaced by a full audit.

### Roles
- **`create_role` now actually places the role.** Previously it accepted a
  `position` argument but silently discarded it, so every new role was created at
  the bottom of the hierarchy. It now supports semantic `placement`
  (`top` / `bottom` / `above` / `below` with `referenceRoleId`) and a raw
  `position`, computing Discord's inverted position numbers internally and
  clamping below the bot's own highest role.
- **`reorder_roles` gains `orderedRoleIds`** — pass role IDs from most important
  (top) to least and the server computes positions for you. The old explicit
  `rolePositions` form still works; provide exactly one.
- **New `list_roles` tool** — returns roles sorted highest-to-lowest with each
  role's position, whether the bot can manage it, and `botHighestRolePosition`.
- `get_guild_info` now returns roles sorted by hierarchy (highest first) and
  includes `botHighestRolePosition`; channels are sorted by position.
- `edit_role` reports a warning when a position change fails instead of claiming
  success, and invalid `create_role` placement input now fails *before* the role
  is created (no more orphaned roles).

### Permissions
- **Fixed silently-dropped permissions.** `USE_VAD` and `SEND_TTS_MESSAGES` (and
  any acronym permission) were mangled by name-casing and dropped from roles,
  channel overwrites, and every built-in template. Permission resolution is now
  acronym-proof and shared across all tools.
- Unknown/misspelled permission names are now rejected with a clear error rather
  than silently ignored.

### Channels
- **`edit_channel` permission overwrites now merge by target** (add/replace the
  named roles/users, leave others intact) instead of replacing the entire set,
  which could silently un-privatize a channel. Set `replaceAllOverwrites: true`
  for the old full-replace behavior.

### Templates
- `apply_template` now reports per-item failures and skipped (already-existing)
  roles instead of always claiming success; existing roles are skipped rather
  than duplicated.
- Template `systemChannel` / `afkChannel` / `afkTimeout` are now actually applied
  (AFK timeout snapped to Discord's allowed values). Missing **Manage Server**
  permission downgrades these to a non-fatal warning rather than failing the run.
- Fixed the `study-group` template id mismatch; template ids accept hyphen or
  underscore interchangeably.

### Reliability & cleanup
- Dropped the privileged **GuildMembers** gateway intent — it was never needed
  and requesting an unenabled privileged intent made login fail. Only the default
  Guilds intent is used now, so no privileged intents are required.
- Client reuse/reconnect no longer destroys a client that in-flight operations
  may still hold; a permanently invalidated session is rebuilt on next use.
- Role/edit operations go through discord.js's REST manager (rate-limit queue +
  proper Discord error mapping) instead of raw `fetch`.
- Guild name collisions now raise a clear error listing candidates instead of
  silently targeting an arbitrary server.
- Verbose debug logging is off by default and gated behind `DISCORD_MCP_DEBUG`
  (was always-on and written to a hardcoded `/tmp` file).
- `update_server_settings` rejects an empty update; server description limit
  raised to 300.
- Removed dead code: unused `validation.ts`, unused `rateLimit` config, and the
  hand-written per-tool `inputSchema` objects that never reached MCP clients
  (parameter docs now come from Zod `.describe()`).

## 2.0.0

Complete rewrite from AppleScript to the Discord Bot API (discord.js): cross-platform
support, bot-token authentication, multi-server (`list_guilds`/`select_guild`),
channel permission overwrites, and permission-name conversion.
