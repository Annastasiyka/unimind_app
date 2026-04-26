import React from "react";

// 1. Оновлюємо інтерфейс, додаючи handleGuestEntry
interface StartPageProps {
  setCurrentScreen: (screen: string) => void;
  clearInputs: () => void;
  handleGuestEntry: () => void; 
}

// 2. Деструктуруємо handleGuestEntry з пропсів
export const StartPage: React.FC<StartPageProps> = ({ 
  setCurrentScreen, 
  clearInputs, 
  handleGuestEntry 
}) => {
  return (
    <div className="startPage">
      <img src="/images/back.png" className="bg-image" alt="Background" />
      <div className="logoBlock">
        <div className="logo">
          <div className="circle"></div>
          <img src="/images/logo.png" className="logo-img" alt="Logo" />
        </div>
      </div>
      <div className="NameBlock">
        <h1 className="Name">UniMind</h1>
      </div>
      <div className="Auth">
        <button
          className="auth-btn2"
          onClick={(e) => {
            e.preventDefault();
            clearInputs();
            setCurrentScreen("login"); // Можна відразу на login, або signup залежно від логіки
          }}
        >
          Вхід в систему
        </button>

        {/* 3. Змінюємо функцію на ту, що ми прописали в App.tsx */}
        <button className="auth-btn1" onClick={handleGuestEntry}>
          Продовжити без входу
        </button>
      </div>
    </div>
  );
};