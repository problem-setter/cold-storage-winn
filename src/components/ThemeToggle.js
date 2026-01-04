import './ThemeToggle.css';

const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="theme-toggle-wrapper">
      <button
        type="button"
        className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-label="Toggle dark mode"
        aria-pressed={isDark}
      >
        <span className="theme-icon" aria-hidden="true">{isDark ? '🌙' : '☀️'}</span>
        <span className="theme-track">
          <span className="theme-thumb" />
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;
