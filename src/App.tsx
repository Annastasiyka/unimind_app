import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import localforage from "localforage";
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

// Налаштування бази даних IndexedDB
localforage.config({
  name: "UniMind",
  storeName: "app_state",
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// --- Інтерфейси ---
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
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<string>("start");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(
    null,
  );
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null); // Стан для аватара
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

  // Автоматична міграція старих даних з localStorage при першому запуску
  const migrateFromLocalStorage = async () => {
    const migratedFlag = await localforage.getItem("migrated_to_idb");
    if (!migratedFlag) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          let val = localStorage.getItem(key);
          try {
            val = JSON.parse(val as string);
          } catch {
            void 0;
          }
          await localforage.setItem(key, val);
        }
      }
      await localforage.setItem("migrated_to_idb", true);
    }
  };

  // Ініціалізація додатку при старті
  useEffect(() => {
    const initApp = async () => {
      await migrateFromLocalStorage();

      const isLoggedIn = await localforage.getItem("isLoggedIn");
      const isGuest = await localforage.getItem("isGuest");
      const savedUser = await localforage.getItem<UserData>("userData");

      if (isGuest === "true") {
        setName("Гість");
        setAvatar(null);
        setCurrentScreen("main");
      } else if (isLoggedIn === "true" && savedUser) {
        setName(savedUser.name || "");
        setEmail(savedUser.email || "");
        setAvatar(savedUser.avatar || null);
        setCurrentScreen("main");
      }

      setIsAppLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Відстеження змін в даних користувача
  useEffect(() => {
    const handleStorageChange = async () => {
      const savedUser = await localforage.getItem<UserData>("userData");
      const isGuest = await localforage.getItem("isGuest");

      if (savedUser) {
        if (name !== "Гість" && name !== "" && name !== savedUser.name) {
          const keys = [
            "unimind-semesters",
            "unimind-plans",
            "unimind-work-times",
            "unimind-active-days",
          ];
          for (const key of keys) {
            const oldData = await localforage.getItem(`${key}-${name}`);
            if (oldData) {
              await localforage.setItem(`${key}-${savedUser.name}`, oldData);
              await localforage.removeItem(`${key}-${name}`);
            }
          }
        }
        setName(savedUser.name);
        setAvatar(savedUser.avatar || null);
      } else if (isGuest === "true") {
        setName("Гість");
        setAvatar(null);
      }
    };
    window.addEventListener("userDataUpdated", handleStorageChange);
    return () =>
      window.removeEventListener("userDataUpdated", handleStorageChange);
  }, [name]);

  // Запобігання зуму на мобільних
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

  // Робота з IndexedDB
  const populateLocalStorageFromDB = async (user: UserData) => {
    if (user.semesters)
      await localforage.setItem(
        `unimind-semesters-${user.name}`,
        user.semesters,
      );
    if (user.plans)
      await localforage.setItem(`unimind-plans-${user.name}`, user.plans);
    if (user.workSchedule) {
      if (user.workSchedule.times)
        await localforage.setItem(
          `unimind-work-times-${user.name}`,
          user.workSchedule.times,
        );
      if (user.workSchedule.days)
        await localforage.setItem(
          `unimind-active-days-${user.name}`,
          user.workSchedule.days,
        );
    }
  };

  const migrateAllGuestData = async (userName: string) => {
    const dataKeys = [
      "unimind-plans",
      "unimind-semesters",
      "unimind-work-times",
      "unimind-active-days",
    ];
    for (const key of dataKeys) {
      const guestData = await localforage.getItem(`${key}-guest`);
      if (guestData) {
        await localforage.setItem(`${key}-${userName}`, guestData);
        await localforage.removeItem(`${key}-guest`);
      }
    }
  };

  const syncWithBackend = async (userId: number, userName: string) => {
    try {
      const semesters = await localforage.getItem(
        `unimind-semesters-${userName}`,
      );
      const plans = await localforage.getItem(`unimind-plans-${userName}`);
      const workTimes = await localforage.getItem(
        `unimind-work-times-${userName}`,
      );
      const activeDays = await localforage.getItem(
        `unimind-active-days-${userName}`,
      );

      await fetch(`${API_URL}/sync/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          semesters: semesters || [],
          plans: plans || [],
          workSchedule: { times: workTimes || {}, days: activeDays || {} },
        }),
      });
    } catch {
      console.error("Database sync failed");
    }
  };

  const finalizeRegistration = async (sync: boolean) => {
    const savedData = await localforage.getItem<UserData>("userData");
    const guestKeys = [
      "unimind-plans-guest",
      "unimind-semesters-guest",
      "unimind-work-times-guest",
      "unimind-active-days-guest",
    ];

    if (savedData) {
      if (sync) {
        await migrateAllGuestData(savedData.name);
        await syncWithBackend(savedData.id, savedData.name);
      } else {
        for (const k of guestKeys) await localforage.removeItem(k);
      }
      setAvatar(savedData.avatar || null);
    }
    await localforage.setItem("isLoggedIn", "true");
    await localforage.setItem("isGuest", "false");
    setShowSyncModal(false);
    setCurrentScreen("main");
  };

  const finalizeLogin = async (sync: boolean) => {
    const savedData = await localforage.getItem<UserData>("userData");
    const guestKeys = [
      "unimind-plans-guest",
      "unimind-semesters-guest",
      "unimind-work-times-guest",
      "unimind-active-days-guest",
    ];

    if (savedData) {
      if (sync) {
        await migrateAllGuestData(savedData.name);
        await syncWithBackend(savedData.id, savedData.name);
      } else {
        for (const k of guestKeys) await localforage.removeItem(k);
      }
      setAvatar(savedData.avatar || null);
    }
    await localforage.setItem("isLoggedIn", "true");
    await localforage.setItem("isGuest", "false");
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

  const handleGuestEntry = async () => {
    const guestKeys = [
      "unimind-plans-guest",
      "unimind-semesters-guest",
      "unimind-work-times-guest",
      "unimind-active-days-guest",
    ];
    for (const key of guestKeys) {
      await localforage.removeItem(key);
    }
    await localforage.removeItem("userData"); // Важливо видалити старого юзера
    await localforage.setItem("isGuest", "true");
    await localforage.setItem("isLoggedIn", "false");
    setName("Гість");
    setAvatar(null);
    setEmail("");
    setCurrentScreen("main");
  };

  const handleLogout = async () => {
    await localforage.removeItem("userData");
    await localforage.removeItem("isLoggedIn");
    await localforage.removeItem("isGuest");
    setName("");
    setAvatar(null);
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
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await localforage.setItem("userData", data.user);
        const guestData = await localforage.getItem<Semester[]>(
          "unimind-semesters-guest",
        );
        const isGuest = await localforage.getItem("isGuest");

        if (isGuest === "true" && guestData && guestData.length > 0) {
          setSyncType("register");
          setShowSyncModal(true);
        } else {
          await finalizeRegistration(false);
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
        await localforage.setItem("userData", data.user);
        await localforage.setItem("isLoggedIn", "true");
        await populateLocalStorageFromDB(data.user);
        setName(data.user.name);
        setAvatar(data.user.avatar || null);

        const guestData = await localforage.getItem<Semester[]>(
          "unimind-semesters-guest",
        );
        const isGuest = await localforage.getItem("isGuest");

        if (isGuest === "true" && guestData && guestData.length > 0) {
          setSyncType("login");
          setShowSyncModal(true);
        } else {
          await localforage.removeItem("isGuest");
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

  if (isAppLoading) {
    return <div className="loading-screen">Завантаження UniMind...</div>;
  }

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
                    <div
                      className="profile-icon-name"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background:
                          name === "Гість"
                            ? "rgba(255, 255, 255, 0.25)"
                            : "#b1a7ff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                        border: "1px solid rgba(255, 255, 255, 0.6)",
                        boxShadow:
                          name === "Гість"
                            ? "inset 0 0 10px rgba(255, 255, 255, 0.4)"
                            : "none",
                      }}
                    >
                      {name === "Гість" ? (
                        <FontAwesomeIcon
                          icon={faUserGraduate}
                          style={{ color: "#5c4b75", fontSize: "20px" }}
                        />
                      ) : avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color: "#5c4b75",
                            fontWeight: "bold",
                            fontSize: "20px",
                            fontFamily: "serif",
                          }}
                        >
                          {name.charAt(0).toUpperCase() || "A"}
                        </span>
                      )}
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
