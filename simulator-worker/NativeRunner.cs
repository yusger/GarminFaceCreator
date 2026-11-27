using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Gfc.NativeSim;
using Microsoft.Extensions.Options;
sealed class NativeBusyException : Exception;
sealed class NativeRunner
{
    readonly WorkerOptions options; readonly SemaphoreSlim lane = new(1); readonly string root; readonly ILogger<NativeRunner> logger; readonly IHostApplicationLifetime lifetime; bool cleanupHealthy = true;
    public bool Busy => lane.CurrentCount == 0;
    public bool CleanupHealthy => cleanupHealthy;
    sealed record Counter(string Day, int Used);
    public NativeRunner(IOptions<WorkerOptions> settings, ILogger<NativeRunner> logger, IHostApplicationLifetime lifetime)
    {
        options = settings.Value; this.logger = logger; this.lifetime = lifetime; root = Sandbox.DirectoryPath(options.WorkRoot); options.SdkRoot = Sandbox.DirectoryPath(options.SdkRoot); options.DevicesRoot = Sandbox.DirectoryPath(options.DevicesRoot); options.FontsRoot = Sandbox.DirectoryPath(options.FontsRoot);
        if (!Regex.IsMatch(options.Image, "^[a-z0-9][a-z0-9:._/-]{1,160}$") || root.Length < 5 || new[] { options.SdkRoot, options.DevicesRoot, options.FontsRoot }.Any(p => p == root || p.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal) || root.StartsWith(p + Path.DirectorySeparatorChar, StringComparison.Ordinal))) throw new InvalidOperationException("Unsafe worker configuration");
        if (!File.Exists(Path.Combine(options.SdkRoot, "bin", "simulator")) || !File.Exists(Path.Combine(options.FontsRoot, "Roboto-Regular.ttf"))) throw new InvalidOperationException("Native worker SDK/font cache unavailable"); Directory.CreateDirectory(root); if (new DirectoryInfo(root).LinkTarget is not null) throw new InvalidOperationException("Linked worker root rejected");
    }
    public async Task CleanupOrphans(CancellationToken ct)
    {
        using var limit = CancellationTokenSource.CreateLinkedTokenSource(ct); limit.CancelAfter(TimeSpan.FromSeconds(30));
        if ((await Sandbox.Docker(["image", "inspect", options.Image], limit.Token)).Code != 0) throw new InvalidOperationException("Native image unavailable");
        var found = await Sandbox.Docker(["ps", "-a", "--filter", "label=gfc.native-worker=optional-v1", "--format", "{{.Names}}"], limit.Token); if (found.Code != 0) throw new InvalidOperationException("Container engine unavailable");
        foreach (var name in found.Text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)) { if (!Regex.IsMatch(name, "^gfc-native-[a-f0-9]{32}$")) throw new InvalidOperationException("Unexpected managed container identity"); if ((await Sandbox.Docker(["rm", "-f", name], limit.Token)).Code != 0) throw new InvalidOperationException("Could not reap native container"); }
        foreach (var path in Directory.EnumerateDirectories(root)) { if (Regex.IsMatch(Path.GetFileName(path), "^[a-f0-9]{32}$") && new DirectoryInfo(path).LinkTarget is null) Directory.Delete(path, true); }
    }
    void Charge()
    {
        string file = Path.Combine(root, "quota.json"), day = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8)).ToString("yyyyMMdd"); var current = File.Exists(file) ? JsonSerializer.Deserialize<Counter>(File.ReadAllText(file)) ?? throw new InvalidDataException("Invalid worker quota") : new(day, 0);
        if (current.Day != day) current = new(day, 0); if (current.Used >= options.RunsPerDay) throw new NativeBusyException(); var tmp = file + ".tmp"; File.WriteAllText(tmp, JsonSerializer.Serialize(current with { Used = current.Used + 1 })); File.Move(tmp, file, true);
    }
    public async Task<NativeVerification> Run(string target, string hash, byte[] prg, CancellationToken abort)
    {
        if (!cleanupHealthy) throw new NativeBusyException();
        if (Convert.ToHexStringLower(SHA256.HashData(prg)) != hash) throw new ArgumentException("PRG digest mismatch"); if (!await lane.WaitAsync(0, abort)) throw new NativeBusyException();
        string id = Guid.NewGuid().ToString("N"), name = "gfc-native-" + id, work = Path.Combine(root, id); long? maxMemory = null; int samples = 0; string logs = ""; NativeVerification? completed = null;
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(options.TimeoutSeconds)); using var linked = CancellationTokenSource.CreateLinkedTokenSource(abort, deadline.Token, lifetime.ApplicationStopping); var ct = linked.Token;
        NativeVerification Failure(string code) => completed = new(false, target, hash, 0, 0, null, logs, "", "unverified", "unknown", code, maxMemory, samples);
        try
        {
            Charge(); var input = Path.Combine(work, "input"); Directory.CreateDirectory(input); if (OperatingSystem.IsLinux()) { File.SetUnixFileMode(work, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute); File.SetUnixFileMode(input, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | UnixFileMode.GroupRead | UnixFileMode.GroupExecute | UnixFileMode.OtherRead | UnixFileMode.OtherExecute); }
            var source = Path.Combine(input, "watchface.prg"); await File.WriteAllBytesAsync(source, prg, ct); if (OperatingSystem.IsLinux()) File.SetUnixFileMode(source, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead | UnixFileMode.OtherRead);
            var started = await Sandbox.Docker(Sandbox.Arguments(options, name, input, target), ct); if (started.Code != 0) return Failure("container_start_failed");
            while (true)
            {
                ct.ThrowIfCancellationRequested(); var state = await Sandbox.Docker(["inspect", "--format", "{{.State.Running}}", name], ct); if (state.Code != 0 || state.Text.Trim() != "true") { logs = (await Sandbox.Docker(["logs", "--tail", "40", name], ct)).Text; return Failure("simulator_exited_before_capture"); }
                var stats = await Sandbox.Docker(["stats", "--no-stream", "--format", "{{.MemUsage}}", name], ct); if (stats.Code == 0 && Sandbox.SampleMemory(stats.Text) is { } memory) { maxMemory = maxMemory.HasValue ? Math.Max(memory, maxMemory.Value) : memory; samples++; }
                var metadata = await Sandbox.Docker(["exec", name, "cat", "/output/capture-metadata.txt"], ct); var match = Regex.Match(metadata.Text, @"(?m)^nativeCapture=(native-[A-Za-z0-9._-]+\.png)\r?$");
                if (match.Success)
                {
                    if (!metadata.Text.Contains("prgSha256=" + hash, StringComparison.Ordinal)) return Failure("capture_digest_mismatch"); var frame = Regex.Match(metadata.Text, @"(?m)^GFC_RENDER_READY target=" + Regex.Escape(target) + @" mode=(active|aod)\r?$"); if (!frame.Success) return Failure("frame_report_missing");
                    var png = await Sandbox.DockerBytes(["exec", name, "cat", "/output/" + match.Groups[1].Value], 2 * 1024 * 1024, ct);
                    var runtimeLog = await Sandbox.Docker(["exec", name, "tail", "-c", "16000", "/output/monkeydo.log"], ct); if (runtimeLog.Code == 0) logs = runtimeLog.Text;
                    logs = logs[..Math.Min(logs.Length, 16000)]; var pixels = target == "venu445mm" ? 454 : 390;
                    if (png.Length < 24 || !png.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) || BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(16, 4)) != pixels || BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(20, 4)) != pixels) return Failure("capture_dimensions_invalid");
                    if (Regex.IsMatch(logs, @"(?im)^Error:|Unhandled Exception|Symbol Not Found|Out Of Memory")) return Failure("application_error_reported");
                    var sdk = Regex.Match(metadata.Text, @"(?m)^\d+\.\d+\.[^\r\n]+"); return completed = new(true, target, hash, pixels, pixels, Convert.ToBase64String(png), logs, frame.Value.Trim(), frame.Groups[1].Value, sdk.Success ? sdk.Value : "unknown", "", maxMemory, samples);
                }
                await Task.Delay(500, ct);
            }
        }
        catch (NativeBusyException) { throw; }
        catch (OperationCanceledException) { return Failure(abort.IsCancellationRequested ? "cancelled" : "verification_timeout"); }
        catch (Exception error) { logger.LogWarning("Native task failed: {Type}", error.GetType().Name); return Failure("verification_failed"); }
        finally
        {
            try { using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(12)); var removed = await Sandbox.Docker(["rm", "-f", name], cleanup.Token); if (removed.Code != 0 && !removed.Text.Contains("No such container", StringComparison.OrdinalIgnoreCase)) { cleanupHealthy = false; logger.LogWarning("Native container cleanup did not complete"); } } catch (Exception error) { cleanupHealthy = false; logger.LogWarning("Native cleanup failed: {Type}", error.GetType().Name); }
            try { if (work.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal) && Directory.Exists(work) && new DirectoryInfo(work).LinkTarget is null) Directory.Delete(work, true); } catch (Exception error) { cleanupHealthy = false; logger.LogWarning("Native directory cleanup failed: {Type}", error.GetType().Name); }
            if (completed is not null) completed.CleanupStatus = cleanupHealthy ? "completed" : "failed"; lane.Release();
        }
    }
}
