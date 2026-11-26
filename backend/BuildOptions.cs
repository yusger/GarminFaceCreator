using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

sealed class BuildLimitsOptions
{
    [Range(1, 600)] public int SubmissionsPerMinutePerIp { get; set; }
    [Range(1, 10000)] public int BuildsPerDayPerIp { get; set; }
    [Range(1, 100000)] public int BuildsPerDayGlobal { get; set; }
    [Range(60, 10000)] public int ApiRequestsPerMinutePerIp { get; set; }
    [Range(1, 300)] public int UploadTimeoutSeconds { get; set; }
    [Range(64, 1048576)] public int StorageMb { get; set; }
    [Range(32, 1048576)] public int MinimumFreeMb { get; set; }
    [Range(32, 512)] public int JobMb { get; set; }
}
sealed class AuditLogOptions
{
    [Range(1, 100)] public int FileMb { get; set; }
    [Range(2, 10240)] public int TotalMb { get; set; }
    [Range(1, 365)] public int RetentionDays { get; set; }
}
static class BuildConfiguration
{
    public static void AddBuildOptions(this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<BuildLimitsOptions>()
            .Bind(config.GetRequiredSection("BuildLimits"), options => options.ErrorOnUnknownConfiguration = true)
            .ValidateDataAnnotations().ValidateOnStart();
        services.AddOptions<AuditLogOptions>()
            .Bind(config.GetRequiredSection("AuditLog"), options => options.ErrorOnUnknownConfiguration = true)
            .ValidateDataAnnotations().Validate(options => options.TotalMb >= options.FileMb, "AuditLog:TotalMb must be >= FileMb").ValidateOnStart();
    }
}
