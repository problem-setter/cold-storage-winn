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

  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

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
