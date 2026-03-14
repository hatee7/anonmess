import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
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
        boxShadow: "0 -2px 10px rgba(0,0,0,0.08)",
        zIndex: 100,
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
          gap: "3px",
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
          gap: "3px",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        Профиль
      </button>
    </div>
  );
}