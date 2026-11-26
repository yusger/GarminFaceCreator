using System.Collections.Concurrent;
var root=Path.Combine(Path.GetTempPath(),"gfc-policy-"+Guid.NewGuid().ToString("N"));
Environment.SetEnvironmentVariable("GFC_DATA",root);
Environment.SetEnvironmentVariable("GFC_BUILD_PER_DAY","2");
Environment.SetEnvironmentVariable("GFC_GLOBAL_BUILD_PER_DAY","3");
Environment.SetEnvironmentVariable("GFC_BUILD_PER_MINUTE","2");
Environment.SetEnvironmentVariable("GFC_STORAGE_MB","64");
Environment.SetEnvironmentVariable("GFC_MIN_FREE_MB","32");
void Check(bool value,string message){if(!value)throw new Exception(message);}
var store=new BuildStore();var p=new PublicBuildPolicy();
Check(p.Enter("ip1",store)==null,"first admission");
Check(p.Enter("ip1",store)==null,"second admission");
Check(p.Enter("ip2",store)!=null,"global upload concurrency");
p.Leave("ip1");p.Leave("ip1");
Check(p.Enter("ip1",store)!=null,"minute limit");
Check(p.Charge("ip1") && p.Charge("ip1") && !p.Charge("ip1"),"IP daily quota");
p=new PublicBuildPolicy();
Check(!p.Charge("ip1"),"quota reset by process restart");
Check(p.Charge("ip2") && !p.Charge("ip3"),"global daily quota");
Check(p.Enter("ip3",store)!=null,"daily quota admission");
Check(p.HasSpace(root,0),"space check unexpected failure");
using(var f=File.Create(Path.Combine(root,"oversize")))f.SetLength(65L*1024*1024);
Check(!p.HasSpace(root,0),"storage cap ignored");
var token=new string('A',64);var job=new BuildJob{AccessTokenHash=PublicBuildPolicy.Hash(token)};
var ctx=new DefaultHttpContext();ctx.Request.Headers.Authorization="Bearer "+token;
Check(PublicBuildPolicy.Authorize(job,ctx),"valid token rejected");
ctx.Request.Headers.Authorization="Bearer "+new string('B',64);
Check(!PublicBuildPolicy.Authorize(job,ctx),"wrong token accepted");
Check(!PublicBuildPolicy.Authorize(new BuildJob(),ctx),"legacy job accessible");
Console.WriteLine("PASS upload concurrency, minute/IP/global quotas, persistent counters, storage cap and task hash authorization");
class BuildJob{public string Status{get;set;}="queued";public string CallerIpKey{get;set;}="";public string AccessTokenHash{get;set;}="";}
class BuildStore{public ConcurrentDictionary<string,BuildJob> Jobs{get;}=new();}
