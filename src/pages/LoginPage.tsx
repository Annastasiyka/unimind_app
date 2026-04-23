import React from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginPageProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  error: string;
  isVisible: boolean;
  setIsVisible: (val: boolean) => void;
  isShaking: boolean;
  handleLogin: () => void;
  setCurrentScreen: (screen: string) => void;
  clearInputs: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  email, setEmail, password, setPassword, error, isVisible,
  setIsVisible, isShaking, handleLogin, setCurrentScreen, clearInputs
}) => {
  return (
    <div className="AuthPage">
      <img src="/images/login.png" className="LoginBack" alt="Background" />
      <div className="login-container">
        <div className="name">
          <img src="/images/logoLogin.png" className="loginlogo" alt="Logo" />
          <h1 className="loginTitle">UniMind</h1>
        </div>
        <div className="form">
          <h1 className="title"> Увійдіть до свого акаунта </h1>
          <div className="account" style={{ marginTop: "20px" }}>
            <div className="input-group">
              <label>Введіть електронну пошту:</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input type="email" placeholder="Електронна пошта" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Введіть пароль:</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input type={isVisible ? "text" : "password"} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="eye-btn" onClick={() => setIsVisible(!isVisible)}>
                  {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <p className={`error ${error ? "visible" : ""} ${isShaking ? "shake-animation2" : ""}`}>{error || " "}</p>
            <button className={`register-btn ${isShaking ? "shake-animation" : ""}`} style={{ marginTop: "5px" }} onClick={handleLogin}>Увійти</button>
            <h2 className="changeAccount"> Не маєте акаунта? <a className="move" href="#" onClick={(e) => { e.preventDefault(); clearInputs(); setCurrentScreen("signup"); }}>Створити</a></h2>
          </div>
        </div>
      </div>
    </div>
  );
};