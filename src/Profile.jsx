// src/Profile.jsx
import React, { useState, useEffect } from "react";
import { signOut, updateProfile } from "firebase/auth";
import { auth, db } from "./firebase"; // storage больше не нужен
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc, // если используешь
  serverTimestamp,
  // + любые другие, которые уже были или понадобятся
} from "firebase/firestore";
export default function Profile({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = user?.uid === "C4UFevZBEtYY2kA5cvqEB1QagED2";

  const [changeNameMode, setChangeNameMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [uploading, setUploading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("");
  // Локальное фото для мгновенного обновления
  const [localPhoto, setLocalPhoto] = useState(user?.photoURL || null);
  useEffect(() => {
    if (!newUsername || newUsername.length < 3) {
      setUsernameStatus(newUsername.length === 0 ? "" : "short");
      return;
    }

    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const lower = newUsername.trim().toLowerCase();
        const currentLower = (user?.displayName || "").trim().toLowerCase();

        if (lower === currentLower) {
          setUsernameStatus("same");
          return;
        }

        const ref = doc(db, "usernames", lower);
        const snap = await getDoc(ref);

        setUsernameStatus(snap.exists() ? "taken" : "available");
      } catch (err) {
        console.error(err);
        setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, user?.displayName]);
  // debounce-проверка
  useEffect(() => {
    // ... аналогично примеру выше
  }, [newUsername]);

  // Синхронизация с пропсом (если user изменится извне)
  useEffect(() => {
    if (user?.photoURL !== localPhoto) {
      setLocalPhoto(user?.photoURL || null);
    }
  }, [user?.photoURL]);
  const handleChangeUsername = async (e) => {
    e.preventDefault();
    if (usernameStatus !== "available") return;

    const trimmed = newUsername.trim();
    const lower = trimmed.toLowerCase();
    const oldLower = (user?.displayName || "").trim().toLowerCase();

    try {
      // 1. Удаляем старый ник (если был и отличается)
      if (oldLower && oldLower !== lower) {
        await deleteDoc(doc(db, "usernames", oldLower));
      }

      // 2. Создаём новый
      await setDoc(doc(db, "usernames", lower), {
        uid: user.uid,
        username: trimmed,
        updatedAt: serverTimestamp(),
      });

      // 3. Обновляем auth profile
      await updateProfile(auth.currentUser, { displayName: trimmed });

      // 4. Обновляем users/uid
      await updateDoc(doc(db, "users", user.uid), {
        username: trimmed,
        displayName: trimmed,
      });

      alert("Никнейм изменён!");
      setNewUsername("");
      setUsernameStatus("");
    } catch (err) {
      console.error("Ошибка смены ника:", err);
      if (err.code === "permission-denied") {
        alert("Никнейм уже занят кем-то другим");
      } else {
        alert("Ошибка: " + err.message);
      }
    }
  };
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    const oldUsernameLower = (user.displayName || "").trim().toLowerCase();
    const newUsernameLower = newUsername.trim().toLowerCase();
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Пожалуйста, выберите изображение");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 5 МБ)");
      return;
    }

    setUploading(true);

    try {
      // ─── Загрузка в ImgBB (точно так же, как в чате) ───────
      const formData = new FormData();
      formData.append("image", file);
      formData.append("key", "bab590d4a15c1417ab47ad6d722b58a2"); // твой ключ

      console.log("→ Отправляем в ImgBB...");

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const batch = writeBatch(db);
      const q = query(collection(db, "messages"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { photoURL });
      });

      await batch.commit().catch(console.error);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Ошибка ImgBB");
      }

      const photoURL = data.data.url; // прямая ссылка
      console.log("→ ImgBB URL:", photoURL);

      // Обновляем в Authentication
      await updateProfile(auth.currentUser, { photoURL });

      // Обновляем в Firestore (users/{uid})
      await updateDoc(doc(db, "users", user.uid), { photoURL });

      // Обновляем локально → аватар появится сразу
      setLocalPhoto(photoURL);

      alert("Аватар успешно обновлён!");
    } catch (err) {
      console.error("Ошибка загрузки аватара (ImgBB):", err);
      alert(
        "Не удалось загрузить фото: " + (err.message || "попробуйте снова")
      );
    } finally {
      setUploading(false);
    }
  };

  const handleChangeName = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      alert("Имя не может быть пустым");
      return;
    }
    if (displayName === user?.displayName) {
      setChangeNameMode(false);
      return;
    }

    try {
      await updateProfile(auth.currentUser, { displayName });
      await updateDoc(doc(db, "users", user.uid), { displayName });
      alert("Имя успешно изменено");
      setChangeNameMode(false);
    } catch (err) {
      console.error("Ошибка при смене имени:", err);
      alert("Не удалось изменить имя");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Ошибка выхода:", err);
    }
  };

  const photo = localPhoto;
  const name = user?.displayName || "Аноним";
  const email = user?.email || "—";

  return (
    <>
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
        <div
          style={{
            padding: "60px 20px 40px",
            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            color: "white",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Правая верхняя часть — кнопки */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setChangeNameMode(!changeNameMode)}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.22)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "20px",
                fontSize: "0.9rem",
                fontWeight: 500,
                cursor: "pointer",
                minWidth: "44px",
              }}
              title="Изменить имя"
            >
              ✎
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => navigate("/admin-panel")}
                style={{
                  padding: "6px 12px",
                  background: "rgba(255,255,255,0.22)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.4)",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                title="Управление администраторами"
              >
                ⭐
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.22)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Выйти
            </button>
          </div>

          {/* Аватар */}
          <div
            style={{
              position: "relative",
              width: "100px",
              height: "100px",
              margin: "0 auto 16px",
              cursor: uploading ? "wait" : "pointer",
            }}
            onClick={() =>
              !uploading && document.getElementById("avatar-input")?.click()
            }
            title="Нажмите, чтобы изменить аватар"
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: photo ? "none" : "#60a5fa",
                border: "4px solid white",
                overflow: "hidden",
                opacity: uploading ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {photo ? (
                <img
                  src={photo}
                  alt="Аватар"
                  crossOrigin="anonymous" // помогает с CORS-подобными блоками
                  loading="eager" // отключает lazy-loading
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    console.warn(
                      "Не удалось загрузить аватар из ImgBB, показываем fallback"
                    );
                    e.target.onerror = null; // предотвращаем бесконечный цикл
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      name || "Аноним"
                    )}&background=60a5fa&color=fff&size=128`;
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                    fontWeight: "bold",
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "4px",
                right: "4px",
                width: "32px",
                height: "32px",
                background: "#2563eb",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid white",
                color: "white",
                fontSize: "1.1rem",
              }}
            >
              {uploading ? "⌛" : "📷"}
            </div>

            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </div>

          <h2 style={{ margin: "0 0 4px", fontSize: "1.6rem" }}>{name}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "1rem" }}>{email}</p>
        </div>
        {changeNameMode && (
          <form
            onSubmit={handleChangeUsername} // ← новая функция
            style={{
              display: "flex",
              gap: "8px",
              padding: "16px 20px",
              background: "white",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Новый никнейм"
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
              disabled={usernameStatus !== "available"}
              style={{
                padding: "12px 20px",
                background: usernameStatus === "available" ? "#3b82f6" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "8px",
              }}
            >
              Сменить
            </button>
          </form>
        )}
        {/* Информация */}
        <div style={{ flex: 1, padding: "24px 20px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#374151" }}>Информация</h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <strong>Имя:</strong> {name}
              </div>
              <div>
                <strong>Email:</strong> {email}
              </div>
              <div>
                <strong>UID:</strong> {user?.uid || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Нижняя навигация — без изменений */}
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
