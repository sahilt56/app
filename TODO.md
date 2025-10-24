// src/App.jsx - WhatsApp Style Complete Chat App
// Fixed Reply/React/Forward Features

import React, {
  useState,
  useEffect,
  useRef,
  Fragment,
  useCallback,
} from "react";
import { Menu as HeadlessMenu, Transition, MenuItem } from "@headlessui/react";
import {
  Send,
  LogOut,
  User,
  Search,
  Menu,
  Plus,
  MoreVertical,
  Phone,
  Video,
  Edit2,
  Palette,
  Sun,
  Moon,
  UserPlus,
  Trash2,
  ChevronDown,
  Edit,
  CornerUpLeft,
  CornerUpRight,
  Smile,
} from "lucide-react";
import chatService from "./services/pocketbase";
import EmojiPicker from "emoji-picker-react";
import ChatSettings from "./ChatSettings";

const isValidEmail = (email) => {
  const t = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return false;
  const l = t.toLowerCase();
  if (l.startsWith("test@") || l.startsWith("abc@") || l.startsWith("asdf@") || l.startsWith("123@")) return false;
  const p = t.split("@");
  if (p.length !== 2 || p[0].length < 3) return false;
  if (!p[1].includes(".") || p[1].split(".").pop().length < 2) return false;
  return true;
};

const isValidName = (name) => {
  const t = name.trim();
  if (t.length < 3) return false;
  if (!/^[a-zA-Z\s-]+$/.test(t)) return false;
  const w = t.split(/\s+/).filter((p) => p.length > 0);
  if (w.length < 2) return false;
  if (w.some((w) => w.length < 2)) return false;
  return true;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResultUser, setSearchResultUser] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [chatBgClass, setChatBgClass] = useState("bg-[#e5ddd5]");
  const [chatBgPattern, setChatBgPattern] = useState(
    "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%23e5ddd5' fill-opacity='.4'/%3E%3C/svg%3E\")"
  );
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const creatingChatLock = useRef(false);
  const selectedChatIdRef = useRef(null);
  
  useEffect(() => {
    selectedChatIdRef.current = selectedChat?.id || null;
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const getOtherUser = useCallback(
    (chat) => {
      if (!currentUser || !chat?.expand?.participants) return null;
      return chat.expand.participants.find((p) => p.id !== currentUser.id);
    },
    [currentUser]
  );
  
  const formatTime = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };
  
  const formatChatTime = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString), n = new Date(), h = (n - d) / 36e5, dy = h / 24;
      if (dy < 1 && n.getDate() === d.getDate())
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      if (dy < 2 && n.getDate() === d.getDate() + 1) return "Yesterday";
      if (dy < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const loadContacts = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const r = await chatService.getContacts();
      setContacts(r);
    } catch (e) {
      console.error("Load contacts err:", e);
    }
  }, [isLoggedIn]);
  
  const loadChats = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const c = await chatService.getUserChats();
      setChats(c);
    } catch (e) {
      console.error("Load chats err:", e);
    }
  }, [isLoggedIn]);
  
  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const m = await chatService.getChatMessages(chatId);
      setMessages(m);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error("Load msgs err:", e);
    }
  }, []);

  const handleSelectChat = useCallback(
    async (chat) => {
      if (selectedChatIdRef.current === chat.id) return;
      setUnreadCounts((prevCounts) => {
        const newCounts = { ...prevCounts };
        if (newCounts[chat.id]) delete newCounts[chat.id];
        return newCounts;
      });
      setSelectedChat(chat);
      setShowSidebar(false);
      try {
        const chatMessages = await chatService.getChatMessages(chat.id);
        const unreadIds = chatMessages
          .filter((m) => !m.isRead && m.sender !== currentUser?.id)
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          setMessages((prev) =>
            prev.map((m) => unreadIds.includes(m.id) ? { ...m, isRead: true } : m)
          );
        }

        if (unreadIds.length > 0) {
          const markReadPromises = unreadIds.map(async (id) => {
            try {
              await chatService.markAsRead(id);
            } catch (e) {
              if (e.data?.code !== "404") throw e;
            }
          });
          await Promise.all(markReadPromises);
        }
      } catch (error) {
        console.error("Error marking read:", error);
      }
    },
    [currentUser?.id]
  );

  useEffect(() => {
    if (chatService.isAuthenticated()) {
      const u = chatService.getCurrentUser();
      setCurrentUser(u);
      setIsLoggedIn(true);
    }
    const theme = localStorage.getItem("chatAppTheme");
    if (theme === "dark") setIsDarkMode(true);
    const bgC = localStorage.getItem("chatBgClass");
    const bgP = localStorage.getItem("chatBgPattern");
    if (bgC) setChatBgClass(bgC);
    if (bgP !== null) setChatBgPattern(bgP);
  }, []);

  useEffect(() => {
    let chatUnsub = () => {}, userUnsub = () => {}, contactUnsub = () => {}, msgUnsub = () => {};
    if (isLoggedIn && currentUser?.id) {
      loadChats();
      loadContacts();
      const handleMsgEvent = (e) => {
        const senderId = e.record.sender;
        const chatId = e.record.chat;
        const isCurrentChat = selectedChatIdRef.current === chatId;
        if (isCurrentChat) {
          if (e.action === "create") {
            setMessages((p) => p.find((m) => m.id === e.record.id) ? p : [...p, e.record]);
            setTimeout(scrollToBottom, 100);
            if (!e.record.isRead && senderId !== currentUser?.id)
              chatService.markAsRead(e.record.id);
          } else if (e.action === "update") {
            setMessages((p) => p.map((m) => (m.id === e.record.id ? e.record : m)));
          } else if (e.action === "delete") {
            setMessages((p) => p.filter((m) => m.id !== e.record.id));
          }
        } else {
          if (e.action === "create" && !e.record.isRead && senderId !== currentUser?.id) {
            setUnreadCounts((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
          }
        }
        if (e.action === "create" || e.action === "delete") loadChats();
      };
      (async () => {
        try {
          chatUnsub = await chatService.pb.collection("chats").subscribe("*", (e) => {
            if (e.record.participants?.includes(currentUser?.id)) {
              loadChats();
              loadContacts();
            }
          });
          userUnsub = await chatService.pb.collection("users").subscribe("*", (e) => {
            loadContacts();
            if (e.record.id === currentUser?.id) setCurrentUser(e.record);
            setTypingUsers((prev) => {
              const n = { ...prev };
              Object.keys(n).forEach((cId) => {
                if (n[cId]?.[e.record.id]) delete n[cId][e.record.id];
                if (Object.keys(n[cId] || {}).length === 0) delete n[cId];
              });
              if (e.record.isTypingIn) {
                if (!n[e.record.isTypingIn]) n[e.record.isTypingIn] = {};
                n[e.record.isTypingIn][e.record.id] = true;
              }
              return n;
            });
            setChats((prev) =>
              prev.map((c) => {
                if (c.expand?.participants) {
                  const uP = c.expand.participants.map((p) =>
                    p.id === e.record.id ? e.record : p
                  );
                  return { ...c, expand: { ...c.expand, participants: uP } };
                }
                return c;
              })
            );
          });
          contactUnsub = await chatService.pb.collection("contacts").subscribe("*", (e) => {
            if (e.record.owner === currentUser?.id) loadContacts();
          });
          msgUnsub = await chatService.pb.collection("messages").subscribe("*", handleMsgEvent);
          await chatService.updateUserStatus("online");
        } catch (error) {
          console.error("Sub setup error:", error);
        }
      })();
      return () => {
        if (typeof chatUnsub === "function") chatUnsub();
        if (typeof userUnsub === "function") userUnsub();
        if (typeof contactUnsub === "function") contactUnsub();
        if (typeof msgUnsub === "function") msgUnsub();
      };
    }
  }, [isLoggedIn, currentUser?.id, loadChats, loadContacts]);
  
  useEffect(() => {
    localStorage.setItem("chatAppTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);
  
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    } else {
      setMessages([]);
    }
  }, [selectedChat, loadMessages]);

  const handleLogin = async (email, password) => {
    if (!isValidEmail(email)) {
      alert("Invalid email.");
      return;
    }
    if (!password) {
      alert("Enter password.");
      return;
    }
    try {
      setLoading(true);
      await chatService.login(email, password);
      const u = chatService.getCurrentUser();
      setCurrentUser(u);
      setIsLoggedIn(true);
    } catch (e) {
      alert("Login failed: " + (e.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (email, password, name) => {
    if (!isValidName(name)) {
      alert("Invalid full name (>=2 words, >=2 letters each).");
      return;
    }
    if (!isValidEmail(email)) {
      alert("Invalid email.");
      return;
    }
    if (password.length < 8) {
      alert("Password min 8 chars.");
      return;
    }
    try {
      setLoading(true);
      await chatService.signup(email, password, name.trim());
      const u = chatService.getCurrentUser();
      setCurrentUser(u);
      setIsLoggedIn(true);
    } catch (e) {
      let msg = "Signup failed: ";
      if (e.data?.data?.email?.code === "validation_invalid_email")
        msg += "Server rejected email.";
      else if (e.data?.data?.password?.code === "validation_length_too_short")
        msg += "Pass too short.";
      else msg += e.data?.message || e.message;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await chatService.logout();
    } catch (e) {
      console.error("Logout err:", e);
    } finally {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setSelectedChat(null);
      setChats([]);
      setMessages([]);
      setShowUserList(false);
      setShowSidebar(true);
      setContacts([]);
      setUnreadCounts({});
      setTypingUsers({});
    }
  };
  
  const handlePasswordReset = async (email, setView) => {
    if (!isValidEmail(email)) {
      alert("Invalid email.");
      return;
    }
    try {
      setLoading(true);
      await chatService.requestPasswordReset(email);
      alert("Reset email sent!");
      setView("login");
    } catch (e) {
      alert("Error sending reset: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const startChatWithUser = async (userId) => {
    if (currentUser && userId === currentUser.id) {
      alert("Cannot chat yourself.");
      return;
    }
    const existingChat = chats.find(
      (c) => !c.isGroup && c.expand?.participants?.length === 2 && c.expand.participants.some((p) => p.id === userId)
    );
    if (existingChat) {
      const name = getOtherUser(existingChat)?.displayName || "user";
      alert(`Chat with ${name} exists.`);
      handleSelectChat(existingChat);
      setShowUserList(false);
      setShowSidebar(false);
      setSearchEmail("");
      setSearchResultUser(null);
      setSearchMessage("");
      return;
    }
    if (creatingChatLock.current) return;
    if (!currentUser) return;
    try {
      creatingChatLock.current = true;
      setLoading(true);
      const chat = await chatService.getOrCreateChat(userId);
      await loadChats();
      const freshChat = await chatService.pb.collection("chats").getOne(chat.id, { expand: "participants" });
      setSelectedChat(freshChat || chat);
      setShowUserList(false);
      setShowSidebar(false);
      setSearchEmail("");
      setSearchResultUser(null);
      setSearchMessage("");
    } catch (e) {
      console.error("Start chat err:", e);
      alert("Start chat error: " + e.message);
      setSelectedChat(null);
    } finally {
      setLoading(false);
      creatingChatLock.current = false;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const msg = newMessage;
    const replyToId = replyingTo?.id || null;
    setNewMessage("");
    setReplyingTo(null);

    try {
      await chatService.sendMessage(selectedChat.id, msg, "text", null, replyToId);
    } catch (e) {
      alert("Send err: " + e.message);
      setNewMessage(msg);
      if (replyToId) {
        const originalReplyMsg = messages.find((m) => m.id === replyToId);
        if (originalReplyMsg) setReplyingTo(originalReplyMsg);
      }
    }
  };

  const handleSendFile = async (e) => {
    if (!selectedChat) return;
    const f = e.target.files[0];
    if (!f) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    let t = f.type.startsWith("image/") ? "image" : "file";
    const replyToId = replyingTo?.id || null;
    setReplyingTo(null);

    try {
      await chatService.sendMessage(selectedChat.id, f.name, t, f, replyToId);
    } catch (e) {
      alert("Send file err: " + e.message);
    }
  };

  const handleAvatarChange = async (e) => {
    const f = e.target.files[0];
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (!f) return;
    try {
      setLoading(true);
      const u = await chatService.updateUserAvatar(f);
      setCurrentUser(u);
    } catch (e) {
      alert("Avatar update failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangeName = async () => {
    const n = currentUser?.displayName || currentUser?.email || "";
    const newN = prompt("New name:", n);
    if (newN && newN.trim() !== "" && newN.trim() !== n) {
      try {
        setLoading(true);
        const u = await chatService.updateDisplayName(newN.trim());
        setCurrentUser(u);
      } catch (e) {
        alert("Name update failed: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleDeleteChat = async (chatId, chatName) => {
    if (window.confirm(`Delete chat history with ${chatName}?`)) {
      try {
        setLoading(true);
        await chatService.deleteChat(chatId);
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
          setMessages([]);
          setShowSidebar(true);
        }
        await loadChats();
      } catch (e) {
        alert("Failed delete chat: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleAddContact = async (userIdToAdd) => {
    if (!userIdToAdd || userIdToAdd === currentUser?.id) return;
    setLoading(true);
    try {
      const r = await chatService.addContact(userIdToAdd);
      if (r === null) alert("Contact exists.");
      else {
        await loadContacts();
        alert("Contact added!");
        setSearchEmail("");
        setSearchResultUser(null);
        setSearchMessage("");
      }
    } catch (e) {
      alert("Failed add contact: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteContact = async (contactUserId, contactName) => {
    if (window.confirm(`Remove ${contactName}?`)) {
      setLoading(true);
      try {
        await chatService.deleteContact(contactUserId);
        await loadContacts();
      } catch (e) {
        alert("Failed delete contact: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleSearchEmail = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setLoading(true);
    setSearchResultUser(null);
    setSearchMessage("");
    try {
      const u = await chatService.searchUserByEmail(searchEmail.trim());
      if (u) setSearchResultUser(u);
      else setSearchMessage(`User ${searchEmail} not found.`);
    } catch (e) {
      console.error("Email search err:", e);
      setSearchMessage("An error occurred.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleChatBgChange = (bgClass, pattern) => {
    setChatBgClass(bgClass);
    setChatBgPattern(pattern);
    localStorage.setItem("chatBgClass", bgClass);
    localStorage.setItem("chatBgPattern", pattern);
    setShowChatSettings(false);
  };
  
  const handleDeleteAccount = async () => {
    if (window.confirm("DELETE ACCOUNT? Permanent.")) {
      if (window.confirm("Second confirm: Really delete?")) {
        setLoading(true);
        try {
          await chatService.deleteCurrentUserAccount();
          alert("Account deleted.");
          setIsLoggedIn(false);
          setCurrentUser(null);
          setSelectedChat(null);
          setChats([]);
          setMessages([]);
          setContacts([]);
          setShowUserList(false);
          setShowSidebar(true);
          setUnreadCounts({});
          setTypingUsers({});
        } catch (e) {
          alert("Failed delete account: " + e.message);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm("Delete this message? This will delete it for everyone.")) {
      try {
        await chatService.deleteMessage(messageId);
      } catch (error) {
        alert("Failed to delete message: " + error.message);
      }
    }
  };

  const handleEditMessage = async (messageId, oldContent) => {
    try {
      const latestMsg = await chatService.pb.collection("messages").getOne(messageId);
      if (latestMsg.isRead) {
        alert("Message cannot be edited because it has already been read.");
        return;
      }
      const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000;
      const messageCreatedTime = new Date(latestMsg.created).getTime();
      if (Date.now() - messageCreatedTime > EDIT_TIME_LIMIT_MS) {
        alert("Message cannot be edited (15-minute window expired).");
        return;
      }
      const newContent = prompt("Edit your message:", oldContent);
      if (newContent && newContent.trim() !== "" && newContent.trim() !== latestMsg.content) {
        await chatService.editMessage(messageId, newContent.trim());
      }
    } catch (error) {
      alert("Failed to edit message: " + error.message);
    }
  };

  // ✅ FIXED: Reply Handler - No @You text added
  const handleReply = (message) => {
    setReplyingTo(message);
  };

  // ✅ FIXED: React Handler - Direct DB update
  const handleReact = async (messageId, emoji) => {
    try {
      await chatService.pb.collection('messages').update(messageId, { reaction: emoji });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: emoji } : m));
    } catch (error) {
      console.error("Reaction failed:", error);
      alert("Reaction failed: " + error.message);
    }
  };

  // ✅ FIXED: Forward Handler - Proper implementation
  const handleForward = async (message) => {
    if (!selectedChat) return;
    try {
      await chatService.sendMessage(selectedChat.id, message.content, message.type, null, null, true);
      alert("Message forwarded successfully!");
    } catch (e) {
      console.error("Forwarding failed:", e);
      alert("Forward failed: " + e.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onSignup={handleSignup}
        loading={loading}
        onPasswordReset={handlePasswordReset}
      />
    );
  }

  return (
    <div className={`flex h-screen bg-gray-100 overflow-hidden ${isDarkMode ? "dark" : ""}`}>
      <div className={`${showSidebar ? "w-full md:w-96" : "hidden md:block md:w-96"} bg-white border-r flex flex-col`}>
        <div className="p-3 bg-teal-700 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div onClick={() => avatarInputRef.current.click()} className="cursor-pointer group relative flex-shrink-0" title="Change profile picture">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-teal-700 font-bold overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={chatService.getFileUrl(currentUser, currentUser.avatar)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <User size={20} className="text-white" />
              </div>
            </div>
            <h3 className="font-medium text-white text-lg truncate">{currentUser?.displayName || currentUser?.email}</h3>
          </div>
          <div className="flex gap-4 items-center flex-shrink-0">
            <button onClick={() => { setShowUserList(true); setShowSidebar(true); }} className="hover:bg-teal-600 p-2 rounded-full transition" title="New Chat / Contacts">
              <Plus size={22} />
            </button>
            <HeadlessMenu as="div" className="relative inline-block text-left">
              <div>
                <HeadlessMenu.Button className="hover:bg-teal-600 p-2 rounded-full transition text-white">
                  <MoreVertical size={22} />
                </HeadlessMenu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                  <div className="px-1 py-1">
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={() => avatarInputRef.current.click()} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          <User className="mr-2 h-5 w-5" />
                          Change Avatar
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={handleChangeName} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          <Edit2 className="mr-2 h-5 w-5" />
                          Change Name
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          {isDarkMode ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
                          Toggle Theme
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={() => setShowChatSettings(true)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          <Palette className="mr-2 h-5 w-5" />
                          Change Background
                        </button>
                      )}
                    </MenuItem>
                  </div>
                  <div className="px-1 py-1">
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={handleDeleteAccount} className={`${active ? "bg-red-600 text-white" : "text-red-600"} group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium`}>
                          <Trash2 className="mr-2 h-5 w-5" />
                          Delete Account
                        </button>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <button onClick={handleLogout} className={`${active ? "bg-red-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                          <LogOut className="mr-2 h-5 w-5" />
                          Logout
                        </button>
                      )}
                    </MenuItem>
                  </div>
                </HeadlessMenu.Items>
              </Transition>
            </HeadlessMenu>
          </div>
        </div>
        {showUserList ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="p-3 bg-gray-50 border-b flex items-center gap-2 z-10 flex-shrink-0">
              <button onClick={() => { setShowUserList(false); setSearchEmail(""); setSearchResultUser(null); setSearchMessage(""); }} className="p-2 hover:bg-gray-200 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-800">New Chat / Add Contact</h3>
            </div>
            <div className="p-2 border-b flex-shrink-0">
              <form onSubmit={handleSearchEmail} className="flex items-center gap-2">
                <input type="email" placeholder="Search or add user by email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className="flex-1 px-3 py-2 border rounded-md outline-none focus:border-teal-500 text-sm" disabled={loading} />
                <button type="submit" className="p-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50" disabled={loading || !searchEmail.trim()}>
                  <Search size={18} />
                </button>
              </form>
            </div>
            <div className="p-4 border-b min-h-[100px] flex-shrink-0">
              {loading && <p className="text-gray-500 text-sm text-center">Searching...</p>}
              {searchMessage && !loading && <p className="text-red-500 text-sm text-center">{searchMessage}</p>}
              {searchResultUser && !loading && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
                    {searchResultUser.avatar ? (
                      <img src={chatService.getFileUrl(searchResultUser, searchResultUser.avatar)} alt={searchResultUser.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{searchResultUser.displayName?.[0]?.toUpperCase() || searchResultUser.email?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{searchResultUser.displayName || searchResultUser.email}</h3>
                  </div>
                  <button onClick={() => handleAddContact(searchResultUser.id)} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm hover:bg-green-200 flex items-center gap-1">
                    <UserPlus size={16} /> Add
                  </button>
                </div>
              )}
              {!searchResultUser && !searchMessage && !loading && <p className="text-gray-400 text-sm text-center">Enter email to find user.</p>}
            </div>
            <div className="p-2 pt-4 text-xs text-teal-700 font-semibold uppercase border-b bg-gray-50 flex-shrink-0">My Contacts</div>
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 && !loading && <p className="text-center text-gray-500 p-4">No contacts added yet.</p>}
              {contacts.map((contact) => {
                const user = contact.expand?.contactUser;
                if (!user) return null;
                return (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition border-b border-gray-100 relative group">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium overflow-hidden flex-shrink-0">
                      {user.avatar ? (
                        <img src={chatService.getFileUrl(user, user.avatar)} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startChatWithUser(user.id)}>
                      <h3 className="font-medium text-gray-900 truncate">{user.displayName || user.email}</h3>
                      <p className="text-sm text-gray-500">
                        {user.status === "online" ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                            Online
                          </span>
                        ) : (
                          "Offline"
                        )}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteContact(user.id, user.displayName || user.email); }} className="absolute top-1 right-1 p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Remove Contact">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="p-2 bg-gray-50 border-b flex-shrink-0">
              <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg">
                <Search size={18} className="text-gray-500" />
                <input type="text" placeholder="Search chats" className="bg-transparent outline-none flex-1 text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              {loading && chats.length === 0 ? (
                <div className="p-8 text-center text-gray-500"><p>Loading chats...</p></div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="mb-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User size={32} className="text-gray-400" />
                    </div>
                    <p className="text-sm">No chats yet</p>
                  </div>
                  <button onClick={() => { setShowUserList(true); setShowSidebar(true); }} className="bg-teal-600 text-white px-6 py-2 rounded-full hover:bg-teal-700 transition">
                    Start chatting
                  </button>
                </div>
              ) : (
                chats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  if (!otherUser) return null;
                  const unreadCount = unreadCounts[chat.id] || 0;
                  return (
                    <div key={chat.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 active:bg-gray-100 transition relative group ${selectedChat?.id === chat.id ? "bg-gray-100" : "bg-white"}`}>
                      <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 overflow-hidden">
                        {otherUser.avatar ? (
                          <img src={chatService.getFileUrl(otherUser, otherUser.avatar)} alt={otherUser.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{otherUser.displayName?.[0]?.toUpperCase() || otherUser.email?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectChat(chat)}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{otherUser.displayName || otherUser.email}</h3>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatChatTime(chat.lastMessageTime)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600 truncate pr-2">{chat.lastMessage || "Tap to start"}</p>
                          {unreadCount > 0 && (
                            <span className="bg-teal-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id, otherUser.displayName || otherUser.email); }} className="absolute top-1 right-1 p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Delete Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
      {selectedChat ? (
        <ChatWindow
          handleDeleteMessage={handleDeleteMessage}
          handleEditMessage={handleEditMessage}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          handleReply={handleReply}
          handleReact={handleReact}
          handleForward={handleForward}
          handleChangeName={handleChangeName}
          handleAvatarClick={() => avatarInputRef.current.click()}
          setIsDarkMode={setIsDarkMode}
          isDarkMode={isDarkMode}
          handleLogout={handleLogout}
          chatBgClass={chatBgClass}
          chatBgPattern={chatBgPattern}
          setShowChatSettings={setShowChatSettings}
          handleDeleteAccount={handleDeleteAccount}
          isOtherUserTyping={typingUsers[selectedChat.id]?.[getOtherUser(selectedChat)?.id] || false}
          chat={selectedChat}
          messages={messages}
          currentUser={currentUser}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
          onBack={() => setShowSidebar(true)}
          showSidebar={showSidebar}
          getOtherUser={getOtherUser}
          formatTime={formatTime}
          messagesEndRef={messagesEndRef}
          onSendFileClick={() => fileInputRef.current.click()}
        />
      ) : (
        <div className={`${showSidebar ? "hidden md:flex" : "flex"} flex-1 items-center justify-center bg-gray-50`}>
          <div className="text-center max-w-md">
            <div className="w-64 h-64 mx-auto mb-8 bg-teal-50 rounded-full flex items-center justify-center">
              <User size={96} className="text-teal-600" />
            </div>
            <h2 className="text-3xl font-light text-gray-700 mb-3">ChatApp</h2>
            <p className="text-gray-500 mb-6">Select a chat or start one.</p>
            <button onClick={() => { setShowUserList(true); setShowSidebar(true); }} className="bg-teal-600 text-white px-8 py-3 rounded-full hover:bg-teal-700 transition">
              Start New Chat
            </button>
          </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} onChange={handleSendFile} style={{ display: "none" }} />
      <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} style={{ display: "none" }} accept="image/png, image/jpeg, image/gif" />
      {showChatSettings && (
        <ChatSettings
          currentBgClass={chatBgClass}
          onChangeBg={handleChatBgChange}
          onClose={() => setShowChatSettings(false)}
        />
      )}
    </div>
  );
}

function ChatWindow({
  chat, messages, currentUser, newMessage, setNewMessage, onSendMessage, onBack, showSidebar, getOtherUser, formatTime, messagesEndRef, onSendFileClick,
  handleChangeName, handleAvatarClick, setIsDarkMode, isDarkMode, handleLogout, chatBgClass, chatBgPattern, setShowChatSettings, handleDeleteAccount,
  isOtherUserTyping, handleDeleteMessage, handleEditMessage, replyingTo, setReplyingTo, handleReply, handleReact, handleForward,
}) {
  const otherUser = getOtherUser(chat);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    chatService.updateUserTypingStatus(chat.id);
    typingTimeoutRef.current = setTimeout(() => {
      chatService.updateUserTypingStatus(null);
    }, 2000);
  };
  
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      chatService.updateUserTypingStatus(null);
    };
  }, [chat.id]);
  
  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const onReactionEmojiClick = (emojiObject) => {
    if (reactionPickerMsgId) {
      handleReact(reactionPickerMsgId, emojiObject.emoji);
    }
    setReactionPickerMsgId(null);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      const btn = document.getElementById("emoji-toggle-button");
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !(btn && btn.contains(event.target))) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerRef]);
  
  if (!otherUser) {
    return (
      <div className={`${showSidebar ? "hidden md:flex" : "flex"} flex-1 items-center justify-center`}>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className={`${showSidebar ? "hidden md:flex" : "flex"} flex-1 flex-col relative bg-white`}>
      <div className="bg-gray-100 border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-2 hover:bg-gray-200 rounded-full">
          <Menu size={20} />
        </button>
        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-medium cursor-pointer overflow-hidden flex-shrink-0">
          {otherUser?.avatar ? (
            <img src={chatService.getFileUrl(otherUser, otherUser.avatar)} alt={otherUser.displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{otherUser?.displayName?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 cursor-pointer min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{otherUser?.displayName || otherUser?.email}</h3>
          <p className="text-xs text-gray-500 h-4">
            {isOtherUserTyping ? (
              <span className="text-green-600 animate-pulse">typing...</span>
            ) : otherUser?.status === "online" ? (
              <span className="text-green-600">Online</span>
            ) : (
              `Last seen ${formatTime(otherUser?.lastSeen || "")}`
            )}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-4 flex-shrink-0">
          <button className="p-2 hover:bg-gray-200 rounded-full">
            <Video size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full">
            <Phone size={20} className="text-gray-600" />
          </button>
          <HeadlessMenu as="div" className="relative inline-block text-left md:hidden">
            <div>
              <HeadlessMenu.Button className="p-2 hover:bg-gray-200 rounded-full transition text-gray-600">
                <MoreVertical size={20} />
              </HeadlessMenu.Button>
            </div>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
              <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                <div className="px-1 py-1">
                  <MenuItem>
                    {({ active }) => (
                      <button onClick={handleAvatarClick} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                        <User className="mr-2 h-5 w-5" />
                        Change Avatar
                      </button>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button onClick={handleChangeName} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                        <Edit2 className="mr-2 h-5 w-5" />
                        Change Name
                      </button>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                        {isDarkMode ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
                        Toggle Theme
                      </button>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button onClick={() => setShowChatSettings(true)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                        <Palette className="mr-2 h-5 w-5" />
                        Change Background
                      </button>
                    )}
                  </MenuItem>
                </div>
                <div className="px-1 py-1">
                  <MenuItem>
                    {({ active }) => (
                      <button onClick={handleDeleteAccount} className={`${active ? "bg-red-600 text-white" : "text-red-600"} group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium`}>
                        <Trash2 className="mr-2 h-5 w-5" />
                        Delete Account
                      </button>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button onClick={handleLogout} className={`${active ? "bg-red-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                        <LogOut className="mr-2 h-5 w-5" />
                        Logout
                      </button>
                    )}
                  </MenuItem>
                </div>
              </HeadlessMenu.Items>
            </Transition>
          </HeadlessMenu>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${chatBgClass}`} style={{ backgroundImage: chatBgPattern }}>
        {messages.map((msg) => {
          const isCurrentUser = msg.sender === currentUser.id;
          const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000;
          const messageCreatedTime = new Date(msg.created).getTime();
          const isTimeLimitValid = Date.now() - messageCreatedTime <= EDIT_TIME_LIMIT_MS;
          const repliedMessage = msg.expand?.replyToId;
          const isForwarded = msg.isForwarded;

          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] sm:max-w-md md:max-w-lg px-3 py-2 rounded-lg shadow relative group ${isCurrentUser ? "bg-[#d9fdd3]" : "bg-white"}`} style={{ borderRadius: "7.5px" }}>
                {isForwarded && (
                  <p className="text-[10px] text-teal-600 font-medium mb-1 flex items-center gap-1">
                    <CornerUpRight size={12} /> Forwarded
                  </p>
                )}
                {repliedMessage && (
                  <div className={`border-l-4 border-teal-500 pl-2 mb-1 text-xs text-gray-500 ${isCurrentUser ? "bg-[#c6f3c1]" : "bg-gray-100"} rounded-sm p-1`}>
                    <p className="font-semibold truncate text-teal-700">
                      {repliedMessage.sender === currentUser.id ? "You" : repliedMessage.senderName || "User"}
                    </p>
                    <p className="text-gray-600 truncate">{repliedMessage.content}</p>
                  </div>
                )}
                {isCurrentUser && (
                  <HeadlessMenu as="div" className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <HeadlessMenu.Button className="p-1 bg-gray-100 rounded-full shadow hover:bg-gray-200">
                      <ChevronDown size={14} className="text-gray-600" />
                    </HeadlessMenu.Button>
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                      <HeadlessMenu.Items className="absolute right-0 mt-1 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-1 py-1">
                          <MenuItem>
                            {({ active }) => (
                              <button onClick={() => handleReply(msg)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                                <CornerUpLeft size={14} className="mr-2" />
                                Reply
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ active }) => (
                              <button onClick={() => handleForward(msg)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                                <CornerUpRight size={14} className="mr-2" />
                                Forward
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ active }) => (
                              <button onClick={() => setReactionPickerMsgId(msg.id)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                                <Smile size={14} className="mr-2" />
                                React
                              </button>
                            )}
                          </MenuItem>
                          {msg.type === "text" && isTimeLimitValid && !msg.isRead && (
                            <MenuItem>
                              {({ active }) => (
                                <button onClick={() => handleEditMessage(msg.id, msg.content)} className={`${active ? "bg-teal-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                                  <Edit size={14} className="mr-2" />
                                  Edit
                                </button>
                              )}
                            </MenuItem>
                          )}
                          <MenuItem>
                            {({ active }) => (
                              <button onClick={() => handleDeleteMessage(msg.id)} className={`${active ? "bg-red-500 text-white" : "text-gray-900"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                                <Trash2 size={14} className="mr-2" />
                                Delete
                              </button>
                            )}
                          </MenuItem>
                        </div>
                      </HeadlessMenu.Items>
                    </Transition>
                  </HeadlessMenu>
                )}
                {msg.type === "image" && msg.file ? (
                  <img src={chatService.getFileUrl(msg, msg.file)} alt="Sent file" className="rounded-md my-1 max-w-full h-auto object-contain cursor-pointer block" onClick={() => window.open(chatService.getFileUrl(msg, msg.file), "_blank")} />
                ) : msg.type === "file" && msg.file ? (
                  <a href={chatService.getFileUrl(msg, msg.file)} target="_blank" rel="noopener noreferrer" className="text-sm break-words text-blue-600 hover:underline flex items-center gap-2 bg-gray-100 p-2 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" />
                    </svg>
                    <span className="truncate">{msg.content}</span>
                  </a>
                ) : (
                  <p className="text-sm break-words">{msg.content}</p>
                )}
                {msg.reaction && (
                  <span className={`absolute ${isCurrentUser ? "-bottom-2 -left-2 bg-gray-50" : "-bottom-2 -right-2 bg-[#d9fdd3]"} text-lg leading-none p-[2px] rounded-full shadow-md border border-gray-200 z-10`}>
                    {msg.reaction}
                  </span>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  {msg.isEdited && <span className="text-[10px] text-gray-500 mr-1">(edited)</span>}
                  <span className="text-[11px] text-gray-500">{formatTime(msg.created)}</span>
                  {isCurrentUser && (
                    <svg className={`w-4 h-4 ${msg.isRead ? "text-blue-500" : "text-gray-500"}`} viewBox="0 0 16 15" fill="currentColor">
                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-[60px] z-10" style={{ left: "10px" }}>
          <EmojiPicker onEmojiClick={onEmojiClick} height={350} width="100%" />
        </div>
      )}

      {reactionPickerMsgId && (
        <div className="absolute z-50 p-2 bg-white shadow-xl rounded-xl" style={{ bottom: "120px", right: "10px" }}>
          <p className="text-center text-xs text-gray-500 mb-2">Select Reaction</p>
          <EmojiPicker onEmojiClick={onReactionEmojiClick} height={350} width="100%" />
        </div>
      )}

      <div className="bg-gray-100 px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0">
        {replyingTo && (
          <div className="flex items-center justify-between p-2 bg-gray-200 rounded-t-lg border-b border-gray-300 -mb-1">
            <div className="text-sm truncate">
              <p className="font-semibold text-teal-700">
                Replying to: {replyingTo.sender === currentUser.id ? "You" : getOtherUser(chat)?.displayName || "User"}
              </p>
              <p className="text-gray-600 truncate">
                {replyingTo.content.substring(0, 50)}{replyingTo.content.length > 50 ? "..." : ""}
              </p>
            </div>
            <button onClick={() => { setReplyingTo(null); setNewMessage(""); }} className="p-1 text-gray-500 hover:text-red-500 flex-shrink-0" title="Cancel Reply">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 sm:gap-2">
          <button id="emoji-toggle-button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-200 rounded-full transition">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z" />
            </svg>
          </button>
          <button onClick={onSendFileClick} className="p-2 hover:bg-gray-200 rounded-full transition">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onInput={handleTyping} onKeyPress={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }} placeholder="Type a message" className="flex-1 px-4 py-2 bg-white rounded-full outline-none text-sm border border-transparent focus:border-teal-500" />
          <button onClick={onSendMessage} className="bg-teal-600 text-white p-2 sm:p-3 rounded-full hover:bg-teal-700 transition disabled:opacity-50" disabled={!newMessage.trim()}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onSignup, loading, onPasswordReset }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (view === "login") {
      onLogin(email, password);
    } else if (view === "signup") {
      onSignup(email, password, name);
    }
  };
  
  const handleResetRequest = (e) => {
    e.preventDefault();
    if (email) onPasswordReset(email, setView);
    else alert("Please enter email.");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">ChatApp</h1>
          <p className="text-gray-600 mt-2">
            {view === "login" ? "Welcome back" : view === "signup" ? "Create account" : "Reset password"}
          </p>
        </div>
        {view === "forgot" ? (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">Enter email for reset link.</p>
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" disabled={loading} />
            <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50">
              {loading ? "Wait..." : "Send Link"}
            </button>
            <div className="text-center mt-6">
              <button type="button" onClick={() => setView("login")} className="text-teal-600 hover:underline" disabled={loading}>
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {view === "signup" && (
                <input type="text" required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" disabled={loading} />
              )}
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" disabled={loading} />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600" disabled={loading} />
              <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50">
                {loading ? "Wait..." : view === "login" ? "Login" : "Sign Up"}
              </button>
            </form>
            {view === "login" && (
              <div className="text-center mt-4">
                <button type="button" onClick={() => setView("forgot")} className="text-sm text-gray-500 hover:text-teal-600 hover:underline" disabled={loading}>
                  Forgot Password?
                </button>
              </div>
            )}
            <div className="text-center mt-6">
              <button type="button" onClick={() => setView(view === "login" ? "signup" : "login")} className="text-teal-600 hover:underline" disabled={loading}>
                {view === "login" ? "No account? Sign Up" : "Have account? Login"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;