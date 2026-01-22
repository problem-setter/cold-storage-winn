import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const username = form.username.value;
    const password = form.password.value;

    if (username === '123' && password === '123') {
      setError('');
      window.localStorage.setItem('isLoggedIn', 'true');
      navigate('/dashboard', { replace: true });
    } else {
      setError('Failed to login. Invalid username or password.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <main className="page login-page">
      <div className="login-container card">
        <div className="login-title">
          <h1>COLD STORAGE MONITORING</h1>
        </div>

        <div className="login-form">
          <form onSubmit={handleLogin} autoComplete="off">
            {error && <div className="login-error">{error}</div>}

            <div>
              <label htmlFor="username">Username</label>
              <div className="login-box">
                <span className="login-icon">👤</span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Input Username"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <div className="login-box">
                <span className="login-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Input Password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  👁
                </button>
              </div>
            </div>

            <div className="login-button">
              {/* ⛔ BUKAN submit */}
              <button type="submit">Get Started</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
