import { useNavigate } from 'react-router-dom';
import './LogoutButton.css';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      window.localStorage.removeItem('isLoggedIn');
      navigate('/');
    }
  };

  return (
    <button
      type="button"
      className="logout-fab"
      onClick={handleLogout}
      aria-label="Logout"
      title="Logout"
    >
      <span className="logout-icon" aria-hidden="true">🚪</span>
    </button>
  );
};

export default LogoutButton;
