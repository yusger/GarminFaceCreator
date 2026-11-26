using System.Net;
using System.Net.Sockets;
using System.Text;
using IP2Region.Net.XDB;

sealed class BuildAuditEntry
{
    public string Ip { get; init; } = "未知";
    public string Location { get; init; } = "未知";
    public string ProjectName { get; set; } = "未知项目";
    public string? JobId { get; set; }
    public bool Started { get; set; }
    public static BuildAuditEntry FromJob(BuildJob job) => new() { Ip = job.CallerIp, Location = job.CallerLocation, ProjectName = job.ProjectName, JobId = job.Id };
}

// Local-only lookup: visitor IP addresses are never sent to a geolocation service.
// Audit files are independent of job retention and are never exposed via wwwroot/API.
sealed class BuildAuditLog : IDisposable
{
    public const string ContextKey = "BuildAudit";
    readonly string root = Path.GetFullPath(Environment.GetEnvironmentVariable("GFC_LOGS") ?? Path.Combine("backend", "Logs"));
    readonly object gate = new();
    readonly ILogger<BuildAuditLog> logger;
    readonly Searcher? ipv4;
    readonly Searcher? ipv6;
    public BuildAuditLog(ILogger<BuildAuditLog> logger)
    {
        this.logger = logger;
        Directory.CreateDirectory(root);
        var probe = Path.Combine(root, ".write-test");
        File.WriteAllText(probe, ""); File.Delete(probe);
        var database = Environment.GetEnvironmentVariable("GFC_GEOIP") ?? Path.Combine("runtime", "geoip");
        ipv4 = Open(Path.Combine(database, "ip2region_v4.xdb"));
        ipv6 = Open(Path.Combine(database, "ip2region_v6.xdb"));
    }
    Searcher? Open(string path)
    {
        try
        {
            if (File.Exists(path)) return new Searcher(CachePolicy.Content, path);
            logger.LogWarning("Offline IP database missing: {Path}; location will be unknown", path);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or ArgumentException or InvalidDataException)
        { logger.LogWarning(e, "Offline IP database could not be loaded: {Path}", path); }
        return null;
    }
    public BuildAuditEntry CreateEntry(IPAddress? address)
    {
        if (address?.IsIPv4MappedToIPv6 == true) address = address.MapToIPv4();
        var ip = address?.ToString() ?? "未知";
        var location = "未知";
        if (address is not null)
        {
            if (IsLocal(address)) location = "内网/本机";
            else
            {
                try
                {
                    var searcher = address.AddressFamily == AddressFamily.InterNetwork ? ipv4 : ipv6;
                    var result = searcher?.Search(ip);
                    var parts = (result ?? "").Split('|').Where(value => !string.IsNullOrWhiteSpace(value) && value != "0").Distinct();
                    var found = string.Join("/", parts);
                    if (found.Length > 0) location = found;
                }
                catch (Exception e) when (e is ArgumentException or IOException or InvalidDataException)
                { logger.LogDebug(e, "Offline IP lookup failed"); }
            }
        }
        return new() { Ip = ip, Location = location };
    }
    static bool IsLocal(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip) || ip.Equals(IPAddress.Any) || ip.Equals(IPAddress.IPv6Any) || ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast) return true;
        var b = ip.GetAddressBytes();
        if (b.Length == 16) return (b[0] & 0xfe) == 0xfc;
        return b[0] is 0 or 10 or 127 or >= 224 || (b[0] == 172 && b[1] is >= 16 and <= 31) || (b[0] == 192 && b[1] == 168) || (b[0] == 169 && b[1] == 254) || (b[0] == 100 && b[1] is >= 64 and <= 127);
    }
    public void Begin(BuildAuditEntry entry)
    {
        if (entry.Started) return;
        entry.Started = true;
        Write(entry, "调用编译生成表盘");
    }
    // Prevent project names/compiler output from forging additional log records.
    static string Clean(string value) => string.Concat(value.Take(16000).Select(c => char.IsControl(c) || c is '\u2028' or '\u2029' ? " " : c is '[' ? "［" : c is ']' ? "］" : c.ToString()));
    readonly long maxFileBytes = PublicBuildPolicy.Read("GFC_AUDIT_FILE_MB", 10, 1, 100) * 1024L * 1024;
    readonly long maxTotalBytes = PublicBuildPolicy.Read("GFC_AUDIT_TOTAL_MB", 100, 2, 10240) * 1024L * 1024;
    readonly int keepDays = PublicBuildPolicy.Read("GFC_AUDIT_DAYS", 14, 1, 365);
    void Trim(string current, long incoming)
    {
        if (File.Exists(current) && new FileInfo(current).Length + incoming > Math.Min(maxFileBytes, maxTotalBytes))
            File.Move(current, Path.Combine(Path.GetDirectoryName(current)!, Path.GetFileNameWithoutExtension(current) + "-" + DateTime.UtcNow.ToString("HHmmssfffffff") + ".log"));
        var files = Directory.EnumerateDirectories(root).Where(dir => System.Text.RegularExpressions.Regex.IsMatch(Path.GetFileName(dir), "^[0-9]{8}$") && !File.GetAttributes(dir).HasFlag(FileAttributes.ReparsePoint))
            .SelectMany(dir => Directory.EnumerateFiles(dir, "*.log")).Select(path => new FileInfo(path)).Where(file => !file.Attributes.HasFlag(FileAttributes.ReparsePoint)).OrderBy(file => file.LastWriteTimeUtc).ToList();
        long total = files.Sum(file => file.Length);
        foreach (var file in files)
            if (file.FullName != current && (file.LastWriteTimeUtc < DateTime.UtcNow.AddDays(-keepDays) || total + incoming > maxTotalBytes)) { total -= file.Length; file.Delete(); }
    }
    public void Write(BuildAuditEntry entry, string message)
    {
        var now = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8));
        var header = $"{now:yyyy-MM-dd HH:mm:ss.fff zzz} [{Clean(entry.Ip)}]({Clean(entry.Location)})";
        var text = message == "调用编译生成表盘"
            ? $"{header}调用编译生成表盘[{Clean(entry.ProjectName)}]"
            : $"{header}[{Clean(entry.ProjectName)}][任务:{Clean(entry.JobId ?? "未入队")}] {Clean(message)}";
        try
        {
            lock (gate)
            {
                var directory = Path.Combine(root, now.ToString("yyyyMMdd", System.Globalization.CultureInfo.InvariantCulture));
                Directory.CreateDirectory(directory);
                var current = Path.Combine(directory, now.ToString("MMdd", System.Globalization.CultureInfo.InvariantCulture) + ".log");
                Trim(current, Encoding.UTF8.GetByteCount(text + "\n"));
                File.AppendAllText(current, text + "\n", new UTF8Encoding(false));
            }
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        { logger.LogError(e, "Could not append build audit log: {Entry}", text); }
    }
    public void Dispose() { ipv4?.Dispose(); ipv6?.Dispose(); }
}
