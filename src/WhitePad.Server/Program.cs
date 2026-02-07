using WhitePad.Server.Hubs;
using WhitePad.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSignalR();
builder.Services.AddSingleton<ITokenGenerator, TokenGenerator>();
builder.Services.AddSingleton<IRoomStateManager, InMemoryRoomStateManager>();

// Add CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Middleware pipeline
app.UseCors();
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

// Map SignalR hub
app.MapHub<WhiteboardHub>("/hub/whiteboard");

// SPA fallback routing
app.MapFallbackToFile("index.html");

app.Run();
