using System.ComponentModel.DataAnnotations;
sealed class WorkerOptions
{
    public bool EnforceQuotas { get; set; } = true;
    public string SocketPath { get; set; } = "/run/gfc-simulator/worker.sock";
    public string WorkRoot { get; set; } = "/var/lib/gfc-simulator";
    public string SdkRoot { get; set; } = "/opt/gfc/sdk";
    public string DevicesRoot { get; set; } = "/opt/gfc/Devices";
    public string FontsRoot { get; set; } = "/opt/gfc/Fonts";
    public string Image { get; set; } = "garminfacecreator-simulator-probe:plan-frame37";
    [Range(60, 180)] public int TimeoutSeconds { get; set; } = 120;
    [Range(1, 1000)] public int RunsPerDay { get; set; } = 50;
}
