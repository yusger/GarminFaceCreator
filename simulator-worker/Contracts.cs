namespace Gfc.NativeSim;

public sealed record NativeVerification(bool Success, string Target, string PrgSha256, int Width, int Height, string? PngBase64, string Logs, string FrameReport, string ApplicationMode, string SdkVersion, string Error, long? MaxSampledMemoryBytes, int Samples)
{
    public string CleanupStatus { get; set; } = "pending";
    public DateTime CapturedAtUtc { get; init; } = DateTime.UtcNow;
    public string DataMode { get; init; } = "simulator-defaults-dynamic";
    public string SleepTransition { get; init; } = "unverified";
    public string Hardware { get; init; } = "unverified";
    public string MemoryMeasurement { get; init; } = "docker stats sample; not exact peak or watchface memory";
    public int MemoryLimitMiB { get; init; } = 768;
    public int CpuLimit { get; init; } = 1;
    public int PidLimit { get; init; } = 128;
}
