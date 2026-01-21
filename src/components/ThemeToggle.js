import './ThemeToggle.css';

const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-pill ${isDark ? 'dark' : 'light'}`}
      onClick={onToggle}
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      <span className="theme-symbol" aria-hidden="true">
        {isDark ? '🌙' : '☀️'}
      </span>
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </button>
  );
};

export default ThemeToggle;
