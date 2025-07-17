using DemoSignalR.Hubs;
using DemoSignalR.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))); // Sử dụng SQL Server

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"];
var issuer = jwtSettings["Issuer"];
var audience = jwtSettings["Audience"];


builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
    // Cấu hình JWT cho SignalR
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            // Nếu request đến Hub và có access_token trong query string
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/chatHub"))) // Đảm bảo khớp với endpoint của Hub
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddSignalR(); // NOTE: Đăng kí service SignalR

builder.Services.AddControllers();

// Cấu hình CORS để cho phép frontend Vite React kết nối
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // Thay thế bằng URL của frontend Vite React nếu khác
                .WithOrigins("http://localhost:5174")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // Rất quan trọng để SignalR hoạt động với CORS
        });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Áp dụng migrations khi khởi động ứng dụng (chỉ nên dùng trong dev)
    //using (var scope = app.Services.CreateScope())
    //{
    //    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    //    dbContext.Database.Migrate(); // Áp dụng tất cả các migrations đang chờ xử lý
    //}
}
    app.UseSwagger();
    app.UseSwaggerUI();
// Sử dụng CORS policy
app.UseCors("CorsPolicy");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
// Ánh xạ SignalR Hub
app.MapHub<ChatHub>("/chatHub"); // NOTE: Endpoint mà frontend sẽ kết nối đến

app.Run();
