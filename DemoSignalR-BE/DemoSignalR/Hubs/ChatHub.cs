
using Microsoft.AspNetCore.SignalR;

namespace DemoSignalR.Hubs
{
    public class ChatHub : Hub
    {
        // Phương thức mà client có thể gọi để gửi tin nhắn tới tất cả client khác
        public async Task SendMessage(string user, string message)
        {
            // Gọi phương thức "ReceiveMessage" trên tất cả client đã kết nối
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }
    }
}
