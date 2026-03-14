// src/SearchUsers.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export default function SearchUsers({ user }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [status, setStatus] = useState(""); // "" | "searching" | "not-found" | "error"

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setStatus("searching");
    setFoundUser(null);

    try {
      const lowerQuery = searchQuery.trim().toLowerCase();
      const usernameRef = doc(db, "usernames", lowerQuery);
      const snap = await getDoc(usernameRef);

      if (snap.exists()) {
        const data = snap.data();
        // Получаем информацию о пользователе
        const userRef = doc(db, "users", data.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setFoundUser({
            uid: data.uid,
            username: data.username,
            displayName: userSnap.data().displayName || data.username,
            photoURL: userSnap.data().photoURL || null,
          });
          setStatus("");
        } else {
          setStatus("not-found");
        }
      } else {
        setStatus("not-found");
      }
    } catch (err) {
      console.error("Ошибка поиска:", err);
      setStatus("error");
    }
  };

  return (
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
      {/* Заголовок + кнопка назад */}
      <header
        style={{
          padding: "16px 20px",
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "#2563eb",
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 600 }}>
          Поиск людей
        </h1>
      </header>

      {/* Форма поиска */}
      <form
        onSubmit={handleSearch}
        style={{
          padding: "16px 20px",
          background: "white",
          display: "flex",
          gap: "12px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Введите username..."
          style={{
            flex: 1,
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "1rem",
          }}
        />
        <button
          type="submit"
          disabled={status === "searching" || !searchQuery.trim()}
          style={{
            padding: "0 20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: 500,
            cursor: "pointer",
            opacity: status === "searching" || !searchQuery.trim() ? 0.6 : 1,
          }}
        >
          {status === "searching" ? "Поиск..." : "Найти"}
        </button>
      </form>

      {/* Результат */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        {status === "searching" && (
          <div style={{ textAlign: "center", color: "#6b7280" }}>Поиск...</div>
        )}

        {status === "not-found" && (
          <div style={{ textAlign: "center", color: "#6b7280" }}>
            Пользователь с таким username не найден
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center", color: "red" }}>
            Произошла ошибка при поиске
          </div>
        )}

        {foundUser && (
          <div
            onClick={() => {
              // Можно перейти в профиль пользователя или начать чат
              // Пока просто показываем информацию
              alert(
                `Найден пользователь: ${foundUser.displayName} (@${foundUser.username})`
              );
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: foundUser.photoURL ? "none" : "#60a5fa",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {foundUser.photoURL ? (
                <img
                  src={foundUser.photoURL}
                  alt="Аватар"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                    color: "white",
                  }}
                >
                  {foundUser.displayName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                {foundUser.displayName}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                @{foundUser.username}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
