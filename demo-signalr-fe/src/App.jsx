// File: src/App.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr'; // Import thư viện SignalR client
import './index.css'; // Đảm bảo bạn có file CSS này để styling

// Base URL cho backend API của bạn
const API_BASE_URL = 'https://localhost:7232/api'; // Thay đổi nếu backend của bạn chạy trên cổng khác

// Main App Component
const App = () => {
    // --- Authentication States ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // { userId, username, token }
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [registerUsername, setRegisterUsername] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [authMessage, setAuthMessage] = useState(''); // Thông báo lỗi/thành công từ auth API

    // --- Chat States ---
    const [connection, setConnection] = useState(null);
    const [users, setUsers] = useState([]); // Danh sách người dùng để chat
    const [selectedUser, setSelectedUser] = useState(null); // Người dùng đang chat cùng
    const [messages, setMessages] = useState([]); // Tin nhắn trong cuộc trò chuyện hiện tại
    const [messageInput, setMessageInput] = useState(''); // Nội dung tin nhắn đang gõ
    const messagesEndRef = useRef(null); // Ref để tự động cuộn xuống tin nhắn mới nhất

    // Hàm để cuộn xuống cuối danh sách tin nhắn
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // --- Authentication Handlers ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/Auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwtToken', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('username', data.username);
                setCurrentUser({ userId: data.userId, username: data.username, token: data.token });
                setIsLoggedIn(true);
                setAuthMessage('Đăng nhập thành công!');
            } else {
                setAuthMessage(data.message || 'Đăng nhập thất bại.');
            }
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            setAuthMessage('Đã xảy ra lỗi khi đăng nhập.');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/Auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: registerUsername, email: registerEmail, password: registerPassword })
            });
            const data = await response.json();

            if (response.ok) {
                setAuthMessage('Đăng ký thành công! Vui lòng đăng nhập.');
                setRegisterUsername('');
                setRegisterEmail('');
                setRegisterPassword('');
            } else {
                setAuthMessage(data.message || 'Đăng ký thất bại. Tên đăng nhập hoặc email có thể đã tồn tại.');
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            setAuthMessage('Đã xảy ra lỗi khi đăng ký.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setConnection(prevConnection => {
            if (prevConnection && prevConnection.state === signalR.HubConnectionState.Connected) {
                prevConnection.stop();
            }
            return null;
        });
        setUsers([]);
        setSelectedUser(null);
        setMessages([]);
        setAuthMessage('Bạn đã đăng xuất.');
    };

    // --- Initial Load & Re-authentication ---
    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        if (token && userId && username) {
            setCurrentUser({ userId, username, token });
            setIsLoggedIn(true);
        }
    }, []);

    // --- SignalR Connection Management ---
    useEffect(() => {
        if (isLoggedIn && currentUser && !connection) {
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(`${API_BASE_URL.replace('/api', '')}/chatHub?access_token=${currentUser.token}`, {
                    skipNegotiation: true,
                    transport: signalR.HttpTransportType.WebSockets
                })
                .withAutomaticReconnect()
                .build();

            setConnection(newConnection);
        }

        // Cleanup function for connection
        return () => {
            if (connection && connection.state === signalR.HubConnectionState.Connected) {
                connection.stop();
            }
        };
    }, [isLoggedIn, currentUser, connection]); // Dependency on 'connection' to prevent re-creation if already exists

    // --- SignalR Event Handlers ---
    useEffect(() => {
        if (connection) {
            connection.start()
                .then(() => {
                    console.log('Kết nối SignalR đã được thiết lập và xác thực!');

                    // Đăng ký sự kiện nhận tin nhắn riêng tư
                    connection.on('ReceivePrivateMessage', (senderId, receiverId, content, senderUsername, receiverUsername, timestamp) => {
                        console.log(`Nhận tin: ${content} từ ${senderUsername} (${senderId}) đến ${receiverUsername} (${receiverId})`);
                        setMessages(prevMessages => [...prevMessages, {
                            senderId,
                            receiverId,
                            content,
                            senderUsername,
                            receiverUsername,
                            timestamp: new Date(timestamp)
                        }]);
                    });

                    // Đăng ký sự kiện nhận lịch sử tin nhắn
                    connection.on('ReceiveMessageHistory', (history) => {
                        const formattedHistory = history.map(msg => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp) // Chuyển đổi timestamp thành đối tượng Date
                        }));
                        setMessages(formattedHistory);
                        console.log('Đã nhận lịch sử tin nhắn:', formattedHistory);
                    });

                    // Đăng ký sự kiện nhận lỗi từ Hub
                    connection.on('ReceiveError', (errorMsg) => {
                        console.error('Lỗi từ SignalR Hub:', errorMsg);
                        alert(`Lỗi: ${errorMsg}`); // Sử dụng alert tạm thời, nên thay bằng modal
                    });

                })
                .catch(e => {
                    console.error('Lỗi khi thiết lập kết nối SignalR:', e);
                    // Có thể hiển thị thông báo lỗi cho người dùng
                });

            // Cleanup for event listeners
            return () => {
                connection.off('ReceivePrivateMessage');
                connection.off('ReceiveMessageHistory');
                connection.off('ReceiveError');
            };
        }
    }, [connection]); // Re-run when connection object changes

    // --- Fetch Users List ---
    const fetchUsers = useCallback(async () => {
        if (!currentUser?.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/User`, {
                headers: {
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error('Không thể lấy danh sách người dùng:', response.statusText);
                // Xử lý lỗi, có thể là token hết hạn
                if (response.status === 401) {
                    handleLogout(); // Đăng xuất nếu token không hợp lệ
                }
            }
        } catch (error) {
            console.error('Lỗi khi lấy danh sách người dùng:', error);
        }
    }, [currentUser]);

    useEffect(() => {
        if (isLoggedIn && currentUser) {
            fetchUsers();
        }
    }, [isLoggedIn, currentUser, fetchUsers]);

    // --- Chat Message Sending ---
    const sendPrivateMessage = async (e) => {
        e.preventDefault();
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
            console.warn('Chưa kết nối đến SignalR Hub hoặc kết nối đang ở trạng thái không hợp lệ.');
            alert('Chưa kết nối đến máy chủ chat. Vui lòng thử lại sau.');
            return;
        }
        if (!selectedUser) {
            alert('Vui lòng chọn người dùng để trò chuyện.');
            return;
        }
        if (messageInput.trim() === '') {
            return; // Không gửi tin nhắn rỗng
        }

        try {
            await connection.invoke('SendPrivateMessage', selectedUser.id, messageInput);
            setMessageInput(''); // Xóa nội dung tin nhắn sau khi gửi
        } catch (err) {
            console.error('Lỗi khi gửi tin nhắn riêng tư:', err);
            alert('Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối.');
        }
    };

    // --- Load Message History when selecting a user ---
    useEffect(() => {
        if (selectedUser && connection && connection.state === signalR.HubConnectionState.Connected) {
            console.log(`Đang tải lịch sử tin nhắn với ${selectedUser.username} (${selectedUser.id})...`);
            connection.invoke('GetMessageHistory', selectedUser.id)
                .catch(err => console.error('Lỗi khi lấy lịch sử tin nhắn:', err));
        } else if (!selectedUser) {
            setMessages([]); // Xóa tin nhắn nếu không có người dùng nào được chọn
        }
    }, [selectedUser, connection]);

    // Cuộn xuống cuối mỗi khi có tin nhắn mới
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // --- Render Logic ---
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 font-inter p-4">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                    <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">Chào mừng đến với Chat App</h2>
                    {authMessage && (
                        <div className={`p-3 mb-4 rounded-lg text-center ${authMessage.includes('thành công') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {authMessage}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-4 mb-8">
                        <h3 className="text-xl font-semibold text-gray-700">Đăng nhập</h3>
                        <div>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Tên đăng nhập"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Mật khẩu"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Đăng nhập
                        </button>
                    </form>

                    {/* Register Form */}
                    <form onSubmit={handleRegister} className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-700">Đăng ký tài khoản mới</h3>
                        <div>
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Tên đăng nhập"
                                value={registerUsername}
                                onChange={(e) => setRegisterUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Email"
                                value={registerEmail}
                                onChange={(e) => setRegisterEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Mật khẩu"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            Đăng ký
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 font-inter p-4">
            <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg mb-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">SignalR Private Chat</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-lg">Xin chào, <span className="font-semibold">{currentUser?.username}</span>!</span>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            <div className="flex-grow flex bg-white rounded-lg shadow-xl overflow-hidden">
                {/* User List Sidebar */}
                <div className="w-1/4 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Người dùng online</h2>
                    {users.length === 0 ? (
                        <p className="text-gray-500 text-sm">Không có người dùng nào khác.</p>
                    ) : (
                        <ul>
                            {users.map(user => (
                                <li key={user.id} className="mb-2">
                                    <button
                                        onClick={() => setSelectedUser(user)}
                                        className={`w-full text-left p-3 rounded-lg transition duration-200 ease-in-out ${
                                            selectedUser?.id === user.id ? 'bg-blue-200 text-blue-800 font-semibold' : 'bg-white hover:bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        {user.username}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Chat Area */}
                <div className="flex-grow flex flex-col">
                    {selectedUser ? (
                        <>
                            <div className="bg-gray-100 p-4 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-800">Trò chuyện với: {selectedUser.username}</h2>
                                <p className="text-sm text-gray-500">ID: {selectedUser.id}</p>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 200px)' }}> {/* Adjusted for header and input */}
                                {messages.length === 0 ? (
                                    <p className="text-center text-gray-500 mt-10">Bắt đầu cuộc trò chuyện!</p>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`mb-3 p-3 rounded-lg max-w-[70%] ${
                                                msg.senderId === currentUser.userId ? 'bg-blue-100 ml-auto text-right' : 'bg-gray-200 mr-auto text-left'
                                            }`}
                                        >
                                            <div className="font-semibold text-sm text-gray-700">
                                                {msg.senderId === currentUser.userId ? 'Bạn' : msg.senderUsername}
                                            </div>
                                            <div className="text-gray-800">{msg.content}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {msg.timestamp.toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} /> {/* Dùng để cuộn xuống cuối */}
                            </div>

                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                <form onSubmit={sendPrivateMessage} className="flex space-x-3">
                                    <input
                                        type="text"
                                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nhập tin nhắn..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        disabled={!connection || connection.state !== signalR.HubConnectionState.Connected}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                                        disabled={!connection || connection.state !== signalR.HubConnectionState.Connected}
                                    >
                                        Gửi
                                    </button>
                                </form>
                                <div className="text-sm text-gray-600 mt-2 text-center">
                                    Trạng thái kết nối: {connection?.state || 'Đang khởi tạo...'}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-gray-500 text-xl">
                            Vui lòng chọn một người dùng để bắt đầu trò chuyện.
                        </div>
                    )}
                </div>
            </div>

            <footer className="text-center text-gray-600 text-sm mt-4">
                SignalR Chat Demo với xác thực JWT và trò chuyện riêng tư được tạo bởi Gemini.
            </footer>
        </div>
    );
};

export default App;
