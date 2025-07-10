namespace DemoSignalR.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string SenderId { get; set; }
        public User Sender { get; set; } // Navigation property
        public string ReceiverId { get; set; }
        public User Receiver { get; set; } // Navigation property
        public string Content { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
