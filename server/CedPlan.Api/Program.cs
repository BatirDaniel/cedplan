using System.Text;
using CedPlan.Application.Projects;
using CedPlan.Application.WorkPackages;
using CedPlan.Domain.Access;
using CedPlan.Infrastructure.Access;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Hubs;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "CedPlan API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Introduceți: Bearer {token}"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
})
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<IProjectAccess, ProjectAccess>();

// Projects bounded-context use cases (CedPlan.Application.Projects) — one class per operation.
builder.Services.AddScoped<ProjectQueries>();
builder.Services.AddScoped<CreateProject>();
builder.Services.AddScoped<UpdateProject>();
builder.Services.AddScoped<DeleteProject>();
builder.Services.AddScoped<AddProjectMember>();
builder.Services.AddScoped<UpdateProjectMemberRole>();
builder.Services.AddScoped<RemoveProjectMember>();

// WorkPackages bounded-context use cases (CedPlan.Application.WorkPackages).
builder.Services.AddScoped<WorkPackageQueries>();
builder.Services.AddScoped<CreateWorkPackage>();
builder.Services.AddScoped<UpdateWorkPackage>();
builder.Services.AddScoped<MoveWorkPackage>();
builder.Services.AddScoped<UpdateWorkPackageStatus>();
builder.Services.AddScoped<UpdateWorkPackageSchedule>();
builder.Services.AddScoped<DeleteWorkPackage>();
builder.Services.AddScoped<AddWorkPackageComment>();
builder.Services.AddScoped<AddWorkPackageTimeEntry>();
builder.Services.AddSignalR();

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // SignalR's browser client can't attach an Authorization header to the
    // WebSocket upgrade request, so it passes the token via query string instead.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
        // Every JWT carries a session id ("sid"). If that session was revoked
        // (e.g. "log out this device" from Active Sessions), reject the token
        // even though its signature and expiry are still otherwise valid.
        OnTokenValidated = async context =>
        {
            var sidClaim = context.Principal?.FindFirst("sid")?.Value;
            if (!Guid.TryParse(sidClaim, out var sessionId))
            {
                context.Fail("Missing session.");
                return;
            }

            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var session = await db.UserSessions.FindAsync(sessionId);
            if (session == null || session.IsRevoked)
            {
                context.Fail("Session revoked.");
                return;
            }

            if (DateTime.UtcNow - session.LastActiveAt > TimeSpan.FromMinutes(1))
            {
                session.LastActiveAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
        }
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<CommentsHub>("/hubs/comments");
app.MapHub<NotificationsHub>("/hubs/notifications");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await PermissionService.SeedDefaultsAsync(db);
}

app.Run();
