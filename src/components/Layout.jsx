import Sidebar from './Sidebar';

export default function Layout({
  children,
  menuOpen,
  setMenuOpen,
  currentPage,
  setCurrentPage,
  email,
  role,
  onLogout,
}) {
  return (
    <>
      <header className="topbar">
        <button className="menu-button" onClick={() => setMenuOpen(true)}>☰</button>
        <div>
          <h1>🦔 Harimaro Memories</h1>
          <p>はりまろとの思い出を、大切に残そう。</p>
        </div>
      </header>

      <Sidebar
        open={menuOpen}
        currentPage={currentPage}
        role={role}
        email={email}
        onClose={() => setMenuOpen(false)}
        onNavigate={setCurrentPage}
        onLogout={onLogout}
      />

      <main className="app-main">{children}</main>
    </>
  );
}
