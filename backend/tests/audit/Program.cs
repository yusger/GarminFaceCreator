using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
var root = Path.Combine(Path.GetTempPath(), "gfc-audit-" + Guid.NewGuid().ToString("N"));
Environment.SetEnvironmentVariable("GFC_LOGS", root);
Environment.SetEnvironmentVariable("GFC_GEOIP", Path.GetFullPath("runtime/geoip"));
void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
using (var log = new BuildAuditLog(NullLogger<BuildAuditLog>.Instance))
{
    foreach (var ip in new[] { "127.0.0.1", "::1", "::ffff:192.168.1.5", "fc00::1" })
        Check(log.CreateEntry(IPAddress.Parse(ip)).Location == "内网/本机", "local IP classification");
    Check(log.CreateEntry(IPAddress.Parse("::ffff:8.8.8.8")).Ip == "8.8.8.8", "normalize mapped IPv4");
    foreach (var ip in new[] { "8.8.8.8", "240e::1" })
    {
        var entry = log.CreateEntry(IPAddress.Parse(ip));
        Check(entry.Location != "未知", "offline lookup failed: " + ip);
    }
    var test = new BuildAuditEntry { Ip = "8.8.8.8", Location = "测试地区", ProjectName = "表盘\r\n[伪造]\u2028记录", JobId = "audit-test" };
    log.Begin(test); log.Begin(test);
    Parallel.For(0, 100, i => log.Write(test, "ERROR test " + i));
}
var now = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8));
var file = Path.Combine(root, now.ToString("yyyyMMdd"), now.ToString("MMdd") + ".log");
var lines = File.ReadAllLines(file);
Check(lines.Length == 101, "concurrent append lost records or injected lines");
Check(lines.Count(l => l.Contains("调用编译生成表盘")) == 1, "duplicate invocation");
Check(lines.All(l => l.Contains("[8.8.8.8](测试地区)") && !l.Contains("[伪造]")), "missing identity or unescaped brackets");
Check(lines.Count(l => l.Contains("ERROR test")) == 100, "errors not recorded");
Environment.SetEnvironmentVariable("GFC_GEOIP", Path.Combine(root, "missing"));
using (var log = new BuildAuditLog(NullLogger<BuildAuditLog>.Instance))
    Check(log.CreateEntry(IPAddress.Parse("8.8.8.8")).Location == "未知", "missing database fallback");
Console.WriteLine("PASS offline IPv4/IPv6, private IPs, UTC+8 date layout, concurrent file append, injection escaping, error logs and missing-database fallback");
// Test artifacts live only in this randomly named temporary directory.
Environment.SetEnvironmentVariable("GFC_AUDIT_FILE_MB", "1");
Environment.SetEnvironmentVariable("GFC_AUDIT_TOTAL_MB", "2");
using (var log = new BuildAuditLog(NullLogger<BuildAuditLog>.Instance))
    for (int i=0;i<1200;i++) log.Write(new(), new string('x',4000));
var rotated = Directory.GetFiles(root,"*.log",SearchOption.AllDirectories).Select(p=>new FileInfo(p)).ToArray();
Check(rotated.Sum(f=>f.Length)<=2L*1024*1024 && rotated.All(f=>f.Length<=1024*1024),"audit rotation/total cap");
Console.WriteLine("PASS bounded audit rotation and total byte limit");
record BuildJob(string CallerIp, string CallerLocation, string ProjectName, string Id);

static class PublicBuildPolicy { public static int Read(string name, int fallback, int min, int max) => int.TryParse(Environment.GetEnvironmentVariable(name), out var n) ? Math.Clamp(n, min, max) : fallback; }
