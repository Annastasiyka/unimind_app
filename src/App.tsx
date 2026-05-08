import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, NotebookPen, TableOfContents} from "lucide-react";
import {
  HeadCircuitIcon,
  CalendarCheckIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import "./index.css";
import { SemesterPage } from "./pages/SemesterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CalendarPage } from "./pages/CalendarPage";
import { CalculatorPage } from "./pages/CalculatorPage";
import { AIPlanerPage } from "./pages/AIPlanerPage";
import { StartPage } from "./pages/StartPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { SemesterDashboard } from "./pages/SemesterDashboard"; // ВАЖЛИВО: перевір правильність шляху до файлу!

interface ZoomEvent extends Event {
  ctrlKey?: boolean;
  scale?: number;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const isGuest = localStorage.getItem("isGuest");
    if (isLoggedIn === "true" || isGuest === "true") return "main";
    return "start";
  });

  // НОВИЙ СТЕЙТ ДЛЯ ЗБЕРЕЖЕННЯ ID ВИБРАНОГО СЕМЕСТРУ
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  const [name, setName] = useState<string>(() => {
    const isGuest = localStorage.getItem("isGuest") === "true";
    const saved = localStorage.getItem("userData");
    if (isGuest) return "Гість";
    if (saved) {
      try {
        return JSON.parse(saved).name;
      } catch {
        return "";
      }
    }
    return "";
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

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncType, setSyncType] = useState<"register" | "login">("register");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const isGuest = localStorage.getItem("isGuest") === "true";
      const saved = localStorage.getItem("userData");
      if (isGuest) {
        setName("Гість");
      } else if (saved) {
        try {
          setName(JSON.parse(saved).name);
        } catch (error) {
          console.error("Помилка парсингу імені з localStorage:", error);
        }
      }
    };

    window.addEventListener("userDataUpdated", handleStorageChange);
    return () => window.removeEventListener("userDataUpdated", handleStorageChange);
  }, []);

  // ОНОВЛЕНИЙ БЛОК ПЕРЕМИКАННЯ СТОРІНОК
  const renderPageContent = () => {
    switch (currentScreen) {
      case "main":
        return (
          <SemesterPage 
            setCurrentScreen={setCurrentScreen} 
            setSelectedSemesterId={setSelectedSemesterId} 
          />
        );
      case "dashboard":
        return (
          <SemesterDashboard 
            semesterId={selectedSemesterId} 
            setCurrentScreen={setCurrentScreen} 
          />
        );
      case "calendar":
        return <CalendarPage />;
      case "AIplaner":
        return <AIPlanerPage />;
      case "Calculator":
        return <CalculatorPage />;
      case "profile":
        return (
          <ProfilePage
            handleLogout={handleLogout}
            setCurrentScreen={setCurrentScreen}
          />
        );
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

  const handleGuestEntry = () => {
    localStorage.setItem("isGuest", "true");
    localStorage.setItem("isLoggedIn", "false");
    setName("Гість");
    setCurrentScreen("main");
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isGuest");
    setName("");
    clearInputs();
    setCurrentScreen("start");
  };

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

    const guestPlans = localStorage.getItem("unimind-plans-guest");
    if (
      localStorage.getItem("isGuest") === "true" &&
      guestPlans &&
      JSON.parse(guestPlans).length > 0
    ) {
      setSyncType("register");
      setShowSyncModal(true);
    } else {
      finalizeRegistration(false);
    }
  };

  const finalizeRegistration = (sync: boolean) => {
    const guestPlans = localStorage.getItem("unimind-plans-guest");
    const datauser = { name, email, password };

    localStorage.setItem("userData", JSON.stringify(datauser));

    if (sync && guestPlans) {
      localStorage.setItem(`unimind-plans-${name}`, guestPlans);
    }

    localStorage.removeItem("unimind-plans-guest");
    localStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("isGuest");
    setShowSyncModal(false);
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
      setError("Акаунт не знайдено.");
      triggerShake();
      return;
    }

    const user = JSON.parse(savedData);
    if (user.email === email && user.password === password) {
      const guestPlans = localStorage.getItem("unimind-plans-guest");
      if (
        localStorage.getItem("isGuest") === "true" &&
        guestPlans &&
        JSON.parse(guestPlans).length > 0
      ) {
        setSyncType("login");
        setShowSyncModal(true);
      } else {
        finalizeLogin(false);
      }
    } else {
      setError("Неправильна пошта чи пароль.");
      triggerShake();
    }
  };

  const finalizeLogin = (sync: boolean) => {
    const savedData = localStorage.getItem("userData");
    const user = JSON.parse(savedData!);
    const guestPlans = localStorage.getItem("unimind-plans-guest");

    if (sync && guestPlans) {
      localStorage.setItem(`unimind-plans-${user.name}`, guestPlans);
    }

    localStorage.removeItem("unimind-plans-guest");
    localStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("isGuest");
    setName(user.name);
    setShowSyncModal(false);
    setCurrentScreen("main");
  };

  useEffect(() => {
    const restrictedScreens = ["start", "signup", "login", "main"];
    const preventZoom = (e: Event) => {
      if (restrictedScreens.includes(currentScreen)) {
        const event = e as ZoomEvent;
        if (event.ctrlKey || (event.scale !== undefined && event.scale !== 1)) {
          if (event.cancelable) event.preventDefault();
        }
      }
    };
    window.addEventListener("wheel", preventZoom, { passive: false });
    window.addEventListener("touchmove", preventZoom, { passive: false });
    return () => {
      window.removeEventListener("wheel", preventZoom);
      window.removeEventListener("touchmove", preventZoom);
    };
  }, [currentScreen]);

  return (
    <div className="app-container">
      <AnimatePresence mode="popLayout">
        {currentScreen === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="signup-full-wrapper"
          >
            <img src="/images/back.png" className="signup-bg-static" alt="" />
            <StartPage
              setCurrentScreen={setCurrentScreen}
              clearInputs={clearInputs}
              handleGuestEntry={handleGuestEntry}
            />
          </motion.div>
        )}

        {["signup", "login"].includes(currentScreen) && (
          <motion.div
            key="auth-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 2,
                  }}
                >
                  <SignupPage
                    {...{
                      name,
                      setName,
                      email,
                      setEmail,
                      password,
                      setPassword,
                      confirmPassword,
                      setConfirmPassword,
                      error,
                      isShaking,
                      isVisible,
                      setIsVisible,
                      isconfirmVisible,
                      setIsConfirmVisible,
                      handlRegister,
                      setCurrentScreen,
                      clearInputs,
                    }}
                  />
                </motion.div>
              )}
              {currentScreen === "login" && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 2,
                  }}
                >
                  <LoginPage
                    {...{
                      email,
                      setEmail,
                      password,
                      setPassword,
                      error,
                      isVisible,
                      setIsVisible,
                      isShaking,
                      handleLogin,
                      setCurrentScreen,
                      clearInputs,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {["main", "dashboard", "calendar", "AIplaner", "Calculator", "profile"].includes(
          currentScreen,
        ) && (
          <motion.div
            key="main-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                  <button
                    className="account-btn"
                    onClick={() => setCurrentScreen("profile")}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    {localStorage.getItem("isGuest") === "true" ? (
                      <div 
                        style={{ 
                          width: '45px', 
                          height: '45px', 
                          borderRadius: '50%', 
                          background: 'rgba(255, 255, 255, 0.25)', 
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.6)',
                          boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.4)'
                        }}
                      >
                        <FontAwesomeIcon icon={faUserGraduate} style={{ color: "#5c4b75", fontSize: "20px" }} />
                      </div>
                    ) : (
                      <div 
                        style={{ 
                          width: '45px', 
                          height: '45px', 
                          borderRadius: '50%', 
                          background: '#b1a7ff', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          overflow: 'hidden',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '20px',
                          border: '1px solid rgba(143, 136, 232, 0.3)'
                        }}
                      >
                        {(() => {
                          const saved = localStorage.getItem("userData");
                          if (saved) {
                            try {
                              const parsed = JSON.parse(saved);
                              if (parsed.avatar) {
                                return <img src={parsed.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                              }
                            } catch (error) {
                              console.error("Помилка парсингу аватарки з localStorage:", error);
                            }
                          }
                          return name.charAt(0).toUpperCase() || "A";
                        })()}
                      </div>
                    )}
                    
                    <span className="account-name" style={{ fontWeight: 'bold' }}>{name}</span>
                    <CaretDownIcon size={18} color="#5c4b75" weight="bold" style={{ marginLeft: '-2px' }} />
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
                className={`sidebar-btn ${currentScreen === "main" || currentScreen === "dashboard" ? "active" : ""}`}
                data-tooltip="Семестр"
                style={{ position: "relative" }}
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
                data-tooltip="Календар"
                style={{ position: "relative" }}
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
                data-tooltip="AI Планувальник"
                style={{ position: "relative" }}
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
                data-tooltip="Калькулятор"
                style={{ position: "relative" }}
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

      <AnimatePresence>
        {showSyncModal && (
          <motion.div
            className="sync-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="sync-modal-card"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2 className="sync-modal-title">Збереження даних</h2>

              <p className="sync-modal-text">
                У вас уже є записані дані в акаунті. <br />
                Бажаєте перенести в нього поточні записи з гостьового режима?
              </p>

              <div className="sync-modal-actions">
                <button
                  className="sync-btn-confirm"
                  onClick={() =>
                    syncType === "register"
                      ? finalizeRegistration(true)
                      : finalizeLogin(true)
                  }
                >
                  Так, перенести дані
                </button>

                <button
                  className="sync-btn-cancel"
                  onClick={() =>
                    syncType === "register"
                      ? finalizeRegistration(false)
                      : finalizeLogin(false)
                  }
                >
                  Ні, видалити поточні дані
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;