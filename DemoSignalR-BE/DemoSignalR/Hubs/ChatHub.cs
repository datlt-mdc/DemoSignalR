
using DemoSignalR.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DemoSignalR.Hubs
{
    [Authorize] // Yêu cầu người dùng phải xác thực để kết nối và sử dụng Hub này
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _dbContext;

        public ChatHub(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        // Khi một client kết nối
        public override async Task OnConnectedAsync()
        {
            // Lấy User ID từ ClaimsPrincipal từ JWT (được thêm vào khi đăng nhập)
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userId != null)
            {
                // Thêm người dùng vào một nhóm riêng tư dựa trên ID của họ
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                Console.WriteLine($"User {userId} connected with ConnectionId: {Context.ConnectionId}");
            }
            await base.OnConnectedAsync();
        }

        // Khi một client ngắt kết nối
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userId != null)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
                Console.WriteLine($"User {userId} disconnected from ConnectionId: {Context.ConnectionId}");
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Gửi tin nhắn riêng tư từ người gửi đến người nhận
        public async Task SendPrivateMessage(string receiverId, string messageContent)
        {
            // Lấy User ID và Username của người gửi từ Context (đã được xác thực)
            var senderId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var senderUsername = Context.User?.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(senderId) || string.IsNullOrEmpty(receiverId))
            {
                await Clients.Caller.SendAsync("ReceiveError", "Sender or receiver ID is missing.");
                return;
            }

            // Kiểm tra xem người nhận có tồn tại không
            var receiverUser = await _dbContext.Users.FindAsync(receiverId);
            if (receiverUser == null)
            {
                await Clients.Caller.SendAsync("ReceiveError", "Receiver not found.");
                return;
            }

            // Lưu tin nhắn vào database
            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Content = messageContent,
                Timestamp = DateTime.UtcNow
            };
            _dbContext.Messages.Add(message);
            await _dbContext.SaveChangesAsync();

            // Gửi tin nhắn đến người gửi (để hiển thị trong UI của họ)
            await Clients.Caller.SendAsync("ReceivePrivateMessage", senderId, receiverId, messageContent, senderUsername, receiverUser.Username, message.Timestamp);

            // Gửi tin nhắn đến người nhận (chỉ nếu người nhận đang online và kết nối với Hub)
            // Clients.Group(receiverId) sẽ gửi đến tất cả các kết nối của người nhận đó
            await Clients.Group(receiverId).SendAsync("ReceivePrivateMessage", senderId, receiverId, messageContent, senderUsername, receiverUser.Username, message.Timestamp);

            Console.WriteLine($"Private message from {senderUsername} ({senderId}) to {receiverUser.Username} ({receiverId}): {messageContent}");
        }

        // Lấy lịch sử tin nhắn giữa hai người dùng
        public async Task GetMessageHistory(string otherUserId)
        {
            var currentUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(currentUserId) || string.IsNullOrEmpty(otherUserId))
            {
                await Clients.Caller.SendAsync("ReceiveError", "User IDs are missing for message history.");
                return;
            }

            var messages = await _dbContext.Messages
                .Where(m => (m.SenderId == currentUserId && m.ReceiverId == otherUserId) ||
                            (m.SenderId == otherUserId && m.ReceiverId == currentUserId))
                .OrderBy(m => m.Timestamp)
                .Select(m => new {
                    m.Id,
                    SenderId = m.SenderId,
                    ReceiverId = m.ReceiverId,
                    Content = m.Content,
                    Timestamp = m.Timestamp,
                    SenderUsername = _dbContext.Users.Where(u => u.Id == m.SenderId).Select(u => u.Username).FirstOrDefault(),
                    ReceiverUsername = _dbContext.Users.Where(u => u.Id == m.ReceiverId).Select(u => u.Username).FirstOrDefault()
                })
                .ToListAsync();

            await Clients.Caller.SendAsync("ReceiveMessageHistory", messages);
        }
    }
}
