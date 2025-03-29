var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.ServoSkull_ApiService>("apiservice");

// Configure Angular frontend
var angularApp = builder.AddNpmApp("angular", "../ServoSkull.Angular")
    .WithReference(apiService)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WaitFor(apiService);

// Get the Angular app's URI and pass it to the API service
var angularUri = angularApp.GetEndpoint("http");
apiService.WithEnvironment("FRONTEND_URI", angularUri);

builder.Build().Run();
