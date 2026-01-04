import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');

    if (username === '123' && password === '123') {
      setError('');
      navigate('/dashboard');
    } else {
      setError('Failed to login. Invalid username or password.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <main className="page login-page">
      <div className="login-container card">
        <div className="login-title">
          <h1>COLD STORAGE MONITORING</h1>
        </div>
        <div className="login-form">
          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}
            <div>
              <label htmlFor="username">Username</label>
              <div className="login-box">
                <span className="login-icon" aria-hidden="true">👤</span>
                <input type="text" id="username" name="username" placeholder="Input Username" required />
              </div>
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <div className="login-box">
                <span className="login-icon" aria-hidden="true">🔒</span>
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Input Password" required />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showPassword ? (
                      <>
                        <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M10.5 10.677a2 2 0 002.823 2.823" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M7.362 7.561C5.68 8.74 4.279 10.42 3 12c1.889 2.991 5.282 6 9 6 1.55 0 3.043-.523 4.395-1.35M12 6c3.718 0 7.111 3.009 9 6-.525.831-1.129 1.622-1.804 2.355" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    ) : (
                      <>
                        <path d="M12 5C8.24 5 4.82 7.58 3 12c1.82 4.42 5.24 7 9 7s7.18-2.58 9-7c-1.82-4.42-5.24-7-9-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <div className="login-button">
              <input type="submit" id="login" name="login" value="Get Started" />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
