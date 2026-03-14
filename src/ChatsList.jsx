import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  getDoc,
  getDocs, // ← добавлен импорт getDocs
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function ChatsList({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [lastMessage, setLastMessage] = useState({
    text: "Загрузка...",
    time: "...",
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const isAuthenticated = !!user && !user.isAnonymous;

  // 1. Получаем последнее сообщение в реальном времени
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setLastMessage({
          text: "Пока нет сообщений",
          time: "—",
        });
        return;
      }

      const msg = snapshot.docs[0].data();
      let text = msg.text || "";

      if (!text) {
        if (msg.type === "image") text = "📸 Фото";
        else if (msg.type === "audio") text = "🎤 Голосовое";
        else text = "Сообщение";
      }

      // форматируем время
      const msgTime = msg.createdAt?.toDate?.() || new Date();
      const diffMs = Date.now() - msgTime.getTime();
      let timeStr = "только что";

      if (diffMs > 60000) {
        const min = Math.floor(diffMs / 60000);
        timeStr = min < 60 ? `${min} мин` : `${Math.floor(min / 60)} ч`;
      }

      setLastMessage({ text, time: timeStr });
    });

    return () => unsubscribe();
  }, []);

  // 2. Считаем непрочитанные сообщения (только для авторизованных)
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setUnreadCount(0);
      return;
    }

    // Получаем время последнего прочтения
    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) {
        setUnreadCount(0);
        return;
      }

      const data = snap.data();
      const lastRead = data.lastReadGeneralChat?.toMillis?.() || 0;

      // Слушаем все новые сообщения после lastRead
      const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

      const messagesSnap = await getDocs(q); // ← ИСПРАВЛЕНИЕ: getDocs вместо getDoc

      let count = 0;

      messagesSnap.forEach((docSnap) => {
        // ← docSnap вместо doc
        const msgTime = docSnap.data().createdAt?.toMillis?.() || 0;
        if (msgTime > lastRead && docSnap.data().uid !== user.uid) {
          count++;
        }
      });

      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthenticated]);

  const chats = [
    {
      id: "general",
      title: "Общий чат",
      lastMessage: lastMessage.text,
      time: lastMessage.time,
      unread: isAuthenticated ? unreadCount : 0,
      color: "#2563eb",
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Ошибка выхода:", err);
    }
  };

  return (
    <>
      {/* Основной контент занимает весь экран */}
      <div
        style={{
          height: "100dvh",
          maxWidth: "720px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          background: "#f8f9fa",
        }}
      >
        {/* Заголовок */}
        <header
          style={{
            padding: "16px 20px",
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Левая пустая зона для баланса (или кнопка назад позже) */}
          <div style={{ width: "44px" }} />

          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 600,
              flex: 1,
              textAlign: "center",
            }}
          >
            Чаты
          </h1>

          {/* Кнопка поиска справа */}
          <button
            onClick={() => navigate("/search-users")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
            }}
            title="Поиск людей"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
        </header>

        {/* Список чатов — прокручивается */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              style={{
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                borderBottom: "1px solid #e5e7eb",
                background: chat.unread > 0 ? "#eff6ff" : "white",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              {/* Аватар чата */}
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: chat.color,
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {chat.title[0]}
              </div>

              {/* Название + последнее сообщение */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: chat.unread > 0 ? 600 : 500,
                    fontSize: "1.1rem",
                    color: "#111827",
                  }}
                >
                  {chat.title}
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "0.95rem",
                    color: "#4b5563",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {chat.lastMessage}
                </div>
              </div>

              {/* Время + счётчик непрочитанных */}
              <div style={{ textAlign: "right", minWidth: "60px" }}>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  {chat.time}
                </div>

                {chat.unread > 0 && (
                  <div
                    style={{
                      marginTop: "4px",
                      background: "#2563eb",
                      color: "white",
                      borderRadius: "9999px",
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {chat.unread > 99 ? "99+" : chat.unread}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Нижняя панель навигации — всегда видна, фиксированная */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: "720px",
          margin: "0 auto",
          height: "64px",
          background: "white",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => navigate("/chats")}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: location.pathname === "/chats" ? "#2563eb" : "#6b7280",
            fontSize: "0.75rem",
            fontWeight: location.pathname === "/chats" ? 600 : 500,
            gap: "2px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
          Чаты
        </button>

        <button
          onClick={() => navigate("/profile")}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: location.pathname === "/profile" ? "#2563eb" : "#6b7280",
            fontSize: "0.75rem",
            fontWeight: location.pathname === "/profile" ? 600 : 500,
            gap: "2px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Профиль
        </button>
      </nav>
    </>
  );
}
