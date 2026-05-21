import React from "react";

interface StartPageProps {
  setCurrentScreen: (screen: string) => void;
  clearInputs: () => void;
  handleGuestEntry: () => Promise<void> | void; 
}

export const StartPage: React.FC<StartPageProps> = ({ 
  setCurrentScreen, 
  clearInputs, 
  handleGuestEntry 
}) => {

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    clearInputs();
    setCurrentScreen("login");
  };

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
          onClick={handleLoginClick}
        >
          Вхід в систему
        </button>

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