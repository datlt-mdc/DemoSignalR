namespace DemoSignalR.Models
{
    public class User
    {
        public string Id { get; set; } = Guid.NewGuid().ToString(); // Sử dụng GUID làm ID
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; } // Lưu mật khẩu đã băm
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property cho tin nhắn gửi
        public ICollection<Message> SentMessages { get; set; }
        // Navigation property cho tin nhắn nhận
        public ICollection<Message> ReceivedMessages { get; set; }
    }
}
