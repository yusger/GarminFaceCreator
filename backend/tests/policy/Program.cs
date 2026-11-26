using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;
var root=Path.Combine(Path.GetTempPath(),"gfc-policy-"+Guid.NewGuid().ToString("N"));
Environment.SetEnvironmentVariable("GFC_DATA",root);
var config = new ConfigurationBuilder().AddJsonFile(Path.GetFullPath("backend/appsettings.json"))
    .AddInMemoryCollection(new Dictionary<string,string?> {
        ["BuildLimits:BuildsPerDayPerIp"]="2", ["BuildLimits:BuildsPerDayGlobal"]="3",
        ["BuildLimits:SubmissionsPerMinutePerIp"]="2", ["BuildLimits:StorageMb"]="64", ["BuildLimits:MinimumFreeMb"]="32"
    }).Build();
var services = new ServiceCollection(); services.AddBuildOptions(config);
using var provider = services.BuildServiceProvider();
var limits = provider.GetRequiredService<IOptions<BuildLimitsOptions>>();
void Check(bool value,string message){if(!value)throw new Exception(message);}
var store=new BuildStore();var p=new PublicBuildPolicy(limits);
Check(p.Enter("ip1",store)==null,"first admission");
Check(p.Enter("ip1",store)==null,"second admission");
Check(p.Enter("ip2",store)!=null,"global upload concurrency");
p.Leave("ip1");p.Leave("ip1");
Check(p.Enter("ip1",store)!=null,"minute limit");
Check(p.Charge("ip1") && p.Charge("ip1") && !p.Charge("ip1"),"IP daily quota");
p=new PublicBuildPolicy(limits);
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
// Configuration contract: JSON defaults, environment-specific JSON, then environment override.
IOptions<BuildLimitsOptions> Resolve(IConfiguration config, out ServiceProvider scope)
{
    var registered = new ServiceCollection(); registered.AddBuildOptions(config);
    scope = registered.BuildServiceProvider();
    return scope.GetRequiredService<IOptions<BuildLimitsOptions>>();
}
var jsonPath = Path.GetFullPath("backend/appsettings.json");
using (var defaults = (ConfigurationRoot)new ConfigurationBuilder().AddJsonFile(jsonPath).Build())
{
    var values = Resolve(defaults, out var scope); using (scope)
        Check(values.Value.BuildsPerDayPerIp == 30 && values.Value.ApiRequestsPerMinutePerIp == 240, "JSON defaults");
}
var production = Path.Combine(root, "appsettings.Production.json");
File.WriteAllText(production, "{\"BuildLimits\":{\"BuildsPerDayPerIp\":22}}");
Environment.SetEnvironmentVariable("GFC_CONFIG_TEST_BuildLimits__BuildsPerDayPerIp", "9");
using (var layered = (ConfigurationRoot)new ConfigurationBuilder().AddJsonFile(jsonPath).AddJsonFile(production).AddEnvironmentVariables("GFC_CONFIG_TEST_").Build())
{
    var values = Resolve(layered, out var scope); using (scope) Check(values.Value.BuildsPerDayPerIp == 9, "environment must override production JSON");
}
Environment.SetEnvironmentVariable("GFC_CONFIG_TEST_BuildLimits__BuildsPerDayPerIp", null);
using (var layered = (ConfigurationRoot)new ConfigurationBuilder().AddJsonFile(jsonPath).AddJsonFile(production).Build())
{
    var values = Resolve(layered, out var scope); using (scope) Check(values.Value.BuildsPerDayPerIp == 22, "production JSON override");
}
using (var bad = (ConfigurationRoot)new ConfigurationBuilder().AddJsonFile(jsonPath).AddInMemoryCollection(new Dictionary<string,string?> { ["BuildLimits:BuildsPerDayPerIp"]="0" }).Build())
{
    var values = Resolve(bad, out var scope); using (scope)
    {
        bool rejected=false;
        try { _ = values.Value; } catch (OptionsValidationException) { rejected=true; }
        Check(rejected, "unsafe configuration silently accepted");
    }
}
Console.WriteLine("PASS appsettings defaults, production JSON precedence, standard environment override and invalid-value rejection");
class BuildJob{public string Status{get;set;}="queued";public string CallerIpKey{get;set;}="";public string AccessTokenHash{get;set;}="";}
class BuildStore{public ConcurrentDictionary<string,BuildJob> Jobs{get;}=new();}
