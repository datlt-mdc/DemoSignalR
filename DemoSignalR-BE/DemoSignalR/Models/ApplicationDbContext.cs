using Microsoft.EntityFrameworkCore;

namespace DemoSignalR.Models
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } // DbSet cho mô hình User tự tạo
        public DbSet<Message> Messages { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Cấu hình mối quan hệ cho bảng Message
            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages) // Thêm navigation property cho User
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict); // Không xóa cascade khi xóa người gửi

            builder.Entity<Message>()
                .HasOne(m => m.Receiver)
                .WithMany(u => u.ReceivedMessages) // Thêm navigation property cho User
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict); // Không xóa cascade khi xóa người nhận

            // Đảm bảo Username là duy nhất
            builder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            // Đảm bảo Email là duy nhất
            builder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
        }
    }
}
