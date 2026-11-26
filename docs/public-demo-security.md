# Anonymous public demo protections

The public demo remains an anonymous service, with capabilities per build instead of user accounts. Each accepted submission returns a cryptographically random 256-bit `accessToken` once. All task status/log/download/cancel calls require `Authorization: Bearer <token>`. Tokens never appear in URLs and only SHA-256 hashes are persisted on the server. The browser keeps credentials in memory/sessionStorage, outside project JSON and localStorage. Old tasks without a token hash are inaccessible and must be rebuilt. Losing the browser session may require rebuilding; sharing a token grants access to that task.

Default limits (single backend instance) are defined in `backend/appsettings.json`, using validated .NET Options. No quota defaults are injected by Compose.

Configuration precedence is `appsettings.json` → `appsettings.{Environment}.json` → standard environment variables → command-line configuration. For example, `BuildLimits__BuildsPerDayPerIp=50` overrides the JSON setting. The optional private `runtime/backend.env` file is passed to Docker through Compose; place environment overrides there if needed. Legacy `GFC_BUILD_*`, `GFC_API_PER_MINUTE`, `GFC_UPLOAD_SECONDS` and storage/audit limit names are no longer used. Existing non-quota `GFC_DATA`, `GFC_LOGS`, SDK paths and trusted-proxy settings are unchanged.

Compose mounts `./backend/appsettings.json` read-only into `/app/appsettings.json`. Edit that host file and restart the app to apply changes (`sh deploy/manage-https.sh restart app` for the HTTPS deployment). For a changed environment file, recreate the app instead (`sh deploy/manage-https.sh up -d --no-build app`). Options are validated and captured at startup; invalid or missing required settings stop startup instead of silently disabling limits. Changing limits never resets the separate `runtime/jobs/quota.json` usage ledger. Environment-specific JSON files need to be supplied to the container separately if used.

| Setting | Default | Meaning |
|---|---:|---|
| `BuildLimits:SubmissionsPerMinutePerIp` | 6 | Submission attempts/IP/minute, including invalid submissions |
| `BuildLimits:BuildsPerDayPerIp` | 30 | Validated compilation submissions/IP/Beijing calendar day |
| `BuildLimits:BuildsPerDayGlobal` | 200 | All validated compilation submissions/day |
| `BuildLimits:ApiRequestsPerMinutePerIp` | 240 | API calls/IP/minute |
| `BuildLimits:UploadTimeoutSeconds` | 45 | Absolute multipart upload deadline; timeout returns 408 where possible, or closes an incomplete connection |
| Concurrent uploads | 2 | Global upload parsing limit and at most two unfinished tasks/uploads per IP |
| Build worker / queue | 1 / 8 | One Java compiler process, bounded queue |
| `BuildLimits:StorageMb` | 2048 | Jobs and metadata storage budget |
| `BuildLimits:MinimumFreeMb` | 1024 | Minimum free filesystem space, plus reservations for new tasks |
| `BuildLimits:JobMb` | 64 | Per-task byte budget; monitored during compilation |
| `AuditLog:FileMb` | 10 | Current daily audit file rotation size |
| `AuditLog:TotalMb` | 100 | Total retained audit log bytes |
| `AuditLog:RetentionDays` | 14 | Audit retention days |

Daily counters persist atomically in `runtime/jobs/quota.json`; restarting does not reset them. Validated failures, cancellations, and a full queue consume daily quota. Invalid requests consume the minute limit but not the daily count. Quota and frequency refusals return HTTP 429 with Retry-After; storage refusal returns 507. There is no administrator HTTP reset endpoint. Budgets and counters are per backend instance, not a distributed limiter.

Existing job TTL cleanup is retained. Admission reserves space for queued/running jobs and two possible uploads before reading multipart bodies; a 500 ms compiler monitor terminates a task if its storage budget or host free-space budget is exceeded. This is application-level enforcement, not a kernel filesystem quota; transient excess writes can occur between checks. Audit logs retain the daily `yyyyMMdd/MMdd.log` path, rotating archives beside it and pruning oldest archives within the configured byte/age limits. Docker stdout logs rotate at 10 MB × 3 per service.

The HTTPS overlay keeps only the proxy public. The backend has a read-only root filesystem, a 128 MB /tmp tmpfs, read-only SDK/device/key mounts and an internal Docker network without Internet egress. Caddy alone has the separate egress network and DNS credentials. Trusted forwarding is limited to the fixed proxy IP, preventing client X-Forwarded-For from changing quota identity. Cross-origin browser POST requests are rejected; command-line clients remain supported. Shared/NAT IPs share quota.

This is defense against ordinary anonymous-service misuse, not a claim of complete security, full multi-user isolation, a per-build VM sandbox or DDoS protection. Code is compiled in a common restricted container and is not run on the server. An SDK vulnerability remains a risk. Do not upload confidential projects to a public demo; use a private deployment for sensitive work. Keep backups and monitor host capacity and available SDK/runtime updates.

## Staging validation (2026-11-26)

- Real SDK compilation with read-only root and bounded tmpfs succeeded. Task status/log/download/cancel all require a matching capability; missing/wrong/query-string credentials and cross-origin POSTs were rejected.
- Separate low-quota containers verified HTTP 429 and Retry-After, daily counters surviving restart, API polling limits and HTTP 507 before body parsing. A 1-second test deadline terminated a stalled multipart upload without affecting health. Test containers/volume were removed afterwards.
- Policy unit tests covered IP/global daily limits, submission concurrency, persistent counters, storage admission and token hashes. Audit tests verified rotation/file/total-byte caps and concurrent writes.
- Existing 20-browser-test editing/AI-creation/preview/download suite passed on the staging service, using permissive staging quotas so regression traffic does not consume public demo capacity.

Public deployment validation: real SDK compilation and browser PRG download passed through HTTPS under default quotas. Missing/wrong task credentials and cross-site calls were rejected. Verified the compiler container has only the internal proxy network and no default route, a read-only root, no public host port, and no DNS API credentials. Production daily counters survived a backend restart unchanged. Browser task tokens stayed out of URL links and local/project storage.
