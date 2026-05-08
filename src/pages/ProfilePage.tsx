import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import React, { useState, useRef } from "react";
import { Clock, User, Shield, Pencil, ChevronDown, LogOut, Check, Eye, EyeOff, Lock } from "lucide-react";

interface ProfilePageProps {
  handleLogout: () => void;
  setCurrentScreen: (screen: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) =>
  i < 10 ? `0${i}:00` : `${i}:00`,
);

export const ProfilePage: React.FC<ProfilePageProps> = ({
  handleLogout,
  setCurrentScreen,
}) => {
  const isGuest = localStorage.getItem("isGuest") === "true";
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<{ [key: string]: string }>({});

  const [isWorkHoursOpen, setIsWorkHoursOpen] = useState(false);
  
  // --- СТАНИ ДЛЯ БЕЗПЕКИ ---
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  
  // --- СТАНИ ДЛЯ ВИДИМОСТІ ПАРОЛІВ (ОКО) ---
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // --- РЕФИ ДЛЯ ІНПУТІВ ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  // --- СТАНИ ДЛЯ ІМЕНІ ТА АВАТАРКИ ---
  const [userName, setUserName] = useState(() => {
    const storedData = localStorage.getItem("userData");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.name) return parsed.name;
      } catch (error) {
        console.error("Не вдалося розпарсити userData з localStorage:", error);
      }
    }
    return "anna";
  });

  const [avatar, setAvatar] = useState<string | null>(() => {
    const storedData = localStorage.getItem("userData");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.avatar) return parsed.avatar;
      } catch (error) {
        console.error("Помилка парсингу аватарки:", error);
      }
    }
    return null;
  });

  // --- ЛОГІКА ЗМІНИ ІМЕНІ ТА ЗБЕРЕЖЕННЯ ---
  const saveUserData = (newName: string, newAvatar: string | null) => {
    const storedData = localStorage.getItem("userData") || "{}";
    try {
      const parsed = JSON.parse(storedData);
      parsed.name = newName;
      if (newAvatar !== undefined) parsed.avatar = newAvatar;
      
      localStorage.setItem("userData", JSON.stringify(parsed));
      
      // Сповіщаємо навбар та миттєво оновлюємо сторінку
      window.dispatchEvent(new Event("userDataUpdated"));
      window.location.reload();
    } catch (e) {
      console.error("Помилка збереження даних:", e);
    }
  };

  const handleNameEditClick = () => {
    if (!isEditingName) {
      setIsEditingName(true);
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    saveUserData(userName, avatar);
  };

  // --- ЛОГІКА ЗМІНИ ПАРОЛЯ ---
  const handlePasswordChange = () => {
    setPasswordMessage("");
    const storedData = localStorage.getItem("userData");
    
    if (!storedData) {
      setPasswordMessage("Помилка: користувача не знайдено.");
      return;
    }
    
    try {
      const parsed = JSON.parse(storedData);
      
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        setPasswordMessage("Заповніть усі поля.");
        return;
      }
      
      if (parsed.password !== currentPassword) {
        setPasswordMessage("Неправильний поточний пароль.");
        return;
      }
      
      if (newPassword !== confirmNewPassword) {
        setPasswordMessage("Нові паролі не співпадають.");
        return;
      }
      
      // Зберігаємо новий пароль
      parsed.password = newPassword;
      localStorage.setItem("userData", JSON.stringify(parsed));
      
      // Очищаємо поля і показуємо успіх
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordMessage("Пароль успішно змінено!");
      
      setTimeout(() => setPasswordMessage(""), 3000);
      
    } catch (error) {
      console.error("Помилка зміни пароля:", error);
      setPasswordMessage("Сталася помилка при збереженні.");
    }
  };

  // --- ЛОГІКА ЗАВАНТАЖЕННЯ ФОТО ---
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        saveUserData(userName, base64String);
      };
      reader.readAsDataURL(file); 
    }
  };

  const handleSelect = (day: string, type: string, hour: string) => {
    setSelectedTime((prev) => ({ ...prev, [`${day}-${type}`]: hour }));
    setOpenPicker(null);
  };

  const days = [
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "П'ятниця",
    "Субота",
    "Неділя",
  ];

  return (
    <div className="profile-container">
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: "none" }} 
      />

      <div className="prof-body">
        {isGuest ? (
          /* ГОСТЬОВИЙ РЕЖИМ */
          <>
            <div className="prof-info">
              <p className="profile-text">Профіль користувача</p>
              <div className="guest-mode">
                <div className="guest-icon">
                  <FontAwesomeIcon
                    icon={faUserGraduate}
                    className="responsive-profile-icon"
                  />
                </div>
                <div className="guest-auth">
                  <p className="message">
                    Не витрачай час на повторні налаштування. <br />
                    Створи акаунт, щоб твої дані завжди залишалися з тобою на
                    будь-якому пристрої.
                  </p>
                  <button
                    className="register-btn"
                    onClick={() => setCurrentScreen("signup")}
                    style={{ marginBottom: 5 }}
                  >
                    Створити акаунт
                  </button>
                </div>
              </div>
            </div>

            <div className="work-hours-block">
              <p className="profile-text" style={{ marginBottom: 8 }}>
                Робочі години
              </p>
              <div className="days-list">
                {days.map((day) => (
                  <div
                    key={day}
                    className={`day-row ${openPicker?.startsWith(day) ? "active-row" : ""}`}
                  >
                    <div className="day-info">
                      <span className="day-label">{day}</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          defaultChecked={day !== "Sat" && day !== "Sun"}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="time-controls">
                      <div className="custom-dropdown-container">
                        <div
                          className="time-picker-trigger"
                          onClick={() => setOpenPicker(openPicker === `${day}-from` ? null : `${day}-from`)}
                        >
                          <Clock size={18} color="#5c4b75" />
                          <span>{selectedTime[`${day}-from`] || "09:00"}</span>
                        </div>
                        {openPicker === `${day}-from` && (
                          <div className="dropdown-list-portal">
                            {hours.map((h) => (
                              <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "from", h)}>
                                {h}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="separator">—</span>

                      <div className="custom-dropdown-container">
                        <div
                          className="time-picker-trigger"
                          onClick={() => setOpenPicker(openPicker === `${day}-to` ? null : `${day}-to`)}
                        >
                          <Clock size={18} color="#5c4b75" />
                          <span>{selectedTime[`${day}-to`] || "17:00"}</span>
                        </div>
                        {openPicker === `${day}-to` && (
                          <div className="dropdown-list-portal">
                            {hours.map((h) => (
                              <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "to", h)}>
                                {h}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* АВТОРИЗОВАНИЙ РЕЖИМ */
          <div className="auth-profile-card">
            
            <div className="auth-header">
              <h2 className="auth-title">Мій профіль</h2>
              <p className="auth-subtitle">Керуйте своєю особистою інформацією та налаштуваннями.</p>
            </div>

            {/* Секція 1: Особисті дані */}
            <div className="auth-section">
              <div className="auth-section-header">
                <div className="auth-icon-bg"><User size={22} color="#5c4b75"/></div>
                <div className="auth-section-text">
                  <h3>Особисті дані</h3>
                  <p>Оновіть своє фото та ім'я.</p>
                </div>
              </div>
              
              <div className="auth-personal-content">
                <div className="auth-avatar-block">
                  <div className="auth-avatar">
                    {avatar ? (
                      <img 
                        src={avatar} 
                        alt="Avatar" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                      />
                    ) : (
                      userName.charAt(0).toUpperCase() || "A"
                    )}
                    
                    <button className="edit-avatar-btn" onClick={handlePhotoClick}>
                      <Pencil size={16} color="#5c4b75" />
                    </button>
                  </div>
                </div>
                
                <div className="auth-name-block">
                  <label>Ім'я</label>
                  <div className={`auth-input-wrapper ${isEditingName ? 'editing' : ''}`} onClick={handleNameEditClick}>
                    <input 
                      type="text" 
                      ref={nameInputRef}
                      value={userName} 
                      readOnly={!isEditingName}
                      onChange={(e) => setUserName(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter') handleNameSave() }}
                    />
                    
                    {isEditingName ? (
                      <button 
                        className="save-name-btn" 
                        onClick={(e) => { 
                          e.stopPropagation();
                          handleNameSave(); 
                        }}
                      >
                        <Check size={18} color="#fff" />
                      </button>
                    ) : (
                      <Pencil size={18} color="#5c4b75" className="input-edit-icon" />
                    )}
                  </div>
                  <span className="input-hint">Так ваше ім'я відображатиметься в UniMind.</span>
                </div>
              </div>
            </div>

            <div className="auth-divider"></div>

            {/* Секція 2: Безпека (ОНОВЛЕНО: Тепер з акордеоном та іконками ока) */}
            <div className="auth-section accordion" onClick={() => setIsSecurityOpen(!isSecurityOpen)}>
              <div className="auth-section-header">
                <div className="auth-icon-bg"><Shield size={22} color="#5c4b75"/></div>
                <div className="auth-section-text">
                  <h3>Безпека</h3>
                  <p>Змініть пароль та захистіть свій акаунт.</p>
                </div>
                <ChevronDown size={24} color="#5c4b75" className={`accordion-arrow ${isSecurityOpen ? 'open' : ''}`}/>
              </div>
              
              {/* Вміст акордеону Безпеки */}
              {isSecurityOpen && (
                <div className="security-dropdown-content" onClick={(e) => e.stopPropagation()}>
                  <div className="security-form-container">
                    
                    <div className="security-input-group">
                      <label>Поточний пароль</label>
                      <div className="security-input-wrapper">
                        <input 
                          type={showCurrentPassword ? "text" : "password"} 
                          placeholder="Введіть поточний пароль"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <button type="button" className="security-eye-btn" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                          {showCurrentPassword ? <EyeOff size={20} color="#5c4b75" /> : <Eye size={20} color="#5c4b75" />}
                        </button>
                      </div>
                    </div>

                    <div className="security-input-group">
                      <label>Новий пароль</label>
                      <div className="security-input-wrapper">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          placeholder="Введіть новий пароль"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button type="button" className="security-eye-btn" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff size={20} color="#5c4b75" /> : <Eye size={20} color="#5c4b75" />}
                        </button>
                      </div>
                    </div>

                    <div className="security-input-group">
                      <label>Підтвердження пароля</label>
                      <div className="security-input-wrapper">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Підтвердіть новий пароль"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                        <button type="button" className="security-eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={20} color="#5c4b75" /> : <Eye size={20} color="#5c4b75" />}
                        </button>
                      </div>
                    </div>

                    {/* Повідомлення про статус */}
                    {passwordMessage && (
                      <div className={`password-message ${passwordMessage.includes("успішно") ? "success" : "error"}`}>
                        {passwordMessage}
                      </div>
                    )}

                    <button className="security-save-btn" onClick={handlePasswordChange}>
                      <Lock size={18} /> Оновити пароль
                    </button>

                  </div>
                </div>
              )}
            </div>

            <div className="auth-divider"></div>

            {/* Секція 3: Робочі години */}
            <div className="auth-section accordion" onClick={() => setIsWorkHoursOpen(!isWorkHoursOpen)}>
              <div className="auth-section-header">
                <div className="auth-icon-bg"><Clock size={22} color="#5c4b75"/></div>
                <div className="auth-section-text">
                  <h3>Робочі години</h3>
                  <p>Налаштуйте свій графік та доступність.</p>
                </div>
                <ChevronDown size={24} color="#5c4b75" className={`accordion-arrow ${isWorkHoursOpen ? 'open' : ''}`}/>
              </div>
              
              {isWorkHoursOpen && (
                <div className="work-hours-dropdown-content" onClick={(e) => e.stopPropagation()}>
                  <div className="days-list" style={{ marginTop: '20px' }}>
                    {days.map((day) => (
                      <div key={day} className={`day-row ${openPicker?.startsWith(day) ? "active-row" : ""}`}>
                        <div className="day-info">
                          <span className="day-label">{day}</span>
                          <label className="switch">
                            <input type="checkbox" defaultChecked={day !== "Sat" && day !== "Sun"} />
                            <span className="slider round"></span>
                          </label>
                        </div>

                        <div className="time-controls">
                          <div className="custom-dropdown-container">
                            <div
                              className="time-picker-trigger"
                              onClick={() => setOpenPicker(openPicker === `${day}-from` ? null : `${day}-from`)}
                            >
                              <Clock size={18} color="#5c4b75" />
                              <span>{selectedTime[`${day}-from`] || "09:00"}</span>
                            </div>
                            {openPicker === `${day}-from` && (
                              <div className="dropdown-list-portal">
                                {hours.map((h) => (
                                  <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "from", h)}>
                                    {h}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className="separator">—</span>

                          <div className="custom-dropdown-container">
                            <div
                              className="time-picker-trigger"
                              onClick={() => setOpenPicker(openPicker === `${day}-to` ? null : `${day}-to`)}
                            >
                              <Clock size={18} color="#5c4b75" />
                              <span>{selectedTime[`${day}-to`] || "17:00"}</span>
                            </div>
                            {openPicker === `${day}-to` && (
                              <div className="dropdown-list-portal">
                                {hours.map((h) => (
                                  <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "to", h)}>
                                    {h}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="auth-divider"></div>

            <button className="auth-logout-btn" onClick={handleLogout}>
              <LogOut size={22} /> Вийти з акаунта
            </button>

          </div>
        )}
      </div>
    </div>
  );
};