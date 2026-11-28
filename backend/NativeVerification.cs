using System.Buffers.Binary;
using System.ComponentModel.DataAnnotations;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using Gfc.NativeSim;
using Microsoft.Extensions.Options;

sealed class NativeOptions
{
 public bool Enabled {get;set;}
 public string SocketPath {get;set;}="/run/gfc-simulator/worker.sock";
 [Range(1,4)] public int QueueCapacity {get;set;}=2;
 [Range(135,240)] public int TimeoutSeconds {get;set;}=155;
 [Range(1,3)] public int AttemptsPerBuild {get;set;}=2;
 [Range(1,1000)] public int RunsPerDayPerIp {get;set;}=10;
 [Range(1,10000)] public int RunsPerDayGlobal {get;set;}=30;
 [Range(1,168)] public int RetentionHours {get;set;}=24;
}
sealed class NativeJob
{
 public string BuildId {get;set;}="";public string Status {get;set;}="queued";public int Attempt {get;set;}=1;
 public DateTime Created {get;set;}=DateTime.UtcNow;public DateTime? Finished {get;set;}
 public string Target {get;set;}="";public int Revision {get;set;}public string ProjectId {get;set;}="";
 public string PrgSha256 {get;set;}="";public string SourceSha256 {get;set;}="";public string GeneratorVersion {get;set;}="";
 public string SourceHashMode {get;set;}="primary-source-v1";
 public string Error {get;set;}="";public NativeVerification? Report {get;set;}public bool Expired {get;set;}
 [System.Text.Json.Serialization.JsonIgnore]public bool Active {get;set;}
 [System.Text.Json.Serialization.JsonIgnore]public CancellationTokenSource Cancel {get;}=new();
}
sealed record NativeWork(BuildJob Build,NativeJob Verification);
sealed class NativeStore
{
 public readonly object Gate=new();public readonly BuildStore Builds;public readonly NativeOptions Options;public readonly Channel<NativeWork> Queue;
 public readonly Dictionary<string,NativeJob> Jobs=new();readonly PublicBuildPolicy policy;readonly ILogger<NativeStore> logger;readonly HttpClient client;
 sealed class Ledger{public string Day{get;set;}="";public int Used{get;set;}public Dictionary<string,int> Ips{get;set;}=new();}
 Ledger quota;string LedgerFile=>Path.Combine(Builds.Root,"native-quota.json");
 static string Today=>DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(8)).ToString("yyyyMMdd");
 public NativeStore(BuildStore builds,IOptions<NativeOptions> options,PublicBuildPolicy policy,ILogger<NativeStore> logger)
 {
  Builds=builds;Options=options.Value;this.policy=policy;this.logger=logger;Queue=Channel.CreateBounded<NativeWork>(Options.QueueCapacity);
  quota=File.Exists(LedgerFile)?JsonSerializer.Deserialize<Ledger>(File.ReadAllText(LedgerFile),BuildStore.Json)??throw new InvalidDataException("Invalid native quota ledger"):new();
  var handler=new SocketsHttpHandler{ConnectCallback=async(_,ct)=>{var socket=new Socket(AddressFamily.Unix,SocketType.Stream,ProtocolType.Unspecified);try{await socket.ConnectAsync(new UnixDomainSocketEndPoint(Options.SocketPath),ct);return new NetworkStream(socket,true);}catch{socket.Dispose();throw;}}};client=new HttpClient(handler){Timeout=Timeout.InfiniteTimeSpan};
  foreach(var b in builds.Jobs.Values){var file=Metadata(b.Id);if(!File.Exists(file))continue;try{var n=JsonSerializer.Deserialize<NativeJob>(File.ReadAllText(file),BuildStore.Json)??throw new InvalidDataException();if(n.BuildId!=b.Id||n.Target!=b.Target||n.Attempt is <1 or >3||!new[]{"queued","running","cancelling","succeeded","failed","cancelled","interrupted"}.Contains(n.Status)||!Regex.IsMatch(n.PrgSha256,"^[a-f0-9]{64}$")||!Regex.IsMatch(n.SourceSha256,"^[a-f0-9]{64}$"))throw new InvalidDataException();if(n.Report is not null)n.Report=n.Report with{PngBase64=null,Hardware="unverified",SleepTransition="unverified"};if(n.Status is "queued" or "running" or "cancelling"){n.Status="interrupted";n.Error="service_restarted";n.Finished=DateTime.UtcNow;Persist(n);}Jobs[b.Id]=n;}catch(Exception e)when(e is JsonException or InvalidDataException){Jobs[b.Id]=new(){BuildId=b.Id,Target=b.Target,Status="failed",Error="invalid_verification_record",Attempt=Options.AttemptsPerBuild,Finished=DateTime.UtcNow};}}
 }
 string Folder(string id)=>BuildStore.Within(Builds.Root,id+"/native");
 string Metadata(string id)=>Path.Combine(Folder(id),"verification.json");
 public string Picture(string id)=>Path.Combine(Folder(id),"screen.png");
 public void Persist(NativeJob n){var dir=Folder(n.BuildId);Directory.CreateDirectory(dir);var tmp=Path.Combine(dir,"verification.tmp");File.WriteAllText(tmp,JsonSerializer.Serialize(n,BuildStore.Json));File.Move(tmp,Metadata(n.BuildId),true);}
 public object View(NativeJob n)=>new{n.BuildId,n.Status,n.Attempt,n.Created,n.Finished,n.Target,n.Revision,n.ProjectId,n.PrgSha256,n.SourceSha256,n.SourceHashMode,n.GeneratorVersion,n.Error,n.Expired,report=n.Report,canRetry=Options.Enabled&&!n.Active&&!n.Expired&&(n.Status is "failed" or "cancelled" or "interrupted")&&n.Attempt<Options.AttemptsPerBuild,artifacts=n.Status=="succeeded"&&!n.Expired&&File.Exists(Picture(n.BuildId))?new[]{new{id="screen.png",url=$"/api/builds/{n.BuildId}/native-verification/artifacts/screen.png"},new{id="metadata.json",url=$"/api/builds/{n.BuildId}/native-verification/artifacts/metadata.json"}}:Array.Empty<object>()};
 public object State(string id){lock(Gate)return Jobs.TryGetValue(id,out var n)?View(n):new{buildId=id,status=Options.Enabled?"not_requested":"disabled",canRetry=false};}
 public async Task<object> Readiness(CancellationToken ct)
 {
  if(!Options.Enabled)return new{enabled=false,ready=false,targets=new[]{"venu445mm","venu441mm"}};
  using var deadline=CancellationTokenSource.CreateLinkedTokenSource(ct);deadline.CancelAfter(TimeSpan.FromSeconds(2));try{using var r=await client.GetAsync("http://native-worker/health",deadline.Token);var value=await r.Content.ReadFromJsonAsync<JsonElement>(deadline.Token);return new{enabled=true,ready=r.IsSuccessStatusCode&&value.TryGetProperty("status",out var s)&&s.GetString()=="ok",targets=new[]{"venu445mm","venu441mm"}};}catch(Exception e)when(e is HttpRequestException or OperationCanceledException or JsonException){return new{enabled=true,ready=false,targets=new[]{"venu445mm","venu441mm"}};}
 }
 public IResult Submit(BuildJob b,HttpContext context)
 {
  lock(Gate)
  {
   if(!Options.Enabled)return Results.Problem("原生验证未启用",statusCode:503);
   if(Jobs.TryGetValue(b.Id,out var old)&&(old.Active||old.Status is "queued" or "running" or "cancelling" or "succeeded"||old.Attempt>=Options.AttemptsPerBuild||old.Expired))return Results.Ok(View(old));
   if(b.Status!="succeeded")return Results.Conflict(new{error="请先成功编译工程"});
   if(!new[]{"venu445mm","venu441mm"}.Contains(b.Target))return Results.UnprocessableEntity(new{error="首批原生验证只支持Venu4两尺寸"});
   var projectRoot=Builds.Work(b.Id);var local=Path.Combine(projectRoot,"source","App.mc");var managed=Path.Combine(projectRoot,"source","GfcFrameReporter.mc");var prg=Builds.ArtifactPath(b);
   if(b.ProjectExpired||b.ArtifactExpired||!File.Exists(prg))return Results.Json(new{error="工程或PRG已过期，请重新编译"},statusCode:410);
   if(new FileInfo(prg).Length is <=0 or >4*1024*1024)return Results.UnprocessableEntity(new{error="工程超出原生验证预算"});
   var sourceFiles=Directory.Exists(Path.Combine(projectRoot,"source"))?Directory.GetFiles(Path.Combine(projectRoot,"source"),"*.mc",SearchOption.AllDirectories).OrderBy(p=>Path.GetRelativePath(projectRoot,p),StringComparer.Ordinal).ToArray():Array.Empty<string>();
   if(sourceFiles.Length==0||sourceFiles.Length>100||sourceFiles.Sum(p=>new FileInfo(p).Length)>2*1024*1024)return Results.UnprocessableEntity(new{error="工程缺少受支持源码或超过原生验证预算"});
   var code=File.Exists(local)?File.ReadAllText(local):"";var generator=Regex.Match(code,@"^// GarminFaceCreator local generator (basic-[a-z0-9-]+);");
   if(!generator.Success && File.Exists(managed)){
    code=File.ReadAllText(managed);generator=Regex.Match(code,@"^// GarminFaceCreator managed AI frame reporter (ai-frame-[a-z0-9-]+);");
    var manifest=Path.Combine(projectRoot,"manifest.xml");
    if(!File.Exists(manifest)||!Regex.IsMatch(File.ReadAllText(manifest),"\\bentry=[\"']GfcReportedApp[\"']"))return Results.UnprocessableEntity(new{error="AI首帧报告与应用入口不一致，请重新生成"});
   }
   if(!generator.Success||!code.Contains("GFC_RENDER_READY target="+b.Target,StringComparison.Ordinal))return Results.UnprocessableEntity(new{error="请重新生成并编译；当前工程没有受支持的首帧报告"});
   using var sourceHash=IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
   foreach(var file in sourceFiles){var name=System.Text.Encoding.UTF8.GetBytes(Path.GetRelativePath(projectRoot,file).Replace('\\','/'));var bytes=File.ReadAllBytes(file);sourceHash.AppendData(name);sourceHash.AppendData(new byte[]{0});sourceHash.AppendData(SHA256.HashData(bytes));}
   var sourceSha256=Convert.ToHexStringLower(sourceHash.GetHashAndReset());
   if(Jobs.Values.Count(n=>n.Status is "queued" or "running" or "cancelling")>=Options.QueueCapacity)return Results.Json(new{error="原生验证队列已满"},statusCode:429);
   if(!policy.HasSpace(Builds.Root,1))return Results.Json(new{error="验证存储空间不足"},statusCode:507);
   if(quota.Day!=Today)quota=new(){Day=Today};var ip=PublicBuildPolicy.Hash(PublicBuildPolicy.Ip(context));if(quota.Used>=Options.RunsPerDayGlobal||quota.Ips.GetValueOrDefault(ip)>=Options.RunsPerDayPerIp){context.Response.Headers.RetryAfter=PublicBuildPolicy.DailyRetry;return Results.Json(new{error="今日原生验证配额已用完"},statusCode:429);}
   var n=new NativeJob{BuildId=b.Id,Target=b.Target,Revision=b.Revision,ProjectId=b.ProjectId,Attempt=old?.Attempt+1??1,SourceSha256=sourceSha256,SourceHashMode="ordered-mc-v1",GeneratorVersion=generator.Groups[1].Value};
   lock(b.Gate){if(b.ArtifactExpired||!File.Exists(prg))return Results.Json(new{error="PRG已过期"},statusCode:410);using var input=File.OpenRead(prg);n.PrgSha256=Convert.ToHexStringLower(SHA256.HashData(input));b.Downloads++;}
   try
   {
    if(!Queue.Writer.TryWrite(new(b,n))){lock(b.Gate)b.Downloads--;return Results.Json(new{error="原生验证队列已满"},statusCode:429);}
    quota.Used++;quota.Ips[ip]=quota.Ips.GetValueOrDefault(ip)+1;File.WriteAllText(LedgerFile+".tmp",JsonSerializer.Serialize(quota,BuildStore.Json));File.Move(LedgerFile+".tmp",LedgerFile,true);Jobs[b.Id]=n;Persist(n);Builds.Log(b,"原生验证排队："+b.Target);return Results.Accepted($"/api/builds/{b.Id}/native-verification",View(n));
   }
   catch{n.Cancel.Cancel();n.Status="failed";n.Error="verification_storage_failed";throw;}
  }
 }
 public object CancelJob(string id){lock(Gate){if(Jobs.TryGetValue(id,out var n)&&n.Status is "queued" or "running"){n.Cancel.Cancel();n.Status="cancelling";Persist(n);}return State(id);}}
 public async Task Execute(NativeWork work,CancellationToken stopping)
 {
  var b=work.Build;var n=work.Verification;using var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(Options.TimeoutSeconds));using var linked=CancellationTokenSource.CreateLinkedTokenSource(stopping,timeout.Token,n.Cancel.Token);var ct=linked.Token;
  try
  {
   lock(Gate){ct.ThrowIfCancellationRequested();n.Active=true;n.Status="running";Persist(n);}
   await using var input=File.OpenRead(Builds.ArtifactPath(b));if(input.Length>4*1024*1024)throw new InvalidDataException("PRG size changed");var digest=Convert.ToHexStringLower(await SHA256.HashDataAsync(input,ct));if(digest!=n.PrgSha256)throw new InvalidDataException("PRG changed");input.Position=0;
   using var request=new HttpRequestMessage(HttpMethod.Post,"http://native-worker/verify");request.Headers.Add("X-Gfc-Target",n.Target);request.Headers.Add("X-Gfc-Prg-Sha256",n.PrgSha256);request.Headers.Add("X-Gfc-Build-Id",b.Id);request.Content=new StreamContent(input);request.Content.Headers.ContentType=new("application/octet-stream");request.Content.Headers.ContentLength=input.Length;
   using var response=await client.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,ct);if(!response.IsSuccessStatusCode)throw new HttpRequestException("Native worker unavailable or limited");await using var stream=await response.Content.ReadAsStreamAsync(ct);using var body=new MemoryStream();var buffer=new byte[8192];int count;while((count=await stream.ReadAsync(buffer,ct))>0){if(body.Length+count>4*1024*1024)throw new InvalidDataException("Worker response exceeds budget");await body.WriteAsync(buffer.AsMemory(0,count),ct);}var report=JsonSerializer.Deserialize<NativeVerification>(body.ToArray(),BuildStore.Json)??throw new InvalidDataException("Invalid worker response");
   report=report with{Hardware="unverified",SleepTransition="unverified",DataMode="unverified"};
   if(report.Target!=n.Target||report.PrgSha256!=n.PrgSha256||report.CleanupStatus!="completed")throw new InvalidDataException("Native identity or cleanup mismatch");
   if(!report.Success){lock(Gate){n.Report=report with{PngBase64=null};n.Status="failed";n.Error=Regex.IsMatch(report.Error,"^[a-z_]{1,80}$")?report.Error:"native_failed";}return;}
   if(report.PngBase64 is null||report.PngBase64.Length>3*1024*1024||report.ApplicationMode is not("active" or "aod")||!report.FrameReport.StartsWith("GFC_RENDER_READY target="+n.Target+" mode=",StringComparison.Ordinal))throw new InvalidDataException("Missing native frame");
   var png=Convert.FromBase64String(report.PngBase64);var pixels=n.Target=="venu445mm"?454:390;if(png.Length<24||png.Length>2*1024*1024||!png.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10})||BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(16,4))!=pixels||BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(20,4))!=pixels||report.Width!=pixels||report.Height!=pixels)throw new InvalidDataException("Invalid native dimensions");
   ct.ThrowIfCancellationRequested();var tmp=Path.Combine(Folder(b.Id),"screen.tmp");await File.WriteAllBytesAsync(tmp,png,ct);lock(Gate){ct.ThrowIfCancellationRequested();File.Move(tmp,Picture(b.Id),true);n.Report=report with{PngBase64=null,Hardware="unverified",SleepTransition="unverified",DataMode="unverified"};n.Status="succeeded";}
  }
  catch(OperationCanceledException){lock(Gate){n.Status=stopping.IsCancellationRequested?"interrupted":n.Cancel.IsCancellationRequested?"cancelled":"failed";n.Error=n.Status=="failed"?"verification_timeout":n.Status;}}
  catch(Exception e){logger.LogWarning("Native verification {Id}: {Type}",b.Id,e.GetType().Name);lock(Gate){n.Status="failed";n.Error="worker_failed";}}
  finally
  {
   lock(Gate){n.Active=false;n.Finished=DateTime.UtcNow;try{if(n.Status!="succeeded"&&File.Exists(Picture(b.Id)))File.Delete(Picture(b.Id));Persist(n);Builds.Log(b,"原生验证结果："+n.Status+"，"+n.Error);}catch(Exception e){logger.LogWarning("Native metadata persistence {Id}: {Type}",b.Id,e.GetType().Name);}}
   lock(b.Gate)b.Downloads--;
  }
 }
 public IResult Artifact(string id,string file)
 {
  lock(Gate){if(!Jobs.TryGetValue(id,out var n)||n.Status!="succeeded"||n.Expired)return Results.NotFound();if(file=="metadata.json")return Results.Json(View(n));if(file=="screen.png"&&File.Exists(Picture(id)))return new NativePicture(this,n);return Results.NotFound();}
 }
 public void Cleanup(DateTime now)
 {
  lock(Gate)foreach(var n in Jobs.Values.ToArray()){if(!Builds.Jobs.ContainsKey(n.BuildId)){Jobs.Remove(n.BuildId);continue;}if(n.Active||n.Status is "queued" or "running" or "cancelling"||!n.Finished.HasValue||n.Expired||(now-n.Finished.Value).TotalHours<Options.RetentionHours)continue;if(File.Exists(Picture(n.BuildId)))File.Delete(Picture(n.BuildId));n.Expired=true;n.Report=null;Persist(n);}
 }
}
sealed class NativePicture(NativeStore store,NativeJob job):IResult
{
 public async Task ExecuteAsync(HttpContext context){FileStream? stream=null;lock(store.Gate){if(!job.Expired&&job.Status=="succeeded"&&File.Exists(store.Picture(job.BuildId)))stream=File.OpenRead(store.Picture(job.BuildId));}if(stream is null){context.Response.StatusCode=410;return;}await using(stream)await Results.Stream(stream,"image/png","native-screen.png").ExecuteAsync(context);}
}
sealed class NativeWorker(NativeStore store):BackgroundService
{
 protected override async Task ExecuteAsync(CancellationToken stopping){await foreach(var work in store.Queue.Reader.ReadAllAsync(stopping))await store.Execute(work,stopping);}
}
sealed class NativeRetention(NativeStore store,ILogger<NativeRetention> logger):BackgroundService
{
 protected override async Task ExecuteAsync(CancellationToken stopping){using var timer=new PeriodicTimer(TimeSpan.FromMinutes(5));do{try{store.Cleanup(DateTime.UtcNow);}catch(Exception e){logger.LogWarning("Native retention: {Type}",e.GetType().Name);}}while(await timer.WaitForNextTickAsync(stopping));}
}
static class NativeRoutes
{
 public static void MapNative(this WebApplication app)
 {
  app.MapGet("/api/builds/{id}/native-verification",(string id,NativeStore store)=>Results.Ok(store.State(id)));
  app.MapPost("/api/builds/{id}/native-verification",(string id,HttpContext context,BuildStore builds,NativeStore store)=>context.Request.ContentLength is >0||context.Request.Headers.ContainsKey("Transfer-Encoding")?Results.BadRequest(new{error="验证只运行已有PRG，不接受额外上传"}):builds.Jobs.TryGetValue(id,out var b)?store.Submit(b,context):Results.NotFound());
  app.MapPost("/api/builds/{id}/native-verification/cancel",(string id,NativeStore store)=>Results.Ok(store.CancelJob(id)));
  app.MapGet("/api/builds/{id}/native-verification/artifacts/{file}",(string id,string file,NativeStore store)=>store.Artifact(id,file));
 }
}
