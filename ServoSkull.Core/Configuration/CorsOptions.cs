using System.ComponentModel.DataAnnotations;

namespace ServoSkull.Core.Configuration;

public class CorsOptions
{
    [Required]
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
} 