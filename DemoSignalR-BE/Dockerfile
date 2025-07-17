# Giai đoạn Base Image: Đặt môi trường runtime cơ bản
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Giai đoạn Build Image: Cần SDK để build ứng dụng
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy và restore file .sln và các file .csproj đầu tiên
# Điều này tận dụng Docker cache hiệu quả hơn
COPY ["DemoSignalR-BE/DemoSignalR.sln", "./"]
COPY ["DemoSignalR-BE/DemoSignalR/DemoSignalR.csproj", "DemoSignalR/"]

# Chạy dotnet restore cho toàn bộ solution
# (Đảm bảo tất cả các package được tải)
RUN dotnet restore "DemoSignalR.sln"

# Copy toàn bộ mã nguồn còn lại
# Đảm bảo bạn đang ở /src khi COPY . . để có cấu trúc dự án chính xác
COPY . .

# Thay đổi thư mục làm việc vào thư mục dự án ASP.NET Core API chính của bạn
# Đây là bước quan trọng để dotnet publish hoạt động đúng
WORKDIR "/src/DemoSignalR"

# Publish ứng dụng chính (dự án API của bạn)
# Output sẽ nằm trong /app/publish trong giai đoạn build này
RUN dotnet publish "DemoSignalR.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Giai đoạn Final Image: Chỉ chứa runtime và ứng dụng đã publish
FROM base AS final
WORKDIR /app
# Sao chép tất cả các file đã publish từ giai đoạn build vào thư mục /app cuối cùng
COPY --from=build /app/publish .
# Thiết lập điểm vào cho ứng dụng của bạn
ENTRYPOINT ["dotnet", "DemoSignalR.dll"]