
interface HeaderSectionProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

// Header section with title, description, and dark mode toggle
const HeaderSection: React.FC<HeaderSectionProps> = ({ darkMode, onToggleDarkMode }) => (
  <>
    <button
      className={`mode-toggle-btn${darkMode ? ' dark' : ''}`}
      onClick={onToggleDarkMode}
    >
      {darkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
    <header style={{ textAlign: 'center' }}>
      <h1
        style={{
          fontWeight: 700,
          letterSpacing: 0.5,
          color: darkMode ? '#fff' : undefined,
          textShadow: darkMode
            ? '0 2px 8px #00cfff88, 0 1px 0 #222'
            : undefined,
        }}
      >
        LLM Powered Chart Maker
      </h1>
      <div className="small">Highlight text, then pick a color to highlight. Click Generate for selection to create a diagram for just that content.</div>
    </header>
  </>
);

export default HeaderSection;
