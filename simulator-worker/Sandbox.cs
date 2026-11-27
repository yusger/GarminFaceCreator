using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
sealed record ToolResult(int Code, string Text);
static class Sandbox
{
    public static readonly string[] Targets = ["venu445mm", "venu441mm"];
    public static void ValidateIdentity(string target, string hash, string buildId)
    {
        if (!Targets.Contains(target) || !Regex.IsMatch(hash, "^[a-f0-9]{64}$") || !Regex.IsMatch(buildId, "^[a-f0-9]{32}$")) throw new ArgumentException("Invalid target, digest or task identity");
    }
    public static string DirectoryPath(string value)
    {
        if (!Path.IsPathFullyQualified(value) || value.IndexOfAny([',', '\r', '\n']) >= 0) throw new ArgumentException("Worker paths must be absolute and contain no mount delimiters");
        return Path.GetFullPath(value).TrimEnd(Path.DirectorySeparatorChar);
    }
    public static string[] Arguments(WorkerOptions options, string name, string input, string target) => [
     "run","-d","--name",name,"--label","gfc.native-worker=optional-v1","--network","none","--memory","768m","--pids-limit","128","--cpus","1","--cap-drop","ALL","--security-opt","no-new-privileges","--read-only",
  "--log-driver","json-file","--log-opt","max-size=1m","--log-opt","max-file=1",
  "--tmpfs","/tmp:rw,exec,size=128m,mode=1777","--tmpfs","/home/probe:rw,size=64m,uid=10001,gid=10001","--tmpfs","/output:rw,size=16m,uid=10001,gid=10001",
  "--mount",$"type=bind,src={options.SdkRoot},dst=/sdk,readonly","--mount",$"type=bind,src={options.DevicesRoot},dst=/device-cache/Devices,readonly","--mount",$"type=bind,src={options.FontsRoot},dst=/device-cache/Fonts,readonly","--mount",$"type=bind,src={input},dst=/input,readonly",
  "-e",$"DEVICE={target}","-e","PROBE_READY_MARKER=GFC_RENDER_READY","-e","PROBE_CAPTURE_DIALOG=1","-e","PROBE_HOLD_SECONDS=20","-e","LIBGL_ALWAYS_SOFTWARE=1","-e","GDK_BACKEND=x11",options.Image];
    public static async Task<ToolResult> Docker(IEnumerable<string> args, CancellationToken ct)
    {
        var psi = new ProcessStartInfo("docker") { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true }; foreach (var arg in args) psi.ArgumentList.Add(arg);
        using var process = Process.Start(psi) ?? throw new InvalidOperationException("Container client unavailable"); using var registration = ct.Register(() => { try { if (!process.HasExited) process.Kill(true); } catch (InvalidOperationException) { } });
        async Task<string> Drain(StreamReader reader) { var result = new StringBuilder(); var buffer = new char[2048]; int count; while ((count = await reader.ReadAsync(buffer)) > 0) if (result.Length < 16000) result.Append(buffer, 0, Math.Min(count, 16000 - result.Length)); return result.ToString(); }
        var stdout = Drain(process.StandardOutput); var stderr = Drain(process.StandardError); try { await process.WaitForExitAsync(ct); } catch { try { if (!process.HasExited) process.Kill(true); await Task.WhenAll(stdout, stderr).WaitAsync(TimeSpan.FromSeconds(2)); } catch { } throw; }
        return new(process.ExitCode, (await stdout) + "\n" + (await stderr));
    }
    public static long? SampleMemory(string stats)
    {
        var m = Regex.Match(stats, @"([0-9.]+)\s*(KiB|MiB|GiB|B)"); if (!m.Success || !double.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var n)) return null;
        var unit = m.Groups[2].Value switch { "KiB" => 1024L, "MiB" => 1024L * 1024, "GiB" => 1024L * 1024 * 1024, _ => 1L }; return (long)(n * unit);
    }
    public static async Task<byte[]> PlainFile(string path, int maximum, CancellationToken ct)
    {
        var info = new FileInfo(path); if (!info.Exists || info.LinkTarget is not null || info.Attributes.HasFlag(FileAttributes.ReparsePoint) || info.Length < 1 || info.Length > maximum) throw new InvalidDataException("Invalid verification output"); return await File.ReadAllBytesAsync(path, ct);
    }
}
