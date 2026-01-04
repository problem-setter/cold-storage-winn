import { useNavigate } from 'react-router-dom';
import './LogoutButton.css';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      navigate('/');
    }
  };

  return (
    <div className="logout-wrapper">
      <button
        type="button"
        className="logout-button"
        onClick={handleLogout}
        aria-label="Logout"
      >
        <span className="logout-icon" aria-hidden="true">🚪</span>
        <span className="logout-text">Log out</span>
      </button>
    </div>
  );
};

export default LogoutButton;
