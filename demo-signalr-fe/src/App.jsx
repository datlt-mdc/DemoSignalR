import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import * as signalR from '@microsoft/signalr'; // Import thư viện SignalR client

import './index.css'; // Đảm bảo bạn có file CSS này để styling
import { Header } from "./components/Header";

function App() {
  // State để lưu trữ kết nối SignalR
  const [connection, setConnection] = useState(null);
  // State để lưu trữ danh sách tin nhắn
  const [messages, setMessages] = useState([]);
  // State cho tên người dùng và nội dung tin nhắn
  const [user, setUser] = useState("Anonymous");
  const [message, setMessage] = useState("");
  // Ref để tự động cuộn xuống tin nhắn mới nhất
  const messagesEndRef = useRef(null);

  // Hàm để cuộn xuống cuối danh sách tin nhắn
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // NOTE: Khởi tạo kết nối SignalR khi component được mount (SETUP CONNECTION)
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7232/chatHub", {
        // Thay thế bằng URL và cổng của backend ASP.NET Core của bạn
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets, // Buộc sử dụng WebSockets
      })
      .withAutomaticReconnect() // Tự động kết nối lại nếu bị mất kết nối
      .build();

    setConnection(newConnection);

    // Cleanup function khi component unmount
    return () => {
      if (newConnection.state === signalR.HubConnectionState.Connected) {
        newConnection.stop();
      }
    };
  }, []);

  // NOTE: Nếu kết nối được, setup coi sẽ nhận tín hiệu gì từ server
  useEffect(() => {
    if (connection) {
      // Bắt đầu kết nối
      connection
        .start()
        .then(() => {
          console.log("Kết nối SignalR đã được thiết lập!");

          // Đăng ký sự kiện "ReceiveMessage" từ Hub
          connection.on("ReceiveMessage", (user, message) => {
            setMessages((prevMessages) => [
              ...prevMessages,
              { user, message, timestamp: new Date() },
            ]);
          });
        })
        .catch((e) => console.error("Lỗi khi thiết lập kết nối SignalR:", e));

      // Cleanup cho kết nối và sự kiện
      return () => {
        connection.off("ReceiveMessage"); // Hủy đăng ký sự kiện
      };
    }
  }, [connection]);

  useEffect(() => {
    scrollToBottom(); // Cuộn xuống cuối mỗi khi có tin nhắn mới
  }, [messages]);

  // Xử lý gửi tin nhắn
  const sendMessage = async (e) => {
    e.preventDefault(); // Ngăn chặn form submit reload trang
    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected
    ) {
      try {
        // Gọi phương thức "SendMessage" trên Hub ở Backend
        await connection.invoke("SendMessage", user, message);
        setMessage(""); // Xóa nội dung tin nhắn sau khi gửi
      } catch (err) {
        console.error("Lỗi khi gửi tin nhắn:", err);
      }
    } else {
      console.warn(
        "Chưa kết nối đến SignalR Hub hoặc kết nối đang ở trạng thái không hợp lệ."
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-inter p-4">
      <Header />

      <div className="flex-grow flex flex-col bg-white rounded-lg shadow-xl overflow-hidden">
        <div
          className="flex-grow p-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 250px)" }}
        >
          {" "}
          {/* Adjusted for header and input */}
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">
              Chưa có tin nhắn nào. Bắt đầu gửi đi!
            </p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 p-3 rounded-lg max-w-[70%] ${
                  msg.user === user
                    ? "bg-blue-100 ml-auto text-right"
                    : "bg-gray-200 mr-auto text-left"
                }`}
              >
                <div className="font-semibold text-sm text-gray-700">
                  {msg.user}
                </div>
                <div className="text-gray-800">{msg.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} /> {/* Dùng để cuộn xuống cuối */}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <form onSubmit={sendMessage} className="flex flex-col space-y-3">
            <div className="flex space-x-3">
              <input
                type="text"
                className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên của bạn"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
              />
            </div>
            <div className="flex space-x-3">
              <input
                type="text"
                className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tin nhắn..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                disabled={
                  !connection ||
                  connection.state !== signalR.HubConnectionState.Connected
                }
              >
                Gửi
              </button>
            </div>
            <div className="text-sm text-gray-600 mt-2 text-center">
              Trạng thái kết nối: {connection?.state || "Đang khởi tạo..."}
            </div>
          </form>
        </div>
      </div>

      <footer className="text-center text-gray-600 text-sm mt-6">
        Demo SignalR được tạo bởi Gemini.
      </footer>
    </div>
  );
}

export default App;
