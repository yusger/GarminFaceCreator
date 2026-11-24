record EnvironmentReadiness(bool Ready, string[] Reasons);
record TargetReadiness(string Target, bool Ready, string[] Reasons);
class BuildReadiness(string sdk, string key, string devices, string java)
{
    public EnvironmentReadiness Common()
    {
        var reasons = new List<string>();
        if (!File.Exists(Path.Combine(sdk, "bin", "monkeybrains.jar"))) reasons.Add("缺少 Connect IQ 编译器");
        if (!File.Exists(Path.Combine(sdk, "bin", "default.jungle"))) reasons.Add("SDK 尚未初始化 default.jungle");
        if (!File.Exists(key)) reasons.Add("缺少签名密钥");
        var executable = Path.IsPathRooted(java) || java.Contains(Path.DirectorySeparatorChar)
            ? File.Exists(java)
            : (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator).Any(dir => File.Exists(Path.Combine(dir, java)) || (OperatingSystem.IsWindows() && File.Exists(Path.Combine(dir, java + ".exe"))));
        if (!executable) reasons.Add("缺少 Java 运行环境");
        return new(reasons.Count == 0, reasons.ToArray());
    }
    public TargetReadiness ForTarget(string target)
    {
        var reasons = Common().Reasons.ToList();
        if (!File.Exists(Path.Combine(devices, target, "compiler.json"))) reasons.Add($"缺少设备包 {target}");
        return new(target, reasons.Count == 0, reasons.ToArray());
    }
}
