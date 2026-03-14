// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import AdminPanel from "./AdminPanel";
import AuthScreen from "./AuthScreen";
import ChatsList from "./ChatsList";
import ChatScreen from "./ChatScreen";
import Profile from "./Profile";
import SearchUsers from "./SearchUsers"; // ← новый компонент
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "grid",
          placeItems: "center",
          fontSize: "1.2rem",
        }}
      >
        Загрузка...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/search-users"
          element={
            user ? <SearchUsers user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/"
          element={user ? <Navigate to="/chats" replace /> : <AuthScreen />}
        />
        <Route
          path="/admin-panel"
          element={
            user ? <AdminPanel user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/chats"
          element={
            user ? <ChatsList user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            user ? <ChatScreen user={user} /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/profile"
          element={user ? <Profile user={user} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
