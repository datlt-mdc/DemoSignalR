using DemoSignalR.Hubs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace DemoSignalR.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessageController : ControllerBase
    {
        private readonly IHubContext<ChatHub> _hubContext;
        // Endpoint API để gửi tin nhắn đến tất cả client thông qua Hub
        [HttpPost("broadcast")]
        public async Task<IActionResult> BroadcastMessage([FromBody] MessageDto messageDto)
        {
            await _hubContext.Clients.All.SendAsync("ReceiveMessage", messageDto.User, messageDto.Message);
            return Ok("Tin nhắn đã được gửi tới tất cả client.");
        }
    }
}

public class MessageDto
{
    public string User { get; set; }
    public string Message { get; set; }
}