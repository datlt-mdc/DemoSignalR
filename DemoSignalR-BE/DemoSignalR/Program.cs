using DemoSignalR.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
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
    app.UseSwagger();
    app.UseSwaggerUI();
}
// Sử dụng CORS policy
app.UseCors("CorsPolicy");

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
// Ánh xạ SignalR Hub
app.MapHub<ChatHub>("/chatHub"); // NOTE: Endpoint mà frontend sẽ kết nối đến

app.Run();
