import React from "react";

interface StartPageProps {
  setCurrentScreen: (screen: string) => void;
  clearInputs: () => void;
  handleGuestEntry: () => Promise<void> | void; // Дозволяємо асинхронний виклик
}

export const StartPage: React.FC<StartPageProps> = ({ 
  setCurrentScreen, 
  clearInputs, 
  handleGuestEntry 
}) => {

  // Обробник для кнопки входу
  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    clearInputs(); // Очищаємо поля пароля/пошти перед переходом
    setCurrentScreen("login");
  };

  return (
    <div className="startPage">
      {/* Фонове зображення */}
      <img src="/images/back.png" className="bg-image" alt="Background" />
      
      {/* Блок з логотипом */}
      <div className="logoBlock">
        <div className="logo">
          <div className="circle"></div>
          <img src="/images/logo.png" className="logo-img" alt="Logo" />
        </div>
      </div>
      
      {/* Назва додатку */}
      <div className="NameBlock">
        <h1 className="Name">UniMind</h1>
      </div>
      
      {/* Кнопки дій */}
      <div className="Auth">
        <button
          className="auth-btn2"
          onClick={handleLoginClick}
        >
          Вхід в систему
        </button>

        {/* handleGuestEntry тепер очистить IndexedDB і налаштує статус гостя в App.tsx */}
        <button 
          className="auth-btn1" 
          onClick={() => handleGuestEntry()}
        >
          Продовжити без входу
        </button>
      </div>
    </div>
  );
};