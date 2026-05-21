using Microsoft.AspNetCore.HttpOverrides;
using WhitePad.Server.Hubs;
using WhitePad.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<RateLimitingHubFilter>();
builder.Services.AddSignalR(options =>
{
    options.AddFilter(typeof(RateLimitingHubFilter));
});
builder.Services.AddSingleton<ITokenGenerator, TokenGenerator>();
builder.Services.AddSingleton<IRoomStateManager, InMemoryRoomStateManager>();
builder.Services.AddHostedService<RoomExpirationService>();

// Trust forwarded headers from Cloudflare Tunnel / reverse proxy
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "https://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseCors();

if (!app.Environment.IsProduction())
    app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<WhiteboardHub>("/hub/whiteboard");
app.MapFallbackToFile("index.html");

app.Run();
