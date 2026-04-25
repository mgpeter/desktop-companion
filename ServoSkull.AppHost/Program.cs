using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.ServoSkull_ApiService>("apiservice")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", builder.Environment.EnvironmentName);

// Configure ASP.NET Core Web project
var webApp = builder.AddProject<Projects.ServoSkull_Web>("webapp")
    .WithReference(apiService)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", builder.Environment.EnvironmentName);

if (builder.Environment.IsDevelopment())
{
    // Configure Angular frontend
    var angularApp = builder.AddNpmApp("angular", "../ServoSkull.Angular", "start:aspire")
        .WithReference(apiService)
        .WithHttpEndpoint(env: "PORT")
        .WithExternalHttpEndpoints()
        .WithEnvironment("BROWSER", "none")
        .WaitFor(apiService);

    var angularUri = angularApp.GetEndpoint("http");
    apiService.WithEnvironment("FRONTEND_URI", angularUri);
}
else
{
    var apiHttpEndpoint = apiService.GetEndpoint("http");

    var angularContainerApp = builder.AddContainer("angular", "servoskull-angular")
        .WithReference(apiService)
        .WithHttpEndpoint(targetPort: 80)
        .WithExternalHttpEndpoints()
        .WithEnvironment(ctx =>
        {
            ctx.EnvironmentVariables["API_HOST"] = apiHttpEndpoint.Property(EndpointProperty.Host);
            ctx.EnvironmentVariables["API_PORT"] = apiHttpEndpoint.Property(EndpointProperty.Port);
        })
        .WaitFor(apiService);

    var angularContainerUri = angularContainerApp.GetEndpoint("http");
    apiService.WithEnvironment("FRONTEND_URI", angularContainerUri);
}

builder.Build().Run();
