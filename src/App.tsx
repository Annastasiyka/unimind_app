import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Calculator,
  NotebookPen
} from "lucide-react";
import {
  HeadCircuitIcon,
  CalendarCheckIcon,
  CaretDownIcon
} from "@phosphor-icons/react";
import "./index.css";

interface ZoomEvent extends Event {
  ctrlKey?: boolean;
  scale?: number;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const isGuest = localStorage.getItem("isGuest");
    if (isLoggedIn === "true") return "main";
    if (isGuest === "true") return "guest";
    return "start";
  });

  const [name, setName] = useState<string>(() => {
    const saved = localStorage.getItem("userData");
    return saved ? JSON.parse(saved).name : "";
  });

  const [email, setEmail] = useState<string>(() => {
    const saved = localStorage.getItem("userData");
    return saved ? JSON.parse(saved).email : "";
  });

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isconfirmVisible, setIsConfirmVisible] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);


  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const clearInputs = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
  };
  /*
  const handleGuestEntry = () => {
    localStorage.setItem("isGuest", "true");
    setCurrentScreen("guest");
  };*/

  const handlRegister = () => {
    setError("");
    if (!name || !email || !password || !confirmPassword) {
      setError("Будь ласка, заповніть всі поля.");
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setError("Паролі не співпадають.");
      triggerShake();
      return;
    }

    const datauser = { name, email, password };
    localStorage.setItem("userData", JSON.stringify(datauser));
    localStorage.setItem("isLoggedIn", "true");
    setCurrentScreen("main");
  };

  const handleLogin = () => {
    setError("");
    const savedData = localStorage.getItem("userData");

    if (!email || !password) {
      setError("Будь ласка, введіть пошту та пароль.");
      triggerShake();
      return;
    }

    if (!savedData) {
      setError("Акаунт не знайдено. Зареєструйтеся.");
      triggerShake();
      return;
    }

    const user = JSON.parse(savedData);
    if (user.email === email && user.password === password) {
      localStorage.setItem("isLoggedIn", "true");
      setName(user.name);
      setCurrentScreen("main");
    } else {
      setError("Неправильна пошта чи пароль.");
      triggerShake();
    }
  };

  /* const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isGuest");
    clearInputs();
    setCurrentScreen("start");
  };*/

  useEffect(() => {
    const restrictedScreens = ["start", "signup", "login", "main", "guest"];

    const preventZoom = (e: Event) => {
      if (restrictedScreens.includes(currentScreen)) {
        const event = e as ZoomEvent;
        if (event.ctrlKey || (event.scale !== undefined && event.scale !== 1)) {
          if (event.cancelable) event.preventDefault();
        }
      }
    };

    const preventKeys = (e: KeyboardEvent) => {
      if (restrictedScreens.includes(currentScreen)) {
        if (e.ctrlKey && (e.key === "+" || e.key === "-" || e.key === "=")) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("wheel", preventZoom, { passive: false });
    window.addEventListener("keydown", preventKeys);
    window.addEventListener("touchmove", preventZoom, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventZoom);
      window.removeEventListener("keydown", preventKeys);
      window.removeEventListener("touchmove", preventZoom);
    };
  }, [currentScreen]);

  // Стартова сторінка
  if (currentScreen === "start") {
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
              setCurrentScreen("signup");
            }}
          >
            Вхід в систему
          </button>
          <button
            className="auth-btn1"
            onClick={() => setCurrentScreen("main")}
          >
            Продовжити без входу
          </button>
        </div>
      </div>
    );
  }

  // Реєстрація
  if (currentScreen === "signup") {
    return (
      <div className="AuthPage">
        <img src="/images/login.png" className="LoginBack" alt="Background" />
        <div className="login-container">
          <div className="name">
            <img src="/images/logoLogin.png" className="loginlogo" alt="Logo" />
            <h1 className="loginTitle">UniMind</h1>
          </div>
          <div className="form">
            <h1 className="title"> Створіть свій акаунт </h1>
            <div className="account">
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
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setIsVisible(!isVisible)}
                  >
                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
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
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setIsConfirmVisible(!isconfirmVisible)}
                  >
                    {isconfirmVisible ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
              <p
                className={`error ${error ? "visible" : ""} ${isShaking ? "shake-animation2" : ""}`}
              >
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
  }

  // Логін
  if (currentScreen === "login") {
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
                  <input
                    type="email"
                    placeholder="Електронна пошта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
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
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setIsVisible(!isVisible)}
                  >
                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <p
                className={`error ${error ? "visible" : ""} ${isShaking ? "shake-animation2" : ""}`}
              >
                {error || " "}
              </p>
              <button
                className={`register-btn ${isShaking ? "shake-animation" : ""}`}
                style={{ marginTop: "5px" }}
                onClick={handleLogin}
              >
                Увійти
              </button>
              <h2 className="changeAccount">
                Не маєте акаунта?{" "}
                <a
                  className="move"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    clearInputs();
                    setCurrentScreen("signup");
                  }}
                >
                  Створити
                </a>
              </h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Головна
  if (currentScreen === "main") {
    return (
      <div className="mainPage">
        <div className="navbar">
          <div className="welcome">
            <div className=" navName"> UniMind </div>
            <div className="prof">
              <div className="account-icon"></div>
              <button
                className=" account-btn"
                onClick={() => setCurrentScreen("profile")}
              >
                <span className=" account-name"> {name}</span>
                <CaretDownIcon
                  size={18}
                  color="#5c4b75"
                  weight="bold"
                  style={{
                    marginLeft: "5px",
                    top: "4px",
                    position: "relative",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
        <div className="sidebar">
          <div className="sidebarLine">
            <img
              src="/images/logo.Purple.png"
              className="sidebar-logo"
              alt="Logo"
            />
          </div>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("main")}
          >
            <NotebookPen size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("calendar")}
          >
            {" "}
            <CalendarCheckIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("AIplaner")}
          >
            {" "}
            <HeadCircuitIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("Calculator")}
          >
            {" "}
            <Calculator size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
        </div>
        <div className="content">
         <img src ="/images/light.png" className="mainBack"></img>
        </div>
      </div>
    );
  }

  // Календар
  if (currentScreen === "calendar") {
    return (
      <div className="mainPage">
        <div className="navbar">
          <div className="welcome">
            <div className=" navName"> UniMind </div>
            <div className="prof">
              <div className="account-icon"></div>
              <button className=" account-btn">
                <span className=" account-name"> {name}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="sidebar">
          <div className="sidebarLine">
            <img
              src="/images/logo.Purple.png"
              className="sidebar-logo"
              alt="Logo"
            />
          </div>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("main")}
          >
            <NotebookPen size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("calendar")}
          >
            {" "}
            <CalendarCheckIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("AIplaner")}
          >
            {" "}
            <HeadCircuitIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("Calculator")}
          >
            {" "}
            <Calculator size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
        </div>
        <div className="content">
         <img src ="/images/light.png" className="mainBack"></img>
        </div>
      </div>
    );
  }

  // AIplaner
  if (currentScreen === "AIplaner") {
    return (
      <div className="mainPage">
        <div className="navbar">
          <div className="welcome">
            <div className=" navName"> UniMind </div>
            <div className="prof">
              <div className="account-icon"></div>
              <button className=" account-btn">
                <span className=" account-name"> {name}!</span>
              </button>
            </div>
          </div>
        </div>
        <div className="sidebar">
          <div className="sidebarLine">
            <img
              src="/images/logo.Purple.png"
              className="sidebar-logo"
              alt="Logo"
            />
          </div>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("main")}
          >
            <NotebookPen size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("calendar")}
          >
            {" "}
            <CalendarCheckIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("AIplaner")}
          >
            {" "}
            <HeadCircuitIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("Calculator")}
          >
            {" "}
            <Calculator size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
        </div>
        <div className="content">
         <img src ="/images/light.png" className="mainBack"></img>
        </div>
      </div>
    );
  }

  // Calculator
  if (currentScreen === "Calculator") {
    return (
      <div className="mainPage">
        <div className="navbar">
          <div className="welcome">
            <div className=" navName"> UniMind </div>
            <div className="prof">
              <div className="account-icon"></div>
              <button className=" account-btn">
                <span className=" account-name"> {name}!</span>
              </button>
            </div>
          </div>
        </div>
        <div className="sidebar">
          <div className="sidebarLine">
            <img
              src="/images/logo.Purple.png"
              className="sidebar-logo"
              alt="Logo"
            />
          </div>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("main")}
          >
            <NotebookPen size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("calendar")}
          >
            {" "}
            <CalendarCheckIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("AIplaner")}
          >
            {" "}
            <HeadCircuitIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("Calculator")}
          >
            {" "}
            <Calculator size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
        </div>
        <div className="content">
         <img src ="/images/light.png" className="mainBack"></img>
        </div>
      </div>
    );
  }

  // профіль
  if (currentScreen === "profile") {
    return (
      <div className="mainPage">
        <div className="navbar">
          <div className="welcome">
            <div className=" navName"> UniMind </div>
            <div className="prof">
              <div className="account-icon"></div>
              <button className=" account-btn">
                <span className=" account-name"> </span>
              </button>
            </div>
          </div>
        </div>
        <div className="sidebar">
          <div className="sidebarLine">
            <img
              src="/images/logo.Purple.png"
              className="sidebar-logo"
              alt="Logo"
            />
          </div>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("main")}
          >
            <NotebookPen size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("calendar")}
          >
            {" "}
            <CalendarCheckIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("AIplaner")}
          >
            {" "}
            <HeadCircuitIcon size={35} color="#5c4b75" weight="bold" />
          </button>
          <button
            className="sidebar-btn"
            onClick={() => setCurrentScreen("Calculator")}
          >
            {" "}
            <Calculator size={35} color="#5c4b75" strokeWidth={2.1} />
          </button>
        </div>
        <div className="content">
         <img src ="/images/light.png" className="mainBack"></img>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
