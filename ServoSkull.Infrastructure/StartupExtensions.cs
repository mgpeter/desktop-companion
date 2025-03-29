using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;
using ServoSkull.Core.Abstractions.Clients;
using ServoSkull.Core.Abstractions.Services;
using ServoSkull.Core.Configuration;
using ServoSkull.Infrastructure.OpenAi;
using ServoSkull.Infrastructure.Services;

namespace ServoSkull.Infrastructure;

public static class StartupExtensions
{
    public static IServiceCollection AddOpenAIServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Add configuration
        services.Configure<OpenAIOptions>(configuration.GetSection("OpenAI"));

        services.AddScoped<IOpenAIClient, OpenAIClient>();
        services.AddSingleton<ISessionManager, SessionManager>();
        services.AddScoped<IAIService, OpenAIService>();

        return services;
    }
}