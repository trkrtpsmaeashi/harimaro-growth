import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import PhotoModal from './components/PhotoModal';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import NewRecordPage from './pages/NewRecordPage';
import RecordsPage from './pages/RecordsPage';
import ChartPage from './pages/ChartPage';
import PhotosPage from './pages/PhotosPage';
import TagsPage from './pages/TagsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  async function loadRecords() {
    const { data, error } = await supabase
      .from('hedgehog_records')
      .select('*')
      .order('recorded_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    setRecords(data || []);
  }

  async function deleteRecord(id, photoPath) {
    if (!confirm('この記録を削除する？')) return;
    if (photoPath) await supabase.storage.from('harimaro-photos').remove([photoPath]);
    await supabase.from('hedgehog_records').delete().eq('id', id);
    await loadRecords();
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (nextUser) await loadRecords();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!user) return <LoginPage />;

  let content;

  if (page === 'new') {
    content = (
      <NewRecordPage
        user={user}
        onSaved={async () => {
          await loadRecords();
          setPage('home');
        }}
        onCancel={() => setPage('home')}
      />
    );
  } else if (page === 'records') {
    content = <RecordsPage records={records} onPhoto={setPhotoUrl} onDelete={deleteRecord} />;
  } else if (page === 'chart') {
    content = <ChartPage records={records} />;
  } else if (page === 'photos') {
    content = <PhotosPage records={records} onPhoto={setPhotoUrl} />;
  } else if (page === 'tags') {
    content = <TagsPage records={records} onPhoto={setPhotoUrl} onDelete={deleteRecord} />;
  } else if (page === 'settings') {
    content = <SettingsPage email={user.email} count={records.length} />;
  } else {
    content = (
      <HomePage
        records={records}
        onNavigate={setPage}
        onPhoto={setPhotoUrl}
        onDelete={deleteRecord}
      />
    );
  }

  return (
    <>
      <Layout
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        currentPage={page}
        setCurrentPage={setPage}
        email={user.email}
        onLogout={() => supabase.auth.signOut()}
      >
        {content}
      </Layout>

      <PhotoModal url={photoUrl} onClose={() => setPhotoUrl('')} />
    </>
  );
}
