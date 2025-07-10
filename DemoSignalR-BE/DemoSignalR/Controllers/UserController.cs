using DemoSignalR.DTO;
using DemoSignalR.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DemoSignalR.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public UserController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (currentUserId == null)
            {
                return Unauthorized("User not authenticated.");
            }

            var users = await _dbContext.Users
                .Where(u => u.Id != currentUserId) // Không hiển thị chính người dùng đang đăng nhập
                .Select(u => new UserDto { Id = u.Id, Username = u.Username })
                .ToListAsync();

            return Ok(users);
        }
    }
}
