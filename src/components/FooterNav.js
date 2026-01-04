import { useLocation, useNavigate } from 'react-router-dom';
import './FooterNav.css';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/statistics', label: 'Statistics', icon: '📈' },
  { path: '/history', label: 'History', icon: '📜' },
];

const FooterNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <footer className="footer">
      <div className="menu">
        <div className="menu-bar">
          {menuItems.map(({ path, label, icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                type="button"
                className={`menu-button ${isActive ? 'active' : ''}`}
                onClick={() => navigate(path)}
              >
                <span className="icon" aria-hidden="true">{icon}</span>
                <span className="label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default FooterNav;
