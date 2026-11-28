static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
Sandbox.ValidateIdentity("venu445mm",new string('a',64),new string('b',32));
foreach(var target in new[]{"venu445mm;id","../venu445mm","fenix843mm",""}){try{Sandbox.ValidateIdentity(target,new string('a',64),new string('b',32));throw new Exception("Unexpected target accepted");}catch(ArgumentException){}}
foreach(var hash in new[]{new string('a',63),new string('A',64),"--privileged"}){try{Sandbox.ValidateIdentity("venu445mm",hash,new string('b',32));throw new Exception("Unexpected digest accepted");}catch(ArgumentException){}}
var containerArgs=Sandbox.Arguments(new WorkerOptions(),"gfc-native-test","/safe/input","venu445mm");
Check(containerArgs.Contains("--read-only")&&containerArgs.Contains("none")&&containerArgs.Contains("no-new-privileges"),"Sandbox flags missing");
Check(containerArgs.Count(a=>a=="--mount")==4&&containerArgs.Count(a=>a=="--tmpfs")==3,"Unexpected mount scope");
Check(!containerArgs.Any(a=>a.Contains("docker.sock")||a.Contains("developer_key")||a.Contains("/output,readonly")),"Host credentials or output directory exposed");
Check(containerArgs.Contains("/output:rw,size=16m,uid=10001,gid=10001"),"Output must be bounded tmpfs");
Check(containerArgs.Contains("PROBE_READY_MARKER=GFC_RENDER_READY")&&containerArgs.Contains("PROBE_HOLD_SECONDS=20"),"Readiness protocol missing");
Check(Sandbox.SampleMemory("159.5MiB / 768MiB")==167247872,"Sample conversion wrong");
Check(Sandbox.SampleMemory("unknown")==null,"Unknown memory cannot become zero");
Console.WriteLine("PASS: identity validation, fixed container mounts/limits, bounded tmpfs, readiness and memory units");

var heapDump="Error: Out Of Memory\n"+new string('x',30000)+"last heap handle";var excerpt=Sandbox.FailureLog(heapDump);Check(excerpt.StartsWith("Error: Out Of Memory\n")&&excerpt.Length==16000&&!excerpt.Contains("last heap handle"),"Failure evidence must preserve the first exception under a long heap dump");Check(Sandbox.FailureLog("short error")=="short error","Short failure logs must remain unchanged");Console.WriteLine("PASS: first-error preservation and bounded failure log");
