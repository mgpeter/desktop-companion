using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.ServoSkull_ApiService>("apiservice")
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", builder.Environment.EnvironmentName);

<<<<<<< Updated upstream
// Configure ASP.NET Core Web project
var webApp = builder.AddProject<Projects.ServoSkull_Web>("webapp")
=======
// Configure Angular frontend
var angularApp = builder.AddNpmApp("angular", "../ServoSkull.Angular", scriptName: "start:aspire")
>>>>>>> Stashed changes
    .WithReference(apiService)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", builder.Environment.EnvironmentName);

if (builder.Environment.IsDevelopment())
{
    // Configure Angular frontend
    var angularApp = builder.AddNpmApp("angular", "../ServoSkull.Angular")
        .WithReference(apiService)
        .WithHttpEndpoint(env: "PORT")
        .WithExternalHttpEndpoints()
        .WaitFor(apiService);

    // Get the Angular app's URI and pass it to the API service
    var angularUri = angularApp.GetEndpoint("http");
    apiService.WithEnvironment("FRONTEND_URI", angularUri);
}
else
{
    var angularContainerApp = builder.AddContainer("angular", "servoskull-angular")
        .WithReference(apiService)
        .WithHttpEndpoint(80)
        .WithEnvironment("API_URI", apiService.GetEndpoint("http"))
        .WaitFor(apiService);

    var angularContainerUri = angularContainerApp.GetEndpoint("http");
    apiService.WithEnvironment("FRONTEND_URI", angularContainerUri);

}

builder.Build().Run();
