import React from "react";

// 1. Додаємо setCurrentScreen у пропси
interface ProfilePageProps {
  handleLogout: () => void;
  setCurrentScreen: (screen: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ handleLogout, setCurrentScreen }) => {
  // Перевіряємо статус гостя
  const isGuest = localStorage.getItem("isGuest") === "true";

  return (
    <div className="profile-container">
      <h2 className="loginTitle">Мій профіль</h2>

      <div className="account" style={{ marginTop: '30px', gap: '15px' }}>
        {isGuest ? (
          // --- ІНТЕРФЕЙС ДЛЯ ГОСТЯ ---
          <>
            <p className="title" style={{ textAlign: 'center' }}>
              Ви увійшли як гість. Створіть акаунт, щоб зберегти свій розклад назавжди!
            </p>
            <button 
              className="register-btn" 
              onClick={() => setCurrentScreen("signup")}
            >
              Створити акаунт
            </button>
            <button 
              className="auth-btn1" 
              style={{ width: '90%', height: '45px' }}
              onClick={() => setCurrentScreen("login")}
            >
              Увійти в наявний
            </button>
            <button 
              className="changeAccount" 
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: '#5c4b75', cursor: 'pointer' }}
            >
              Вийти з гостьового режиму
            </button>
          </>
        ) : (
          // --- ІНТЕРФЕЙС ДЛЯ АВТОРИЗОВАНОГО КОРИСТУВАЧА ---
          <>
            <div className="name" style={{ marginBottom: '20px' }}>
              <div className="loginlogo" style={{ background: '#5c4b75', borderRadius: '50%', width: '60px', height: '60px' }}></div>
              <span className="loginTitle" style={{ marginLeft: '15px' }}>
                {JSON.parse(localStorage.getItem("userData") || "{}").name}
              </span>
            </div>
            <button 
              className="register-btn" 
              onClick={handleLogout}
            >
              Вийти з акаунта
            </button>
          </>
        )}
      </div>
    </div>
  );
};