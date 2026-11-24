using System.Text.RegularExpressions;
record RetentionPolicy(int ProjectHours, int ArtifactHours, int LogHours, int MetadataHours, int MaxTerminalJobs, int MinimumHours)
{
    public static RetentionPolicy FromEnvironment() => new(Read("GFC_PROJECT_RETENTION_HOURS", 48), Read("GFC_ARTIFACT_RETENTION_HOURS", 168), Read("GFC_LOG_RETENTION_HOURS", 168), Read("GFC_METADATA_RETENTION_HOURS", 720), Read("GFC_MAX_TERMINAL_JOBS", 200), Read("GFC_MIN_RETENTION_HOURS", 24));
    static int Read(string key, int fallback) => int.TryParse(Environment.GetEnvironmentVariable(key), out var n) ? Math.Clamp(n, 1, 8760) : fallback;
}
partial class BuildStore
{
    public RetentionPolicy Retention { get; } = RetentionPolicy.FromEnvironment();
    public void Cleanup(DateTime now)
    {
        var terminal = Jobs.Values.Where(j => j.Finished.HasValue && j.Status is not ("queued" or "running")).OrderBy(j => j.Finished).ToArray();
        var excess = Math.Max(0, terminal.Length - Retention.MaxTerminalJobs);
        foreach (var j in terminal)
        {
            lock (j.Gate)
            {
                if (j.WorkerActive || j.Downloads > 0 || !j.Finished.HasValue || j.Status is "queued" or "running") continue;
                var age = (now - j.Finished.Value).TotalHours;
                if (age < Retention.MinimumHours) continue;
                if (age >= Retention.ProjectHours && !j.ProjectExpired) { DeletePart(j, "project"); j.ProjectExpired = true; }
                if (age >= Retention.ArtifactHours && !j.ArtifactExpired) { DeletePart(j, "output"); j.ArtifactExpired = true; }
                if (age >= Retention.LogHours && !j.LogsExpired) { j.Logs.Clear(); j.LogsExpired = true; }
                if (j.ProjectExpired && j.ArtifactExpired && j.LogsExpired && (age >= Retention.MetadataHours || excess > 0))
                {
                    DeletePart(j, ""); Jobs.TryRemove(j.Id, out _); if (excess > 0) excess--;
                }
                else Persist(j);
            }
        }
    }
    void DeletePart(BuildJob job, string part)
    {
        if (!Regex.IsMatch(job.Id, "^[a-f0-9]{32}$")) throw new InvalidOperationException("Invalid cleanup job identity");
        var path = Within(Root, part.Length == 0 ? job.Id : job.Id + "/" + part);
        var jobPath = Within(Root, job.Id);
        if (Directory.Exists(jobPath) && File.GetAttributes(jobPath).HasFlag(FileAttributes.ReparsePoint)) throw new InvalidOperationException("Refusing linked job directory");
        if (!Directory.Exists(path)) return;
        if (File.GetAttributes(path).HasFlag(FileAttributes.ReparsePoint)) throw new InvalidOperationException("Refusing linked cleanup directory");
        Directory.Delete(path, true);
    }
}
class RetentionWorker(BuildStore store, ILogger<RetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        do { try { store.Cleanup(DateTime.UtcNow); } catch (Exception error) { logger.LogWarning("Task retention skipped: {Message}", error.Message); } }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
class ArtifactDownload(BuildStore store, BuildJob job) : IResult
{
    public async Task ExecuteAsync(HttpContext context)
    {
        FileStream? stream = null;
        lock (job.Gate)
        {
            var path = store.ArtifactPath(job);
            if (job.Status == "succeeded" && !job.ArtifactExpired && File.Exists(path)) { stream = File.OpenRead(path); job.Downloads++; }
        }
        if (stream is null) { context.Response.StatusCode = 410; return; }
        try { await Results.Stream(stream, "application/octet-stream", BuildStore.FileName(job)).ExecuteAsync(context); }
        finally { await stream.DisposeAsync(); lock (job.Gate) job.Downloads--; }
    }
}
