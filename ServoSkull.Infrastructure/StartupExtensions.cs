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

        // Add HTTP client with retry and circuit breaker policies
        services.AddHttpClient<IOpenAIClient, OpenAIClient>()
            .AddPolicyHandler(GetRetryPolicy())
            .AddPolicyHandler(GetCircuitBreakerPolicy());

        // Add services
        services.AddSingleton<ISessionManager, SessionManager>();
        services.AddScoped<IAIService, OpenAIService>();

        return services;
    }

    private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(3, retryAttempt =>
                TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
    }

    private static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
    {
        return HttpPolicyExtensions
            .HandleTransientHttpError()
            .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
    }
}