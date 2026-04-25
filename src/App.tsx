import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, NotebookPen, TableOfContents } from "lucide-react";
import {
  HeadCircuitIcon,
  CalendarCheckIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import "./index.css";
import { SemesterPage } from "./pages/SemesterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CalendarPage } from "./pages/CalendarPage";
import { CalculatorPage } from "./pages/CalculatorPage";
import { AIPlanerPage } from "./pages/AIPlanerPage";
import { StartPage } from "./pages/StartPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderPageContent = () => {
    switch (currentScreen) {
      case "main":
        return <SemesterPage />;
      case "calendar":
        return <CalendarPage />;
      case "AIplaner":
        return <AIPlanerPage />;
      case "Calculator":
        return <CalculatorPage />;
      case "profile":
        return <ProfilePage />;
      default:
        return null;
    }
  };

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

  return (
    <div className="app-container">
      <AnimatePresence mode="popLayout">
        {/* стартова сторінка  */}
        {currentScreen === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="signup-full-wrapper"
          >
            <img src="/images/back.png" className="signup-bg-static" alt="" />
            <StartPage
              setCurrentScreen={setCurrentScreen}
              clearInputs={clearInputs}
            />
          </motion.div>
        )}

        {/* авторизація */}
        {["signup", "login"].includes(currentScreen) && (
          <motion.div
            key="auth-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="signup-full-wrapper"
          >
            <img src="/images/login.png" className="signup-bg-static" alt="" />

            <AnimatePresence mode="popLayout">
              {currentScreen === "signup" && (
                <motion.div
                  key="signup-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 2,
                  }}
                >
                  <SignupPage
                    name={name}
                    setName={setName}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    error={error}
                    isShaking={isShaking}
                    isVisible={isVisible}
                    setIsVisible={setIsVisible}
                    isconfirmVisible={isconfirmVisible}
                    setIsConfirmVisible={setIsConfirmVisible}
                    handlRegister={handlRegister}
                    setCurrentScreen={setCurrentScreen}
                    clearInputs={clearInputs}
                  />
                </motion.div>
              )}

              {currentScreen === "login" && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 2,
                  }}
                >
                  <LoginPage
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    error={error}
                    isVisible={isVisible}
                    setIsVisible={setIsVisible}
                    isShaking={isShaking}
                    handleLogin={handleLogin}
                    setCurrentScreen={setCurrentScreen}
                    clearInputs={clearInputs}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* сам застосунок */}
        {["main", "calendar", "AIplaner", "Calculator", "profile"].includes(
          currentScreen,
        ) && (
          <motion.div
            key="main-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`mainPage ${isMobile ? "mobile" : "desktop"}`}
          >
            <nav className="navbar">
              <div className="welcome">
                <div className="leftSide">
                  {isMobile && (
                    <button
                      className="menu-toggle"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                      <TableOfContents size={30} color="#5c4b75" />
                    </button>
                  )}
                  <div className="navName">UniMind</div>
                </div>
                <div className="prof">
                  <div className="account-icon"></div>
                  <button
                    className="account-btn"
                    onClick={() => setCurrentScreen("profile")}
                  >
                    <span className="account-name">{name}</span>
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
            </nav>

            <aside
              className={`sidebar ${isMobile ? (isMenuOpen ? "open" : "closed") : ""}`}
            >
              {!isMobile && (
                <div className="sidebarLine">
                  <img
                    src="/images/logo.Purple.png"
                    className="sidebar-logo"
                    alt="Logo"
                  />
                </div>
              )}
              <button
                className={`sidebar-btn ${currentScreen === "main" ? "active" : ""}`}
                onClick={() => {
                  setCurrentScreen("main");
                  setIsMenuOpen(false);
                }}
              >
                <NotebookPen size={35} color="#5c4b75" strokeWidth={2.1} />
                {isMobile && <span>Семестр</span>}
              </button>
              <button
                className={`sidebar-btn ${currentScreen === "calendar" ? "active" : ""}`}
                onClick={() => {
                  setCurrentScreen("calendar");
                  setIsMenuOpen(false);
                }}
              >
                <CalendarCheckIcon size={35} color="#5c4b75" weight="bold" />
                {isMobile && <span>Календар</span>}
              </button>
              <button
                className={`sidebar-btn ${currentScreen === "AIplaner" ? "active" : ""}`}
                onClick={() => {
                  setCurrentScreen("AIplaner");
                  setIsMenuOpen(false);
                }}
              >
                <HeadCircuitIcon size={35} color="#5c4b75" weight="bold" />
                {isMobile && <span>AI Планувальник</span>}
              </button>
              <button
                className={`sidebar-btn ${currentScreen === "Calculator" ? "active" : ""}`}
                onClick={() => {
                  setCurrentScreen("Calculator");
                  setIsMenuOpen(false);
                }}
              >
                <Calculator size={35} color="#5c4b75" strokeWidth={2.1} />
                {isMobile && <span>Калькулятор</span>}
              </button>
            </aside>

            <main className="content">
              <img
                src="/images/light.png"
                className="mainBack"
                alt="background"
              />
              {renderPageContent()}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
