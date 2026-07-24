import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import PhotoModal from './components/PhotoModal';
import MemoryDetailModal from './components/MemoryDetailModal';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import NewRecordPage from './pages/NewRecordPage';
import RecordsPage from './pages/RecordsPage';
import MemoriesPage from './pages/MemoriesPage';
import ChartPage from './pages/ChartPage';
import PhotosPage from './pages/PhotosPage';
import TagsPage from './pages/TagsPage';
import SettingsPage from './pages/SettingsPage';
import CalendarPage from './pages/CalendarPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import SlideshowPage from './pages/SlideshowPage';
import TimelinePage from './pages/TimelinePage';

export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [memories, setMemories] = useState([]);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [detailPost, setDetailPost] = useState(null);
  const [detailIndex, setDetailIndex] = useState(0);

  async function loadRecords() {
    const { data, error } = await supabase
      .from('hedgehog_records')
      .select('*')
      .order('recorded_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    setRecords(data || []);
  }

  async function loadMemories() {
    const { data, error } = await supabase
      .from('harimaro_memory_posts')
      .select(`
        *,
        photos:harimaro_memory_photos (
          id,
          photo_url,
          photo_path,
          sort_order
        )
      `)
      .order('memory_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const normalized = (data || []).map((post) => ({
      ...post,
      photos: [...(post.photos || [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));

    setMemories(normalized);
  }


  async function loadEvents() {
    const { data, error } = await supabase
      .from('harimaro_events')
      .select(`
        *,
        photos:harimaro_event_photos (
          id,
          photo_url,
          photo_path,
          sort_order
        )
      `)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const normalized = (data || []).map((event) => ({
      ...event,
      photos: [...(event.photos || [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));

    setEvents(normalized);
  }

  async function loadAll() {
    await Promise.all([loadRecords(), loadMemories(), loadEvents()]);
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
      if (nextUser) await loadAll();
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
  } else if (page === 'memories') {
    content = (
      <MemoriesPage
        user={user}
        memories={memories}
        onReload={loadMemories}
        onOpenDetail={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
      />
    );
  } else if (page === 'chart') {
    content = <ChartPage records={records} />;
  } else if (page === 'photos') {
    content = <PhotosPage records={records} onPhoto={setPhotoUrl} />;
  } else if (page === 'tags') {
    content = (
      <TagsPage
        records={records}
        memories={memories}
        onPhoto={setPhotoUrl}
        onDelete={deleteRecord}
        onOpenMemory={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
      />
    );
  } else if (page === 'calendar') {
    content = (
      <CalendarPage
        records={records}
        memories={memories}
        onPhoto={setPhotoUrl}
        onOpenMemory={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
      />
    );
  } else if (page === 'report') {
    content = (
      <MonthlyReportPage
        records={records}
        memories={memories}
        onPhoto={setPhotoUrl}
        onOpenMemory={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
      />
    );
  } else if (page === 'slideshow') {
    content = (
      <SlideshowPage
        memories={memories}
        onOpenMemory={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
      />
    );
  } else if (page === 'timeline') {
    content = (
      <TimelinePage
        user={user}
        records={records}
        memories={memories}
        events={events}
        onReloadEvents={loadEvents}
        onPhoto={setPhotoUrl}
        onOpenMemory={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
      />
    );
  } else if (page === 'settings') {
    content = <SettingsPage email={user.email} count={records.length} />;
  } else {
    content = (
      <HomePage
        records={records}
        memories={memories}
        onNavigate={setPage}
        onPhoto={setPhotoUrl}
        onDelete={deleteRecord}
        onOpenMemory={(post, index) => {
          setDetailPost(post);
          setDetailIndex(index);
        }}
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

      <MemoryDetailModal
        post={detailPost}
        initialIndex={detailIndex}
        onClose={() => setDetailPost(null)}
        onToggleFavorite={async (post) => {
          const { error } = await supabase
            .from('harimaro_memory_posts')
            .update({ is_favorite: !post.is_favorite })
            .eq('id', post.id);

          if (error) {
            alert(error.message);
            return;
          }

          await loadMemories();

          setDetailPost((current) =>
            current
              ? { ...current, is_favorite: !current.is_favorite }
              : current
          );
        }}
      />
    </>
  );
}
