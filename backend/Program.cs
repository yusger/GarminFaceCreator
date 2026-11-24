using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using System.Xml;
using System.Xml.Linq;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 25 * 1024 * 1024);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 25 * 1024 * 1024);
builder.Services.AddSingleton<BuildStore>();
builder.Services.AddHostedService<BuildWorker>();
var app = builder.Build();
app.Use(async (ctx, next) => { try { await next(ctx); } catch (Exception e) when (e is ArgumentException or InvalidDataException or XmlException or JsonException or BadHttpRequestException) { if (!ctx.Response.HasStarted) { ctx.Response.StatusCode = 400; await ctx.Response.WriteAsJsonAsync(new { error = e.Message }); } } });
app.UseDefaultFiles(); app.UseStaticFiles();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", framework = ".NET 10" }));
app.MapGet("/api/capabilities", (BuildStore store) => new { sdkVersion = "9.3.0", targets = BuildStore.Targets, ready = store.Ready, common = store.Readiness.Common(), devices = BuildStore.Targets.Select(store.Readiness.ForTarget), maxUploadBytes = 25 * 1024 * 1024, maxFiles = 100, queueCapacity = 8 });
app.MapPost("/api/builds", async (HttpRequest request, BuildStore store, CancellationToken ct) =>
{
    if (!request.HasFormContentType) return Results.BadRequest(new { error = "Expected multipart form" });
    var form = await request.ReadFormAsync(ct); var meta = JsonSerializer.Deserialize<BuildRequest>(form["project"].ToString(), BuildStore.Json) ?? throw new ArgumentException("Missing project metadata");
    if (!Guid.TryParse(meta.ProjectId, out _) || !Regex.IsMatch(meta.AppId ?? "", "^[a-fA-F0-9]{32}$") || !BuildStore.Targets.Contains(meta.Target) || meta.Revision < 0) throw new ArgumentException("Invalid project, appId or target");
    var readiness = store.Readiness.ForTarget(meta.Target);
    if (!readiness.Ready) return Results.Problem($"目标 {meta.Target} 编译环境未就绪：{string.Join("；", readiness.Reasons)}", statusCode: 503);
    if (form.Files.Count is < 2 or > 100) throw new ArgumentException("Expected 2 to 100 files");
    var job = store.Create(meta);
    _ = BuildStore.FileName(job); var work = store.Work(job.Id); Directory.CreateDirectory(work);
    try
    {
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase); long size = 0;
        foreach (var file in form.Files) { var name = file.FileName.Replace('\\', '/'); if (name.Any(c => c > 127)) throw new ArgumentException("工程文件路径请使用 ASCII 字母、数字、下划线或连字符；素材显示名称可以使用中文，网页上传会自动生成兼容路径。"); if (!Regex.IsMatch(name, @"^(manifest\.xml|monkey\.jungle|(source|resources|assets)/[\w./-]+\.(mc|xml|svg|png|jpg|jpeg|fnt))$") || name.Split('/').Any(s => s == ".." || s == ".") || !names.Add(name)) throw new ArgumentException("Invalid or duplicate file path"); size += file.Length; if (size > 25 * 1024 * 1024 || file.Length == 0) throw new ArgumentException("Empty file or upload exceeds limit"); var dest = BuildStore.Within(work, name); Directory.CreateDirectory(Path.GetDirectoryName(dest)!); await using var stream = new FileStream(dest, FileMode.CreateNew); await file.CopyToAsync(stream, ct); }
        if (!names.Contains("manifest.xml") || !names.Contains("monkey.jungle") || !names.Any(n => n.StartsWith("source/", StringComparison.OrdinalIgnoreCase) && n.EndsWith(".mc"))) throw new ArgumentException("Missing manifest, jungle or source");
        foreach (var name in names.Where(n => n.EndsWith(".xml") || n.EndsWith(".svg")))
        {
            var path = BuildStore.Within(work, name); var xml = BuildStore.ReadXml(path); if (name == "manifest.xml") { XNamespace ns = "http://www.garmin.com/xml/connectiq"; var a = xml.Root?.Element(ns + "application") ?? throw new ArgumentException("Invalid manifest"); if ((string?)a.Attribute("type") != "watchface" || ((string?)a.Attribute("id"))?.Replace("-", "") != meta.AppId) throw new ArgumentException("Manifest app identity/type mismatch"); var products = a.Element(ns + "products")?.Elements(ns + "product").ToArray(); if (products is null || products.Length != 1 || (string?)products[0].Attribute("id") != meta.Target) throw new ArgumentException("Manifest device must match target"); }
            foreach (var attr in xml.Descendants().Attributes().Where(a => a.Name.LocalName is "filename" or "href")) { if (attr.Value.StartsWith('#') || attr.Value.StartsWith('@')) continue; var relative = Path.GetRelativePath(work, Path.GetFullPath(Path.Combine(Path.GetDirectoryName(path)!, attr.Value))); BuildStore.Within(work, relative); if (Uri.TryCreate(attr.Value, UriKind.Absolute, out _)) throw new ArgumentException("External resource paths are not allowed"); }
        }
        // Never execute or trust uploaded Jungle directives or build scripts.
        await File.WriteAllTextAsync(Path.Combine(work, "monkey.jungle"), "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources\n", ct);
        if (!store.Enqueue(job)) { Directory.Delete(Path.GetDirectoryName(work)!, true); return Results.Problem("Build queue is full", statusCode: 503); }
        return Results.Accepted($"/api/builds/{job.Id}", store.View(job));
    }
    catch { var path = Path.GetDirectoryName(work)!; if (Directory.Exists(path)) Directory.Delete(path, true); throw; }
}).DisableAntiforgery();
app.MapGet("/api/builds/{id}", (string id, BuildStore s) => s.Jobs.TryGetValue(id, out var j) ? Results.Ok(s.View(j)) : Results.NotFound());
app.MapGet("/api/builds/{id}/logs", (string id, int? after, BuildStore s) => { if (!s.Jobs.TryGetValue(id, out var j)) return Results.NotFound(); lock (j.Gate) { var reset = after is < 0 || after > j.Logs.Count; var cursor = reset ? 0 : after ?? 0; return Results.Ok(new { lines = j.Logs.Skip(cursor).ToArray(), nextCursor = j.Logs.Count, reset }); } });
app.MapPost("/api/builds/{id}/cancel", (string id, BuildStore s) => { if (!s.Jobs.TryGetValue(id, out var j)) return Results.NotFound(); lock (j.Gate) { if (j.Status is "queued" or "running") { j.Cancel.Cancel(); j.Status = "cancelled"; j.Finished = DateTime.UtcNow; s.Persist(j); } } return Results.Ok(s.View(j)); });
app.MapGet("/api/builds/{id}/artifacts/{artifact}", (string id, string artifact, BuildStore s) => { if (!s.Jobs.TryGetValue(id, out var j) || j.Status != "succeeded" || artifact != "watchface.prg") return Results.NotFound(); var path = s.ArtifactPath(j); return File.Exists(path) ? Results.File(path, "application/octet-stream", BuildStore.FileName(j)) : Results.NotFound(); });
app.MapFallback((HttpContext c) => c.Request.Path.StartsWithSegments("/api") ? Results.NotFound() : Results.File(Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html"), "text/html"));
app.Run();

record BuildRequest(string ProjectId, string AppId, string Target, int Revision, string? ProjectName = null, string? DeviceSize = null);
class BuildJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N"); public string ProjectId { get; set; } = ""; public string AppId { get; set; } = ""; public int Revision { get; set; }
    public string Status { get; set; } = "queued"; public DateTime Created { get; set; } = DateTime.UtcNow; public DateTime? Finished { get; set; }
    public int? ExitCode { get; set; }
    public string Target {get;set;} = "venu445mm";
    public string ProjectName {get;set;} = "WatchFace";
    public string? DeviceSize {get;set;}
    public List<string> Logs { get; set; } = [];
    [System.Text.Json.Serialization.JsonIgnore] public object Gate { get; } = new(); [System.Text.Json.Serialization.JsonIgnore] public CancellationTokenSource Cancel { get; } = new();
}
class BuildStore
{
    public static readonly string[] Targets = ["venu441mm","venu445mm","venu3","venu3s","fr57042mm","fr57047mm","fr970","fenix843mm","fenix847mm"];
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public string Root { get; } = Path.GetFullPath(Environment.GetEnvironmentVariable("GFC_DATA") ?? "data"); public string Sdk { get; } = Environment.GetEnvironmentVariable("GFC_SDK") ?? "/opt/connectiq"; public string Key { get; } = Environment.GetEnvironmentVariable("GFC_KEY") ?? "/run/secrets/developer_key";
    public BuildReadiness Readiness => new(Sdk, Key, Environment.GetEnvironmentVariable("GFC_DEVICES") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".Garmin", "ConnectIQ", "Devices"), Environment.GetEnvironmentVariable("GFC_JAVA") ?? "java");
    public bool Ready => Targets.Any(t => Readiness.ForTarget(t).Ready); public ConcurrentDictionary<string, BuildJob> Jobs { get; } = new(); public Channel<BuildJob> Queue { get; } = Channel.CreateBounded<BuildJob>(8);
    public BuildStore() { Directory.CreateDirectory(Root); foreach (var path in Directory.EnumerateFiles(Root, "job.json", SearchOption.AllDirectories)) { var j = JsonSerializer.Deserialize<BuildJob>(File.ReadAllText(path), Json); if (j is null) continue; if (j.Status is "queued" or "running") { j.Status = "interrupted"; j.Logs.Add("服务重启，任务中断，请重新提交。"); } Jobs[j.Id] = j; Persist(j); } }
    public BuildJob Create(BuildRequest r) => new() { ProjectId = r.ProjectId, AppId = r.AppId, Revision = r.Revision, Target = r.Target, ProjectName = r.ProjectName ?? "WatchFace", DeviceSize = r.DeviceSize }; public string Work(string id) => Path.Combine(Root, id, "project");
    public bool Enqueue(BuildJob j) { Jobs[j.Id] = j; Persist(j); if (Queue.Writer.TryWrite(j)) return true; Jobs.TryRemove(j.Id, out _); return false; }
    public void Persist(BuildJob j) { lock (j.Gate) { var dir = Path.Combine(Root, j.Id); Directory.CreateDirectory(dir); var tmp = Path.Combine(dir, "job.tmp"); File.WriteAllText(tmp, JsonSerializer.Serialize(j, Json)); File.Move(tmp, Path.Combine(dir, "job.json"), true); } }
    public void Log(BuildJob j, string line) { lock (j.Gate) { if (j.Logs.Count < 6000) j.Logs.Add(line.Length > 4000 ? line[..4000] : line); } }
    public object View(BuildJob j) { lock (j.Gate) return new { buildId = j.Id, j.ProjectId, j.AppId, j.Revision, j.Target, j.Status, j.Created, j.Finished, j.ExitCode, artifacts = j.Status == "succeeded" ? new[] { new { id = "watchface.prg", fileName = FileName(j), url = $"/api/builds/{j.Id}/artifacts/watchface.prg" } } : Array.Empty<object>() }; }
    public static string Within(string root, string relative) { var path = Path.GetFullPath(Path.Combine(root, relative)); if (!path.StartsWith(Path.GetFullPath(root) + Path.DirectorySeparatorChar, StringComparison.Ordinal)) throw new ArgumentException("Path escapes project"); return path; }
    public static string FileName(BuildJob j) {
        var (model, sizes) = j.Target switch {
            "venu441mm" => ("Venu 4", new[]{"41mm"}), "venu445mm" => ("Venu 4", new[]{"45mm"}),
            "venu3" => ("Venu 3", new[]{"45mm"}), "venu3s" => ("Venu 3S", new[]{"41mm"}),
            "fr57042mm" => ("Forerunner 570", new[]{"42mm"}), "fr57047mm" => ("Forerunner 570", new[]{"47mm"}),
            "fr970" => ("Forerunner 970", new[]{"47mm"}), "fenix843mm" => ("fēnix 8 AMOLED", new[]{"43mm"}),
            "fenix847mm" => ("fēnix 8 AMOLED", new[]{"47mm","51mm"}), _ => throw new ArgumentException("Invalid device")
        };
        var size = string.IsNullOrEmpty(j.DeviceSize) ? sizes[0] : j.DeviceSize;
        if (!sizes.Contains(size)) throw new ArgumentException("Device size does not match target");
        var name = Regex.Replace(j.ProjectName ?? "WatchFace", @"[<>:""/\\|?*\p{Cc}]", "_").Trim().TrimEnd('.',' ');
        name = string.Concat(name.EnumerateRunes().Take(80).Select(r=>r.ToString()));
        if (string.IsNullOrWhiteSpace(name)) name = "WatchFace";
        return Regex.Replace($"{model}_{size}_{name}.prg", @"\s+", "");
    }
    public string ArtifactPath(BuildJob j) {
        var named = Path.Combine(Root,j.Id,"output",FileName(j));
        return File.Exists(named) ? named : Path.Combine(Root,j.Id,"output","watchface.prg");
    }
    public static XDocument ReadXml(string file) { using var reader = XmlReader.Create(file, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 4 * 1024 * 1024 }); return XDocument.Load(reader); }
}
class BuildWorker(BuildStore store, ILogger<BuildWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in store.Queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (job.Cancel.IsCancellationRequested) continue; using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3)); using var linked = CancellationTokenSource.CreateLinkedTokenSource(timeout.Token, stoppingToken, job.Cancel.Token); try
            {
                lock (job.Gate) { if (job.Cancel.IsCancellationRequested) continue; job.Status = "running"; store.Persist(job); }
                var output = Path.Combine(store.Root, job.Id, "output"); Directory.CreateDirectory(output); var psi = new ProcessStartInfo(Environment.GetEnvironmentVariable("GFC_JAVA") ?? "java") { WorkingDirectory = store.Work(job.Id), UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true }; foreach (var a in new[] { "-Xmx512m", "-Dfile.encoding=UTF-8", "-jar", Path.Combine(store.Sdk, "bin", "monkeybrains.jar"), "-f", "monkey.jungle", "-d", job.Target, "-o", Path.Combine(output, "watchface.prg"), "-y", store.Key, "-r", "-w" }) psi.ArgumentList.Add(a);
                store.Log(job, "SDK 编译开始：" + job.Target); using var proc = Process.Start(psi) ?? throw new InvalidOperationException("Could not start compiler"); using var cancel = linked.Token.Register(() => { try { if (!proc.HasExited) proc.Kill(true); } catch (InvalidOperationException) { } }); async Task Drain(StreamReader r) { while (await r.ReadLineAsync() is { } line) store.Log(job, line); }
                await Task.WhenAll(Drain(proc.StandardOutput), Drain(proc.StandardError), proc.WaitForExitAsync()); job.ExitCode = proc.ExitCode;
                lock (job.Gate) { job.Status = job.Cancel.IsCancellationRequested ? "cancelled" : timeout.IsCancellationRequested ? "failed" : proc.ExitCode == 0 && File.Exists(Path.Combine(output, "watchface.prg")) ? "succeeded" : "failed"; if (job.Status == "succeeded") File.Move(Path.Combine(output,"watchface.prg"),Path.Combine(output,BuildStore.FileName(job)),true); if (timeout.IsCancellationRequested) store.Log(job, "编译超时，进程已结束。"); }
            }
            catch (Exception e) { logger.LogWarning("Build {Id} failed: {Message}", job.Id, e.Message); lock (job.Gate) { job.Status = job.Cancel.IsCancellationRequested ? "cancelled" : "failed"; store.Log(job, "编译失败：" + e.Message); } }
            finally { job.Finished = DateTime.UtcNow; store.Persist(job); }
        }
    }
}