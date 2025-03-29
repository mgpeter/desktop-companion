var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.ServoSkull_ApiService>("apiservice");

builder.AddProject<Projects.ServoSkull_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WaitFor(apiService);

builder.AddNpmApp("angular", "../ServoSkull.Angular")
    .WithReference(apiService)
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WaitFor(apiService);

builder.Build().Run();
