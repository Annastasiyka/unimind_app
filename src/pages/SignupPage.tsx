import React from "react";
import { User, Mail, Lock, KeyRound, Eye, EyeOff } from "lucide-react";

interface SignupPageProps {
  name: string; 
  setName: (v: string) => void;
  email: string; 
  setEmail: (v: string) => void;
  password: string; 
  setPassword: (v: string) => void;
  confirmPassword: string; 
  setConfirmPassword: (v: string) => void;
  error: string; 
  isShaking: boolean;
  isVisible: boolean; 
  setIsVisible: (v: boolean) => void;
  isconfirmVisible: boolean; 
  setIsConfirmVisible: (v: boolean) => void;
  handlRegister: () => void;
  setCurrentScreen: (v: string) => void;
  clearInputs: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  name, setName,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  error, isShaking,
  isVisible, setIsVisible,
  isconfirmVisible, setIsConfirmVisible,
  handlRegister,
  setCurrentScreen,
  clearInputs
}) => {
  return (
    <div className="AuthPage">
      {/* Фонове зображення залишається, воно задає атмосферу */}
      <img src="/images/login.png" className="LoginBack" alt="Background" />
      
      <div className="login-container">
        <div className="name">
          <img src="/images/logoLogin.png" className="loginlogo" alt="Logo" />
          <h1 className="loginTitle">UniMind</h1>
        </div>

        <div className="form">
          <h1 className="title">Створіть свій акаунт</h1>
          <div className="account">
            
            {/* Поле імені */}
            <div className="input-group">
              <label>Введіть ім'я користувача:</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Ім'я" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
            </div>

            {/* Поле пошти */}
            <div className="input-group">
              <label>Введіть електронну пошту:</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input 
                  type="email" 
                  placeholder="Електронна пошта" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
            </div>

            {/* Поле пароля */}
            <div className="input-group">
              <label>Введіть пароль:</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input 
                  type={isVisible ? "text" : "password"} 
                  placeholder="Пароль" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button type="button" className="eye-btn" onClick={() => setIsVisible(!isVisible)}>
                  {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Підтвердження пароля */}
            <div className="input-group">
              <label>Введіть пароль ще раз:</label>
              <div className="input-wrapper">
                <KeyRound className="input-icon" size={18} />
                <input 
                  type={isconfirmVisible ? "text" : "password"} 
                  placeholder="Підтвердіть пароль" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
                <button type="button" className="eye-btn" onClick={() => setIsConfirmVisible(!isconfirmVisible)}>
                  {isconfirmVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Повідомлення про помилку з анімацією трясіння */}
            <p className={`error ${error ? "visible" : ""} ${isShaking ? "shake-animation2" : ""}`}>
              {error || " "}
            </p>

            <button 
              className={`register-btn ${isShaking ? "shake-animation" : ""}`} 
              onClick={handlRegister}
            >
              Зареєструватися
            </button>

            <h2 className="changeAccount">
              Уже маєте акаунт?{" "}
              <a 
                className="move" 
                href="#" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  clearInputs(); 
                  setCurrentScreen("login"); 
                }}
              >
                Увійти
              </a>
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};