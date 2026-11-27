using Microsoft.Extensions.Options;
using System.Runtime.InteropServices;

if (!OperatingSystem.IsLinux()) throw new PlatformNotSupportedException("The optional native worker requires Linux and local Unix IPC");
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOptions<WorkerOptions>().Bind(builder.Configuration.GetSection("NativeWorker"), o => o.ErrorOnUnknownConfiguration = true).ValidateDataAnnotations().ValidateOnStart();
var options = builder.Configuration.GetSection("NativeWorker").Get<WorkerOptions>() ?? new();
if (!Path.IsPathFullyQualified(options.SocketPath) || Path.GetFileName(options.SocketPath) != "worker.sock") throw new InvalidOperationException("Use an absolute worker.sock IPC path");
var socketDirectory = Path.GetDirectoryName(options.SocketPath)!; Directory.CreateDirectory(socketDirectory);
File.SetUnixFileMode(socketDirectory, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | UnixFileMode.GroupRead | UnixFileMode.GroupExecute);
if (Path.Exists(options.SocketPath)) { if (new FileInfo(options.SocketPath).LinkTarget is not null) throw new InvalidOperationException("Refusing linked IPC socket"); File.Delete(options.SocketPath); }
builder.WebHost.ConfigureKestrel(k => { k.Limits.MaxRequestBodySize = 4 * 1024 * 1024; k.ListenUnixSocket(options.SocketPath); }); builder.Services.AddSingleton<NativeRunner>();
var app = builder.Build();
app.MapGet("/health", (NativeRunner runner) => Results.Ok(new { status = runner.CleanupHealthy ? "ok" : "cleanup_failed", busy = runner.Busy, transport = "local-unix", targets = Sandbox.Targets }));
app.MapPost("/verify", async (HttpRequest request, NativeRunner runner, CancellationToken ct) =>
{
    if (request.ContentType != "application/octet-stream" || request.ContentLength is null or <= 0 or > 4 * 1024 * 1024) return Results.BadRequest(new { error = "Expected a bounded PRG body" });
    var target = request.Headers["X-Gfc-Target"].ToString(); var hash = request.Headers["X-Gfc-Prg-Sha256"].ToString(); var build = request.Headers["X-Gfc-Build-Id"].ToString();
    try { Sandbox.ValidateIdentity(target, hash, build); using var bytes = new MemoryStream(); await request.Body.CopyToAsync(bytes, ct); if (bytes.Length != request.ContentLength) return Results.BadRequest(new { error = "PRG length mismatch" }); var result = await runner.Run(target, hash, bytes.ToArray(), ct); return Results.Ok(result.CleanupStatus == "completed" ? result : result with { Success = false, PngBase64 = null, Error = "container_cleanup_failed" }); }
    catch (NativeBusyException) { return Results.Json(new { error = "Native worker busy or daily limit reached" }, statusCode: 429); }
    catch (ArgumentException) { return Results.BadRequest(new { error = "Invalid verification input" }); }
});
await app.Services.GetRequiredService<NativeRunner>().CleanupOrphans(CancellationToken.None);
await app.StartAsync();
File.SetUnixFileMode(options.SocketPath, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead | UnixFileMode.GroupWrite);
// The deployment service assigns the socket directory's group to the app UID/GID; no TCP listener or Docker socket is exposed to the app.
await app.WaitForShutdownAsync();
