import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState("initial"); // initial | login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(""); // "" | "checking" | "available" | "taken" | "short"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Генерация случайного имени для анонимов
  const generateRandomUsername = (length = 10) => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "anon_" + result;
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const credential = await signInAnonymously(auth);
      const user = credential.user;

      const randomName = generateRandomUsername();

      await updateProfile(user, { displayName: randomName });

      await setDoc(doc(db, "users", user.uid), {
        username: randomName,
        displayName: randomName,
        isAnonymous: true,
        createdAt: serverTimestamp(),
        online: true,
        photoURL: null,
      });

      // Важно: НЕ резервируем в usernames — анонимы не занимают нормальные ники
      onSuccess();
    } catch (err) {
      setError(err.message || "Ошибка анонимного входа");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  // Проверка username ТОЛЬКО в режиме регистрации
  useEffect(() => {
    if (mode !== "register" || !username) {
      setUsernameStatus("");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("short");
      return;
    }

    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const lower = username.trim().toLowerCase();
        const usernameRef = doc(db, "usernames", lower);
        const snap = await getDoc(usernameRef);

        setUsernameStatus(snap.exists() ? "taken" : "available");
      } catch (err) {
        console.error("Ошибка проверки ника:", err);
        setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (usernameStatus !== "available") {
      setError(
        usernameStatus === "short"
          ? "Никнейм минимум 3 символа"
          : usernameStatus === "taken"
          ? "Этот никнейм уже занят"
          : "Проверьте никнейм"
      );
      setLoading(false);
      return;
    }

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = credential.user;
      await user.getIdToken(true);
      const trimmed = username.trim();
      const lower = trimmed.toLowerCase();
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Резервируем ник в usernames (только для зарегистрированных)
      await setDoc(doc(db, "usernames", lower), {
        uid: user.uid,
        username: trimmed,
        createdAt: serverTimestamp(),
      });

      await updateProfile(user, { displayName: trimmed });

      await setDoc(doc(db, "users", user.uid), {
        username: trimmed,
        displayName: trimmed,
        email: user.email,
        isAnonymous: false,
        createdAt: serverTimestamp(),
        online: true,
        photoURL: null,
      });

      onSuccess();
    } catch (err) {
      setError(err.message || "Ошибка регистрации");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  if (mode === "initial") {
    return (
      <div
        style={{
          maxWidth: "420px",
          margin: "60px auto",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: "32px" }}>messenger</h1>

        <button
          onClick={handleAnonymousLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "16px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {loading ? "Вход..." : "Войти анонимно"}
        </button>

        <div style={{ margin: "24px 0", color: "#777" }}>или</div>

        <button
          onClick={() => setMode("login")}
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "12px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Войти по email и паролю
        </button>

        <button
          onClick={() => setMode("register")}
          style={{
            width: "100%",
            padding: "14px",
            background: "transparent",
            color: "#1976d2",
            border: "2px solid #1976d2",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Зарегистрироваться
        </button>
      </div>
    );
  }

  if (mode === "login") {
    return (
      <div style={{ maxWidth: "400px", margin: "40px auto", padding: "24px" }}>
        <h2>Вход</h2>
        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          {error && <div style={{ color: "red" }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "8px",
            }}
          >
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
        <button
          onClick={() => setMode("initial")}
          style={{
            marginTop: "16px",
            background: "none",
            border: "none",
            color: "#1976d2",
            cursor: "pointer",
          }}
        >
          ← Назад
        </button>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div style={{ maxWidth: "400px", margin: "40px auto", padding: "24px" }}>
        <h2>Регистрация</h2>
        <form
          onSubmit={handleRegister}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Username (минимум 3 символа)"
              value={username}
              onChange={(e) => setUsername(e.target.value.trimStart())}
              required
              style={{
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                width: "100%",
              }}
            />

            {usernameStatus === "checking" && (
              <small
                style={{
                  color: "gray",
                  position: "absolute",
                  right: "12px",
                  top: "14px",
                }}
              >
                проверка...
              </small>
            )}
            {usernameStatus === "available" && (
              <small
                style={{
                  color: "green",
                  position: "absolute",
                  right: "12px",
                  top: "14px",
                }}
              >
                ✓ свободен
              </small>
            )}
            {usernameStatus === "taken" && (
              <small
                style={{
                  color: "red",
                  position: "absolute",
                  right: "12px",
                  top: "14px",
                }}
              >
                ✗ занят
              </small>
            )}
            {usernameStatus === "short" && username.length > 0 && (
              <small
                style={{ color: "orange", display: "block", marginTop: "4px" }}
              >
                Минимум 3 символа
              </small>
            )}
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          <input
            type="password"
            placeholder="Пароль (минимум 6 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          {error && <div style={{ color: "red" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading || usernameStatus !== "available"}
            style={{
              padding: "14px",
              background: usernameStatus === "available" ? "#4CAF50" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "8px",
            }}
          >
            {loading ? "Создаём..." : "Зарегистрироваться"}
          </button>
        </form>

        <button
          onClick={() => setMode("initial")}
          style={{
            marginTop: "16px",
            background: "none",
            border: "none",
            color: "#1976d2",
            cursor: "pointer",
          }}
        >
          ← Назад
        </button>
      </div>
    );
  }

  return null;
}
