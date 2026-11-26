# Anonymous public demo protections

The public demo remains an anonymous service, with capabilities per build instead of user accounts. Each accepted submission returns a cryptographically random 256-bit `accessToken` once. All task status/log/download/cancel calls require `Authorization: Bearer <token>`. Tokens never appear in URLs and only SHA-256 hashes are persisted on the server. The browser keeps credentials in memory/sessionStorage, outside project JSON and localStorage. Old tasks without a token hash are inaccessible and must be rebuilt. Losing the browser session may require rebuilding; sharing a token grants access to that task.

Default limits (single backend instance):

| Setting | Default | Meaning |
|---|---:|---|
| `GFC_BUILD_PER_MINUTE` | 6 | Submission attempts/IP/minute, including invalid submissions |
| `GFC_BUILD_PER_DAY` | 30 | Validated compilation submissions/IP/Beijing calendar day |
| `GFC_GLOBAL_BUILD_PER_DAY` | 200 | All validated compilation submissions/day |
| `GFC_API_PER_MINUTE` | 240 | API calls/IP/minute |
| `GFC_UPLOAD_SECONDS` | 45 | Absolute multipart upload deadline; slow uploads return 408 |
| Concurrent uploads | 2 | Global upload parsing limit and at most two unfinished tasks/uploads per IP |
| Build worker / queue | 1 / 8 | One Java compiler process, bounded queue |
| `GFC_STORAGE_MB` | 2048 | Jobs and metadata storage budget |
| `GFC_MIN_FREE_MB` | 1024 | Minimum free filesystem space, plus reservations for new tasks |
| `GFC_JOB_MB` | 64 | Per-task byte budget; monitored during compilation |
| `GFC_AUDIT_FILE_MB` | 10 | Current daily audit file rotation size |
| `GFC_AUDIT_TOTAL_MB` | 100 | Total retained audit log bytes |
| `GFC_AUDIT_DAYS` | 14 | Audit retention days |

Daily counters persist atomically in `runtime/jobs/quota.json`; restarting does not reset them. Validated failures, cancellations, and a full queue consume daily quota. Invalid requests consume the minute limit but not the daily count. Quota and frequency refusals return HTTP 429 with Retry-After; storage refusal returns 507. There is no administrator HTTP reset endpoint. Budgets and counters are per backend instance, not a distributed limiter.

Existing job TTL cleanup is retained. Admission reserves space for queued/running jobs and two possible uploads before reading multipart bodies; a 500 ms compiler monitor terminates a task if its storage budget or host free-space budget is exceeded. This is application-level enforcement, not a kernel filesystem quota; transient excess writes can occur between checks. Audit logs retain the daily `yyyyMMdd/MMdd.log` path, rotating archives beside it and pruning oldest archives within the configured byte/age limits. Docker stdout logs rotate at 10 MB × 3 per service.

The HTTPS overlay keeps only the proxy public. The backend has a read-only root filesystem, a 128 MB /tmp tmpfs, read-only SDK/device/key mounts and an internal Docker network without Internet egress. Caddy alone has the separate egress network and DNS credentials. Trusted forwarding is limited to the fixed proxy IP, preventing client X-Forwarded-For from changing quota identity. Cross-origin browser POST requests are rejected; command-line clients remain supported. Shared/NAT IPs share quota.

This is defense against ordinary anonymous-service misuse, not a claim of complete security, full multi-user isolation, a per-build VM sandbox or DDoS protection. Code is compiled in a common restricted container and is not run on the server. An SDK vulnerability remains a risk. Do not upload confidential projects to a public demo; use a private deployment for sensitive work. Keep backups and monitor host capacity and available SDK/runtime updates.
