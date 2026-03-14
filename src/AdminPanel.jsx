// src/AdminPanel.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

export default function AdminPanel({ user }) {
  const navigate = useNavigate();
  const [targetUid, setTargetUid] = useState("");
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  // Реал-тайм список всех администраторов
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        uid: d.id,
        displayName: d.data().displayName || "Аноним",
      }));
      setAdmins(list);
    });
    return unsubscribe;
  }, []);

  const toggleAdmin = async () => {
    if (!targetUid.trim()) return alert("Введите UID");
    if (targetUid === user.uid) return alert("Нельзя изменить свои права");

    setLoading(true);
    try {
      const userRef = doc(db, "users", targetUid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert("Пользователь не найден");
        setLoading(false);
        return;
      }

      const currentRole = snap.data().role || "user";
      const newRole = currentRole === "admin" ? "user" : "admin";

      await updateDoc(userRef, { role: newRole });

      alert(
        newRole === "admin"
          ? "✅ Пользователь назначен администратором"
          : "✅ Права администратора сняты"
      );
      setTargetUid("");
    } catch (err) {
      alert("Ошибка: " + err.message);
    }
    setLoading(false);
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
      {/* Шапка */}
      <div
        style={{
          padding: "16px 20px",
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={() => navigate("/profile")}
          style={{
            background: "transparent",
            border: "none",
            fontSize: "1.8rem",
            cursor: "pointer",
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Управление администраторами</h1>
      </div>

      {/* Форма */}
      <div style={{ padding: "20px" }}>
        <input
          type="text"
          placeholder="Введите UID пользователя"
          value={targetUid}
          onChange={(e) => setTargetUid(e.target.value)}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "1rem",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        />
        <button
          onClick={toggleAdmin}
          disabled={loading || !targetUid.trim()}
          style={{
            width: "100%",
            padding: "14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "1.05rem",
            cursor: "pointer",
          }}
        >
          {loading ? "Обработка..." : "Подтвердить (назначить / снять админа)"}
        </button>
      </div>

      {/* Список администраторов */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
        <h3 style={{ margin: "20px 0 12px", color: "#374151" }}>
          Текущие администраторы ({admins.length})
        </h3>

        {admins.map((a) => (
          <div
            key={a.uid}
            style={{
              padding: "14px 18px",
              background: "white",
              borderRadius: "12px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#9ca3af",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                fontWeight: "bold",
              }}
            >
              {a.displayName[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{a.displayName}</div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{a.uid}</div>
            </div>
          </div>
        ))}

        {admins.length === 0 && (
          <p style={{ textAlign: "center", color: "#9ca3af", marginTop: "40px" }}>
            Пока нет администраторов
          </p>
        )}
      </div>
    </div>
  );
}