import React from "react";
import { User, Mail, Lock, KeyRound, Eye, EyeOff } from "lucide-react";

interface SignupPageProps {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  error: string; isShaking: boolean;
  isVisible: boolean; setIsVisible: (v: boolean) => void;
  isconfirmVisible: boolean; setIsConfirmVisible: (v: boolean) => void;
  handlRegister: () => void;
  setCurrentScreen: (v: string) => void;
  clearInputs: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = (props) => {
  return (
    <div className="AuthPage">
      <img src="/images/login.png" className="LoginBack" alt="Background" />
      <div className="login-container">
        <div className="name">
          <img src="/images/logoLogin.png" className="loginlogo" alt="Logo" />
          <h1 className="loginTitle">UniMind</h1>
        </div>
        <div className="form">
          <h1 className="title">Створіть свій акаунт</h1>
          <div className="account">
            <div className="input-group">
              <label>Введіть ім'я користувача:</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input type="text" placeholder="Ім'я" value={props.name} onChange={(e) => props.setName(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Введіть електронну пошту:</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input type="email" placeholder="Електронна пошта" value={props.email} onChange={(e) => props.setEmail(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Введіть пароль:</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input type={props.isVisible ? "text" : "password"} placeholder="Пароль" value={props.password} onChange={(e) => props.setPassword(e.target.value)} />
                <button type="button" className="eye-btn" onClick={() => props.setIsVisible(!props.isVisible)}>
                  {props.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>Введіть пароль ще раз:</label>
              <div className="input-wrapper">
                <KeyRound className="input-icon" size={18} />
                <input type={props.isconfirmVisible ? "text" : "password"} placeholder="Підтвердіть пароль" value={props.confirmPassword} onChange={(e) => props.setConfirmPassword(e.target.value)} />
                <button type="button" className="eye-btn" onClick={() => props.setIsConfirmVisible(!props.isconfirmVisible)}>
                  {props.isconfirmVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <p className={`error ${props.error ? "visible" : ""} ${props.isShaking ? "shake-animation2" : ""}`}>{props.error || " "}</p>
            <button className={`register-btn ${props.isShaking ? "shake-animation" : ""}`} onClick={props.handlRegister}>Зареєструватися</button>
            <h2 className="changeAccount">Уже маєте акаунт? <a className="move" href="#" onClick={(e) => { e.preventDefault(); props.clearInputs(); props.setCurrentScreen("login"); }}>Увійти</a></h2>
          </div>
        </div>
      </div>
    </div>
  );
};