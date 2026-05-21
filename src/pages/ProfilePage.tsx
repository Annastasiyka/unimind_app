import { motion } from "framer-motion"; 
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGraduate } from "@fortawesome/free-solid-svg-icons";
import React, { useState, useRef, useEffect } from "react";
import localforage from "localforage";
import { Clock, User, Shield, Pencil, ChevronDown, LogOut, Check, Eye, EyeOff, Lock } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface UserData {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  workSchedule?: {
    times?: Record<string, string>;
    days?: Record<string, boolean>;
  };
}

interface ProfilePageProps {
  handleLogout: () => void;
  setCurrentScreen: (screen: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) =>
  i < 10 ? `0${i}:00` : `${i}:00`,
);

const resizeAvatar = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200; 
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      } else {
        resolve(base64Str);
      }
    };
  });
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  handleLogout,
  setCurrentScreen,
}) => {
  const [isLoading, setIsLoading] = useState(true); // Для контролю плавності
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [userName, setUserName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<{ [key: string]: string }>({});
  const [activeDays, setActiveDays] = useState<{ [key: string]: boolean }>({
    "Понеділок": true, "Вівторок": true, "Середа": true, 
    "Четвер": true, "П'ятниця": true, "Субота": false, "Неділя": false
  });

  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isWorkHoursOpen, setIsWorkHoursOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      const guestStatus = await localforage.getItem("isGuest") === "true";
      setIsGuest(guestStatus);

      const storedUser = await localforage.getItem<UserData>("userData");
      const nameKey = guestStatus ? "Гість" : (storedUser?.name || "user");

      setUserName(guestStatus ? "Гість" : (storedUser?.name || "Користувач"));
      setAvatar(storedUser?.avatar || null);

      const savedTimes = await localforage.getItem<{ [key: string]: string }>(`unimind-work-times-${nameKey}`);
      if (savedTimes) setSelectedTime(savedTimes);

      const savedDays = await localforage.getItem<{ [key: string]: boolean }>(`unimind-active-days-${nameKey}`);
      if (savedDays) setActiveDays(savedDays);

      if (!guestStatus && storedUser?.id) {
        try {
          const response = await fetch(`${API_URL}/profile/${storedUser.id}`);
          const data = await response.json();
          if (response.ok) {
            setUserName(data.name);
            setAvatar(data.avatar);
            if (data.workSchedule) {
              setSelectedTime(data.workSchedule.times || {});
              setActiveDays(data.workSchedule.days || {});
            }
          }
        } catch (error) {
          console.error("Помилка:", error);
        }
      }
      setIsLoading(false); 
    };
    initProfile();
  }, []);

  const saveWorkSchedule = async (newTimes: { [key: string]: string }, newActiveDays: { [key: string]: boolean }) => {
    const nameKey = isGuest ? "Гість" : userName;
    await localforage.setItem(`unimind-work-times-${nameKey}`, newTimes);
    await localforage.setItem(`unimind-active-days-${nameKey}`, newActiveDays);
    if (!isGuest) {
      try {
        const storedUser = await localforage.getItem<UserData>("userData");
        if (storedUser?.id) {
          await fetch(`${API_URL}/profile/update-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: storedUser.id, schedule: { times: newTimes, days: newActiveDays } }),
          });
        }
      } catch (error) { console.error(error); }
    }
  };

  const saveUserData = async (newName: string, newAvatar: string | null) => {
    const storedUser = (await localforage.getItem<UserData>("userData")) || ({} as UserData);
    if (!isGuest && storedUser.id) {
      try {
        const response = await fetch(`${API_URL}/profile/update-info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: storedUser.id, name: newName, avatar: newAvatar }),
        });
        if (response.ok) {
          const data = await response.json();
          const updatedUser = { ...storedUser, name: data.user.name, avatar: data.user.avatar };
          await localforage.setItem("userData", updatedUser);
          window.dispatchEvent(new Event("userDataUpdated"));
        }
      } catch (error) { console.error(error); }
    } else {
      const updatedUser = { ...storedUser, name: newName, avatar: newAvatar };
      await localforage.setItem("userData", updatedUser);
      window.dispatchEvent(new Event("userDataUpdated"));
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage("");
    if (!currentPassword || !newPassword || !confirmNewPassword) { setPasswordMessage("Заповніть усі поля."); return; }
    if (newPassword !== confirmNewPassword) { setPasswordMessage("Нові паролі не співпадають."); return; }
    try {
      const storedUser = await localforage.getItem<UserData>("userData");
      if (!storedUser?.id) return;
      const response = await fetch(`${API_URL}/profile/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: storedUser.id, currentPassword, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setPasswordMessage("Пароль успішно змінено!");
        setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
      } else { setPasswordMessage(data.message || "Помилка"); }
    } catch { setPasswordMessage("Сервер недоступний"); }
  };

  const handlePhotoClick = () => fileInputRef.current?.click();
  const handleNameEditClick = () => { setIsEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 0); };
  const handleNameSave = () => { setIsEditingName(false); saveUserData(userName, avatar); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resizedBase64 = await resizeAvatar(reader.result as string);
        setAvatar(resizedBase64);
        saveUserData(userName, resizedBase64); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleDay = (day: string) => {
    const updatedDays = { ...activeDays, [day]: !activeDays[day] };
    setActiveDays(updatedDays);
    saveWorkSchedule(selectedTime, updatedDays);
  };

  const handleSelect = (day: string, type: string, hour: string) => {
    const updatedTimes = { ...selectedTime, [`${day}-${type}`]: hour };
    setSelectedTime(updatedTimes);
    setOpenPicker(null);
    saveWorkSchedule(updatedTimes, activeDays);
  };

  const days = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

  if (isLoading) return <div className="profile-container" style={{ opacity: 0 }} />;

  return (
    <motion.div 
      className="profile-container"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
    >
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />

      <div className="prof-body">
        {isGuest ? (
          <>
            <div className="prof-info">
              <p className="profile-text">Профіль користувача</p>
              <div className="guest-mode">
                <div className="guest-icon">
                  <FontAwesomeIcon icon={faUserGraduate} className="responsive-profile-icon" />
                </div>
                <div className="guest-auth">
                  <p className="message">
                    Не витрачай час на повторні налаштування. <br />
                    Створи акаунт, щоб твої дані завжди залишалися з тобою.
                  </p>
                  <button className="register-btn" onClick={() => setCurrentScreen("signup")}>
                    Створити акаунт
                  </button>
                </div>
              </div>
            </div>

            <div className="work-hours-block">
              <p className="profile-text" style={{ marginBottom: 8 }}>Робочі години</p>
              <div className="days-list">
                {days.map((day) => (
                  <div key={day} className={`day-row ${openPicker?.startsWith(day) ? "active-row" : ""}`}>
                    <div className="day-info">
                      <span className="day-label">{day}</span>
                      <label className="switch">
                        <input type="checkbox" checked={activeDays[day]} onChange={() => handleToggleDay(day)} />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    <div className="time-controls" style={{ opacity: activeDays[day] ? 1 : 0.5, pointerEvents: activeDays[day] ? "auto" : "none" }}>
                      <div className="custom-dropdown-container">
                        <div className="time-picker-trigger" onClick={() => setOpenPicker(openPicker === `${day}-from` ? null : `${day}-from`)}>
                          <Clock size={18} color="#5c4b75" />
                          <span>{selectedTime[`${day}-from`] || "09:00"}</span>
                        </div>
                        {openPicker === `${day}-from` && (
                          <div className="dropdown-list-portal">
                            {hours.map((h) => <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "from", h)}>{h}</div>)}
                          </div>
                        )}
                      </div>
                      <span className="separator">—</span>
                      <div className="custom-dropdown-container">
                        <div className="time-picker-trigger" onClick={() => setOpenPicker(openPicker === `${day}-to` ? null : `${day}-to`)}>
                          <Clock size={18} color="#5c4b75" />
                          <span>{selectedTime[`${day}-to`] || "17:00"}</span>
                        </div>
                        {openPicker === `${day}-to` && (
                          <div className="dropdown-list-portal">
                            {hours.map((h) => <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "to", h)}>{h}</div>)}
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
          <div className="auth-profile-card">
            <div className="auth-header">
              <h2 className="auth-title">Мій профіль</h2>
              <p className="auth-subtitle">Керуйте своєю особистою інформацією та налаштуваннями.</p>
            </div>

            <div className="auth-section">
              <div className="auth-section-header">
                <div className="auth-icon-bg"><User size={22} color="#5c4b75"/></div>
                <div className="auth-section-text">
                  <h3>Особисті дані</h3>
                  <p>Оновіть фото та ім'я.</p>
                </div>
              </div>
              <div className="auth-personal-content">
                <div className="auth-avatar-block">
                  <div className="auth-avatar">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
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
                      <button className="save-name-btn" onClick={(e) => { e.stopPropagation(); handleNameSave(); }}>
                        <Check size={18} color="#fff" />
                      </button>
                    ) : (
                      <Pencil size={18} color="#5c4b75" className="input-edit-icon" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-divider"></div>

            <div className="auth-section accordion" onClick={() => setIsSecurityOpen(!isSecurityOpen)}>
              <div className="auth-section-header">
                <div className="auth-icon-bg"><Shield size={22} color="#5c4b75"/></div>
                <div className="auth-section-text">
                  <h3>Безпека</h3>
                  <p>Змініть пароль та захистіть свій акаунт.</p>
                </div>
                <ChevronDown size={24} color="#5c4b75" className={`accordion-arrow ${isSecurityOpen ? 'open' : ''}`}/>
              </div>
              
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
                      <label>Підтвердження</label>
                      <div className="security-input-wrapper">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Підтвердіть пароль"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                        <button type="button" className="security-eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={20} color="#5c4b75" /> : <Eye size={20} color="#5c4b75" />}
                        </button>
                      </div>
                    </div>
                    {passwordMessage && <div className={`password-message ${passwordMessage.includes("успішно") ? "success" : "error"}`}>{passwordMessage}</div>}
                    <button className="security-save-btn" onClick={handlePasswordChange}>
                      <Lock size={18} /> Оновити пароль
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="auth-divider"></div>

            <div className="auth-section accordion" onClick={() => setIsWorkHoursOpen(!isWorkHoursOpen)}>
              <div className="auth-section-header">
                <div className="auth-icon-bg"><Clock size={22} color="#5c4b75"/></div>
                <div className="auth-section-text">
                  <h3>Робочі години</h3>
                  <p>Налаштуйте свій графік.</p>
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
                            <input type="checkbox" checked={activeDays[day]} onChange={() => handleToggleDay(day)} />
                            <span className="slider round"></span>
                          </label>
                        </div>
                        <div className="time-controls" style={{ opacity: activeDays[day] ? 1 : 0.5 }}>
                          <div className="custom-dropdown-container">
                            <div className="time-picker-trigger" onClick={() => activeDays[day] && setOpenPicker(openPicker === `${day}-from` ? null : `${day}-from`)}>
                              <Clock size={18} color="#5c4b75" />
                              <span>{selectedTime[`${day}-from`] || "09:00"}</span>
                            </div>
                            {openPicker === `${day}-from` && (
                              <div className="dropdown-list-portal">
                                {hours.map((h) => <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "from", h)}>{h}</div>)}
                              </div>
                            )}
                          </div>
                          <span className="separator">—</span>
                          <div className="custom-dropdown-container">
                            <div className="time-picker-trigger" onClick={() => activeDays[day] && setOpenPicker(openPicker === `${day}-to` ? null : `${day}-to`)}>
                              <Clock size={18} color="#5c4b75" />
                              <span>{selectedTime[`${day}-to`] || "17:00"}</span>
                            </div>
                            {openPicker === `${day}-to` && (
                              <div className="dropdown-list-portal">
                                {hours.map((h) => <div key={h} className="dropdown-item" onClick={() => handleSelect(day, "to", h)}>{h}</div>)}
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

            <button className="auth-logout-btn" onClick={handleLogout}>
              <LogOut size={22} /> Вийти з акаунта
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};