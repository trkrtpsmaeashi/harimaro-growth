export default function Sidebar({
  open,
  currentPage,
  email,
  onClose,
  onNavigate,
  onLogout,
}) {
  const items = [
    ['home', '🏠', 'ホーム'],
    ['new', '➕', '新しい記録'],
    ['records', '📚', '記録一覧'],
    ['memories', '📷', 'Memories'],
    ['chart', '📈', '成長グラフ'],
    ['photos', '🖼️', '記録写真'],
    ['tags', '🏷️', 'タグ検索'],
    ['calendar', '📅', 'カレンダー'],
    ['settings', '⚙️', '設定'],
  ];

  return (
    <>
      {open && <button className="overlay" aria-label="閉じる" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <h2>🦔 Harimaro Memories</h2>
            <p>はりまろとの毎日</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <nav className="sidebar-nav">
          {items.map(([id, icon, label]) => (
            <button
              key={id}
              className={`nav-button ${currentPage === id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(id);
                onClose();
              }}
            >
              <span>{icon}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="account-box">
            <span>ログイン中</span>
            <strong>{email}</strong>
          </div>
          <button className="logout-button" onClick={onLogout}>
            🚪 ログアウト
          </button>
        </div>
      </aside>
    </>
  );
}
