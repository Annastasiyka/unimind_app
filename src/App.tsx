import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, NotebookPen, TableOfContents } from "lucide-react";
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
import { SemesterDashboard } from "./pages/SemesterDashboard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ZoomEvent extends Event {
  ctrlKey?: boolean;
  scale?: number;
}

interface Task {
  id: string;
  type: string;
  score: number | null;
  credits?: number;
}
interface Subject {
  id: string;
  name: string;
  credits: number;
  tasks: Task[];
}
interface Semester {
  id: string;
  name: string;
  yearString: string;
  subjects: Subject[];
  iconIndex: number;
}
interface Plan {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  [key: string]: unknown;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  workSchedule?: {
    times?: Record<string, string>;
    days?: Record<string, boolean>;
  };
  semesters?: Semester[];
  plans?: Plan[];
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const isGuest = localStorage.getItem("isGuest");
    if (isLoggedIn === "true" || isGuest === "true") return "main";
    return "start";
  });

  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  const [name, setName] = useState<string>(() => {
    const isGuest = localStorage.getItem("isGuest") === "true";
    const saved = localStorage.getItem("userData");
    if (isGuest) return "Гість";
    if (saved && saved !== "undefined") {
      try {
        const parsed = JSON.parse(saved);
        return parsed.name || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [email, setEmail] = useState<string>(() => {
    const saved = localStorage.getItem("userData");
    if (saved && saved !== "undefined") {
      try {
        const parsed = JSON.parse(saved);
        return parsed.email || "";
      } catch {
        return "";
      }
    }
    return "";
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
      const saved = localStorage.getItem("userData");
      if (saved && saved !== "undefined") {
        try {
          const newUser = JSON.parse(saved);
          if (name !== "Гість" && name !== "" && name !== newUser.name) {
            const keys = [
              "unimind-semesters",
              "unimind-plans",
              "unimind-work-times",
              "unimind-active-days",
            ];
            keys.forEach((key) => {
              const oldData = localStorage.getItem(`${key}-${name}`);
              if (oldData) {
                localStorage.setItem(`${key}-${newUser.name}`, oldData);
                localStorage.removeItem(`${key}-${name}`);
              }
            });
          }
          setName(newUser.name);
        } catch {
          console.error("Error updating profile name");
        }
      } else if (localStorage.getItem("isGuest") === "true") {
        setName("Гість");
      }
    };
    window.addEventListener("userDataUpdated", handleStorageChange);
    return () =>
      window.removeEventListener("userDataUpdated", handleStorageChange);
  }, [name]);

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

  const populateLocalStorageFromDB = (user: UserData) => {
    if (user.semesters) {
      localStorage.setItem(`unimind-semesters-${user.name}`, JSON.stringify(user.semesters));
    }
    if (user.plans) {
      localStorage.setItem(`unimind-plans-${user.name}`, JSON.stringify(user.plans));
    }
    if (user.workSchedule) {
      if (user.workSchedule.times)
        localStorage.setItem(
          `unimind-work-times-${user.name}`,
          JSON.stringify(user.workSchedule.times),
        );
      if (user.workSchedule.days)
        localStorage.setItem(
          `unimind-active-days-${user.name}`,
          JSON.stringify(user.workSchedule.days),
        );
    }
  };

  const migrateAllGuestData = (userName: string) => {
    const dataKeys = [
      "unimind-plans",
      "unimind-semesters",
      "unimind-work-times",
      "unimind-active-days",
    ];
    dataKeys.forEach((key) => {
      const guestData = localStorage.getItem(`${key}-guest`);
      if (guestData && guestData !== "undefined") {
        localStorage.setItem(`${key}-${userName}`, guestData);
        localStorage.removeItem(`${key}-guest`);
      }
    });
  };

  const syncWithBackend = async (userId: number, userName: string) => {
    try {
      const semesters = localStorage.getItem(`unimind-semesters-${userName}`);
      const plans = localStorage.getItem(`unimind-plans-${userName}`);
      const workTimes = localStorage.getItem(`unimind-work-times-${userName}`);
      const activeDays = localStorage.getItem(`unimind-active-days-${userName}`);

      await fetch(`${API_URL}/sync/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          semesters: semesters ? JSON.parse(semesters) : [],
          plans: plans ? JSON.parse(plans) : [],
          workSchedule: {
            times: workTimes ? JSON.parse(workTimes) : {},
            days: activeDays ? JSON.parse(activeDays) : {},
          },
        }),
      });
    } catch {
      console.error("Database sync failed");
    }
  };

  const finalizeRegistration = (sync: boolean) => {
    const savedData = localStorage.getItem("userData");
    if (savedData && savedData !== "undefined") {
      const user = JSON.parse(savedData);
      if (sync) {
        migrateAllGuestData(user.name);
        syncWithBackend(user.id, user.name);
      } else {
        [
          "unimind-plans",
          "unimind-semesters",
          "unimind-work-times",
          "unimind-active-days",
        ].forEach((k) => localStorage.removeItem(`${k}-guest`));
      }
    }
    localStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("isGuest");
    setShowSyncModal(false);
    setCurrentScreen("main");
  };

  const finalizeLogin = (sync: boolean) => {
    const savedData = localStorage.getItem("userData");
    if (savedData && savedData !== "undefined") {
      const user = JSON.parse(savedData);
      if (sync) {
        migrateAllGuestData(user.name);
        syncWithBackend(user.id, user.name);
      }
    }
    localStorage.setItem("isLoggedIn", "true");
    localStorage.removeItem("isGuest");
    setShowSyncModal(false);
    setCurrentScreen("main");
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
    localStorage.removeItem("userData");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isGuest");
    setName("");
    setEmail("");
    setCurrentScreen("start");
  };

  const handlRegister = async () => {
  setError("");
  if (!name || !email || !password || !confirmPassword) {
    setError("Заповніть всі поля");
    triggerShake();
    return;
  }
  if (password !== confirmPassword) {
    setError("Паролі не збігаються");
    triggerShake();
    return;
  }
  try {
    const response = await fetch(`${API_URL}/auth/signup`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name: name.trim(),
        email: email.trim(), 
        password: password 
      }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("userData", JSON.stringify(data.user));
      const guestData = localStorage.getItem("unimind-semesters-guest");
      
      if (
        localStorage.getItem("isGuest") === "true" &&
        guestData &&
        JSON.parse(guestData).length > 0
      ) {
        setSyncType("register");
        setShowSyncModal(true);
      } else {
        finalizeRegistration(false);
      }
    } else {
      setError(data.message || "Помилка реєстрації");
      triggerShake();
    }
  } catch {
    setError("Сервер недоступний");
    triggerShake();
  }
};

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Введіть пошту та пароль");
      triggerShake();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("userData", JSON.stringify(data.user));
        localStorage.setItem("isLoggedIn", "true");
        populateLocalStorageFromDB(data.user);
        setName(data.user.name);

        const guestData = localStorage.getItem("unimind-semesters-guest");
        if (localStorage.getItem("isGuest") === "true" && guestData && JSON.parse(guestData).length > 0) {
          setSyncType("login");
          setShowSyncModal(true);
        } else {
          localStorage.removeItem("isGuest");
          setCurrentScreen("main");
        }
      } else {
        setError(data.message || "Неправильні дані");
        triggerShake();
      }
    } catch {
      setError("Помилка з'єднання");
      triggerShake();
    }
  };

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
              {currentScreen === "signup" ? (
                <motion.div
                  key="signup-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="auth-form-container"
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
              ) : (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="auth-form-container"
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

        {[
          "main",
          "dashboard",
          "calendar",
          "AIplaner",
          "Calculator",
          "profile",
        ].includes(currentScreen) && (
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div className="profile-icon-name"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background:
                          localStorage.getItem("isGuest") === "true"
                            ? "rgba(255, 255, 255, 0.25)"
                            : "#b1a7ff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                        border: "1px solid rgba(255, 255, 255, 0.6)",
                        boxShadow:
                          localStorage.getItem("isGuest") === "true"
                            ? "inset 0 0 10px rgba(255, 255, 255, 0.4)"
                            : "none",
                      }}
                    >
                      {(() => {
                        const isGuestMode =
                          localStorage.getItem("isGuest") === "true";
                        const saved = localStorage.getItem("userData");

                        if (isGuestMode) {
                          return (
                            <FontAwesomeIcon
                              icon={faUserGraduate}
                              style={{ color: "#5c4b75", fontSize: "20px" }}
                            />
                          );
                        }

                        if (saved && saved !== "undefined") {
                          try {
                            const parsed = JSON.parse(saved);
                            if (parsed.avatar)
                              return (
                                <img
                                  src={parsed.avatar}
                                  alt="Avatar"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              );
                          } catch {
                            /* ignore */
                          }
                        }

                        return (
                          <span
                            style={{
                              color: "#5c4b75",
                              fontWeight: "bold",
                              fontSize: "22px",
                              fontFamily: "serif",
                            }}
                          >
                            {name.charAt(0).toUpperCase() || "A"}
                          </span>
                        );
                      })()}
                    </div>
                    <span
                      className="account-name"
                      style={{ fontWeight: "bold" }}
                    >
                      {name}
                    </span>
                    <CaretDownIcon
                      size={18}
                      color="#5c4b75"
                      weight="bold"
                      style={{ marginLeft: "-2px" }}
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
                className={`sidebar-btn ${currentScreen === "main" || currentScreen === "dashboard" ? "active" : ""}`}
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
                Бажаєте перенести в акаунт всі поточні записи з гостьового
                режима (семестри, плани, графік)?
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
                  Так, перенести все
                </button>
                <button
                  className="sync-btn-cancel"
                  onClick={() =>
                    syncType === "register"
                      ? finalizeRegistration(false)
                      : finalizeLogin(false)
                  }
                >
                  Ні, видалити гостьові дані
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
