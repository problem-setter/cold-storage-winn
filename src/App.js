import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import FooterNav from './components/FooterNav';
import Header from './components/Header';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import LogoutButton from './components/LogoutButton';
import StatisticsPage from './pages/StatisticsPage';
import ThemeToggle from './components/ThemeToggle';
import { requestFCMToken, onMessageListener } from './firebase-messaging'; // ✅ TAMBAH INI
import './App.css';

const AppLayout = ({ theme, onToggleTheme }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/';

  return (
    <div className="app-shell">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      {!isLoginPage && <LogoutButton />}
      {!isLoginPage && <Header theme={theme} onToggleTheme={onToggleTheme} />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isLoginPage && <FooterNav />}
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem('theme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  /* ===== THEME ===== */
  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  /* ===== 🔥 FCM TOKEN (GLOBAL, SEKALI) ===== */
  useEffect(() => {
    const initNotifications = async () => {
      console.log('🔥 REQUEST FCM TOKEN FROM APP');
      const token = await requestFCMToken();

      if (token) {
        console.log('✅ FCM token ready globally');

        // Setup foreground message listener globally
        onMessageListener((payload) => {
          console.log('📨 Global foreground message:', payload);
          const { title, body } = payload.notification || {};
          if (title && Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/logo192.png',
              tag: 'cold-storage-notification',
              requireInteraction: true,
              vibrate: [200, 100, 200]
            });
          }
        });
      }
    };

    initNotifications();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router>
      <AppLayout theme={theme} onToggleTheme={toggleTheme} />
    </Router>
  );
}

export default App;
