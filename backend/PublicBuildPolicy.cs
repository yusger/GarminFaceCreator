using Microsoft.Extensions.Options;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

sealed class PublicBuildPolicy
{
    readonly object gate = new();
    readonly Dictionary<string, (DateTime Window, int Count)> attempts = new();
    readonly Dictionary<string, int> uploads = new();
    readonly string ledger = Path.Combine(Path.GetFullPath(Environment.GetEnvironmentVariable("GFC_DATA") ?? "data"), "quota.json");
    readonly BuildLimitsOptions settings;
    public int PerMinute => settings.SubmissionsPerMinutePerIp;
    public int PerDay => settings.BuildsPerDayPerIp;
    public int GlobalPerDay => settings.BuildsPerDayGlobal;
    public int UploadTimeoutSeconds => settings.UploadTimeoutSeconds;
    public long MaxStorage => settings.StorageMb * 1024L * 1024;
    public long MinimumFree => settings.MinimumFreeMb * 1024L * 1024;
    public long MaxJobBytes => settings.JobMb * 1024L * 1024;
    Quota quota;
    public PublicBuildPolicy(IOptions<BuildLimitsOptions> options)
    {
        settings = options.Value;
        Directory.CreateDirectory(Path.GetDirectoryName(ledger)!);
        // Fail closed on corrupt persistent counters instead of silently resetting quotas.
        quota = File.Exists(ledger) ? JsonSerializer.Deserialize<Quota>(File.ReadAllText(ledger)) ?? throw new InvalidDataException("Invalid quota ledger") : new();
    }
    static string Today => DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8)).ToString("yyyyMMdd");
    public static string DailyRetry => Math.Max(1, (int)(DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8)).Date.AddDays(1) - DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8)).DateTime).TotalSeconds).ToString();
    public static string Ip(HttpContext ctx) => (ctx.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown");
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public static bool Authorize(BuildJob job, HttpContext ctx)
    {
        var header = ctx.Request.Headers.Authorization.ToString();
        if (job.AccessTokenHash.Length != 64 || !header.StartsWith("Bearer ", StringComparison.Ordinal) || header.Length != 71) return false;
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(header[7..])), Encoding.ASCII.GetBytes(job.AccessTokenHash));
    }
    public string? Enter(string ip, BuildStore store)
    {
        lock (gate)
        {
            var now = DateTime.UtcNow;
            foreach (var key in attempts.Where(pair => (now - pair.Value.Window).TotalMinutes >= 1).Select(pair => pair.Key).ToArray()) attempts.Remove(key);
            if (!attempts.TryGetValue(ip, out var row)) row = (now, 0);
            if (row.Count >= PerMinute || attempts.Count >= 10000) return "提交过于频繁，请稍后重试";
            attempts[ip] = (row.Window, row.Count + 1);
            var active = store.Jobs.Values.Count(j => j.Status is "queued" or "running" && j.CallerIpKey == Hash(ip));
            if (active + uploads.GetValueOrDefault(ip) >= 2 || uploads.Values.Sum() >= 2) return "当前编译或上传任务较多，请稍后重试";
            if (quota.Day != Today) quota = new() { Day = Today };
            if (quota.Total >= GlobalPerDay || quota.ByIp.GetValueOrDefault(Hash(ip)) >= PerDay) return "今日编译配额已用完，请明天再试";
            uploads[ip] = uploads.GetValueOrDefault(ip) + 1;
            return null;
        }
    }
    public void Leave(string ip) { lock (gate) { if (uploads.GetValueOrDefault(ip) <= 1) uploads.Remove(ip); else uploads[ip]--; } }
    public bool Charge(string ip)
    {
        lock (gate)
        {
            if (quota.Day != Today) quota = new() { Day = Today };
            var key = Hash(ip);
            if (quota.Total >= GlobalPerDay || quota.ByIp.GetValueOrDefault(key) >= PerDay) return false;
            quota.Total++; quota.ByIp[key] = quota.ByIp.GetValueOrDefault(key) + 1;
            var tmp = ledger + ".tmp";
            File.WriteAllText(tmp, JsonSerializer.Serialize(quota)); File.Move(tmp, ledger, true);
            return true;
        }
    }
    public bool HasSpace(string root, int reservations = 1)
    {
        var free = new DriveInfo(Path.GetPathRoot(root)!).AvailableFreeSpace;
        return free >= MinimumFree + reservations * MaxJobBytes && Size(root) + reservations * MaxJobBytes <= MaxStorage;
    }
    public static long Size(string path)
    {
        if (!Directory.Exists(path)) return 0;
        return Directory.EnumerateFiles(path, "*", new EnumerationOptions { RecurseSubdirectories = true, AttributesToSkip = FileAttributes.ReparsePoint }).Sum(file => new FileInfo(file).Length);
    }
    sealed class Quota
    {
        public string Day { get; set; } = Today;
        public int Total { get; set; }
        public Dictionary<string, int> ByIp { get; set; } = new();
    }
}
