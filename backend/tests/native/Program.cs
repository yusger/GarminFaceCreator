using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;
static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
static int? Status(IResult result)=>(result as IStatusCodeHttpResult)?.StatusCode;
var root=Path.Combine(Path.GetTempPath(),"gfc-native-policy-"+Guid.NewGuid().ToString("N"));Environment.SetEnvironmentVariable("GFC_DATA",root);Environment.SetEnvironmentVariable("GFC_LOGS",Path.Combine(root,"audit"));Environment.SetEnvironmentVariable("GFC_GEOIP",Path.Combine(root,"no-geoip"));
using var audit=new BuildAuditLog(NullLogger<BuildAuditLog>.Instance,Options.Create(new AuditLogOptions{FileMb=1,TotalMb=2,RetentionDays=1}));var builds=new BuildStore(audit);var policy=new PublicBuildPolicy(Options.Create(new BuildLimitsOptions{SubmissionsPerMinutePerIp=6,BuildsPerDayPerIp=30,BuildsPerDayGlobal=200,ApiRequestsPerMinutePerIp=240,UploadTimeoutSeconds=45,StorageMb=256,MinimumFreeMb=32,JobMb=32}));
var settings=new NativeOptions{Enabled=true,QueueCapacity=2,RunsPerDayPerIp=2,RunsPerDayGlobal=2,RetentionHours=1};
NativeStore Store(NativeOptions o)=>new(builds,Options.Create(o),policy,NullLogger<NativeStore>.Instance);
BuildJob Fake(bool marker=true){var b=builds.Create(new(Guid.NewGuid().ToString(),Guid.NewGuid().ToString("N"),"venu445mm",0,"Synthetic native policy"));b.Status="succeeded";b.Finished=DateTime.UtcNow.AddDays(-10);builds.Jobs[b.Id]=b;var source=Path.Combine(builds.Work(b.Id),"source");Directory.CreateDirectory(source);File.WriteAllText(Path.Combine(source,"App.mc"),"// GarminFaceCreator local generator basic-37-native-frame-marker;\n"+(marker?"GFC_RENDER_READY target=venu445mm":"old"));var output=Path.Combine(root,b.Id,"output");Directory.CreateDirectory(output);File.WriteAllBytes(Path.Combine(output,"watchface.prg"),[1,2,3]);builds.Persist(b);return b;}
var context=new DefaultHttpContext();context.Connection.RemoteIpAddress=IPAddress.Parse("10.2.3.4");
var disabled=Store(new NativeOptions());Check(Status(disabled.Submit(Fake(),context))==503,"disabled verification must fail closed");
var store=Store(settings);Check(Status(store.Submit(Fake(false),context))==422,"old source must require regeneration");
var first=Fake();var second=Fake();Check(Status(store.Submit(first,context))==202&&Status(store.Submit(second,context))==202,"two pending admissions");Check(first.Downloads==1&&second.Downloads==1,"retention leases missing");Check(Status(store.Submit(first,context))==200,"duplicate submission is not idempotent");Check(Status(store.Submit(Fake(),context))==429,"queue bound ignored");
builds.Cleanup(DateTime.UtcNow);Check(Directory.Exists(builds.Work(first.Id)),"pending native lease did not protect source/artifact retention");
store.CancelJob(first.Id);store.CancelJob(second.Id);for(int i=0;i<2;i++)await store.Execute(await store.Queue.Reader.ReadAsync(),CancellationToken.None);Check(first.Downloads==0&&second.Downloads==0,"cancellation leaked artifact leases");Check(store.Jobs[first.Id].Status=="cancelled"&&first.Status=="succeeded","native cancellation changed build result");
var quota=File.ReadAllText(Path.Combine(root,"native-quota.json"));Check(!quota.Contains("10.2.3.4"),"raw IP leaked to native quota ledger");var resumed=Store(settings);Check(Status(resumed.Submit(Fake(),context))==429,"native quota reset on service restart");
store.Cleanup(DateTime.UtcNow.AddHours(2));Check(store.Jobs[first.Id].Expired,"native retention did not expire independent artifacts");
var file=Path.Combine(root,first.Id,"native","verification.json");var corrupted=JsonSerializer.Serialize(store.Jobs[first.Id],BuildStore.Json).Replace("cancelled","forged_state");File.WriteAllText(file,corrupted);var closed=Store(settings);Check(closed.Jobs[first.Id].Error=="invalid_verification_record"&&closed.Jobs[first.Id].Attempt==settings.AttemptsPerBuild,"invalid record allowed retry bypass");
Console.WriteLine("PASS disabled/old-source guards, bounded/idempotent queue, retention leases, cancellation separation, persistent hashed quotas and corrupt-state rejection; no service or SDK launched");
