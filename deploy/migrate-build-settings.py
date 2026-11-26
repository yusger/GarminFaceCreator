"""One-time migration of nonsecret legacy limits in .env into appsettings.json."""
import json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
settings = root / "backend/appsettings.json"
env = root / ".env"
mapping = {
    "GFC_BUILD_PER_MINUTE": ("BuildLimits", "SubmissionsPerMinutePerIp"),
    "GFC_BUILD_PER_DAY": ("BuildLimits", "BuildsPerDayPerIp"),
    "GFC_GLOBAL_BUILD_PER_DAY": ("BuildLimits", "BuildsPerDayGlobal"),
    "GFC_API_PER_MINUTE": ("BuildLimits", "ApiRequestsPerMinutePerIp"),
    "GFC_UPLOAD_SECONDS": ("BuildLimits", "UploadTimeoutSeconds"),
    "GFC_STORAGE_MB": ("BuildLimits", "StorageMb"),
    "GFC_MIN_FREE_MB": ("BuildLimits", "MinimumFreeMb"),
    "GFC_JOB_MB": ("BuildLimits", "JobMb"),
    "GFC_AUDIT_FILE_MB": ("AuditLog", "FileMb"),
    "GFC_AUDIT_TOTAL_MB": ("AuditLog", "TotalMb"),
    "GFC_AUDIT_DAYS": ("AuditLog", "RetentionDays"),
}
config = json.loads(settings.read_text(encoding="utf-8-sig"))
lines = env.read_text(encoding="utf-8-sig").splitlines() if env.exists() else []
remaining = []
count = 0
for line in lines:
    key, sep, value = line.partition("=")
    if sep and key.strip() in mapping:
        section, field = mapping[key.strip()]
        config[section][field] = int(value.strip().strip('"').strip("'"))
        count += 1
    else:
        remaining.append(line)
settings.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
if count:
    env.write_text("\n".join(remaining) + "\n", encoding="utf-8")
print("Migrated", count, "legacy limit overrides; usage ledger untouched")
