import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ensureHousehold, loadHouseholdSummary } from './lib/household';
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
import ChecklistPage from './pages/ChecklistPage';
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from './lib/notificationSettings';
import {
  loadHomeLayout,
  saveHomeLayout,
  resetHomeLayout,
} from './lib/homeLayoutSettings';

export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [household, setHousehold] = useState(null);

  const canEdit =
    household?.my_role === 'owner' || household?.my_role === 'editor';
  const isViewer = household?.my_role === 'viewer';
  const [memories, setMemories] = useState([]);
  const [events, setEvents] = useState([]);
  const [checkItems, setCheckItems] = useState([]);
  const [checkLogs, setCheckLogs] = useState([]);
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [detailPost, setDetailPost] = useState(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState(
    loadNotificationSettings
  );
  const [homeLayout, setHomeLayout] = useState(loadHomeLayout);

  async function loadRecords(householdId = household?.household_id) {
    if (!householdId) return;

    const { data, error } = await supabase
      .from('hedgehog_records')
      .select('*')
      .eq('household_id', householdId)
      .order('recorded_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    setRecords(data || []);
  }

  async function loadMemories(householdId = household?.household_id) {
    if (!householdId) return;

    const { data, error } = await supabase
      .from('harimaro_memory_posts')
      .select(`
        *,
        photos:harimaro_memory_photos (
          id,
          photo_url,
          photo_path,
          media_url,
          media_path,
          media_type,
          mime_type,
          file_name,
          file_size,
          duration_seconds,
          sort_order
        )
      `)
      .eq('household_id', householdId)
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


  async function loadEvents(householdId = household?.household_id) {
    if (!householdId) return;

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
      .eq('household_id', householdId)
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


  async function loadChecklist(householdId = household?.household_id) {
    if (!householdId) return;

    const [{ data: items, error: itemsError }, { data: logs, error: logsError }] =
      await Promise.all([
        supabase
          .from('harimaro_check_items')
          .select('*')
          .eq('household_id', householdId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('harimaro_check_logs')
          .select('*')
          .eq('household_id', householdId)
          .order('check_date', { ascending: false }),
      ]);

    if (itemsError) throw itemsError;
    if (logsError) throw logsError;

    setCheckItems(items || []);
    setCheckLogs(logs || []);
  }

  async function loadAll() {
    const summary = await ensureHousehold();
    setHousehold(summary);

    await Promise.all([
      loadRecords(summary.household_id),
      loadMemories(summary.household_id),
      loadEvents(summary.household_id),
      loadChecklist(summary.household_id),
    ]);
  }

  async function refreshHousehold() {
    const summary = await loadHouseholdSummary();
    setHousehold(summary);

    await Promise.all([
      loadRecords(summary.household_id),
      loadMemories(summary.household_id),
      loadEvents(summary.household_id),
      loadChecklist(summary.household_id),
    ]);
  }

  function updateNotificationSettings(nextSettings) {
    setNotificationSettings(nextSettings);
    saveNotificationSettings(nextSettings);
  }

  function updateHomeLayout(nextLayout) {
    setHomeLayout(nextLayout);
    saveHomeLayout(nextLayout);
  }

  function restoreDefaultHomeLayout() {
    const next = resetHomeLayout();
    setHomeLayout(next);
    return next;
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

  if (!household) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-logo">🦔</div>
          <h1>Harimaro Memories</h1>
          <p>共有データを準備しています…</p>
        </section>
      </main>
    );
  }

  let content;

  if (page === 'new' && canEdit) {
    content = (
      <NewRecordPage
        user={user}
        householdId={household?.household_id}
        canEdit={canEdit}
        onSaved={async () => {
          await loadRecords();
          setPage('home');
        }}
        onCancel={() => setPage('home')}
      />
    );
  } else if (page === 'records') {
    content = (
      <RecordsPage
        records={records}
        canEdit={canEdit}
        onPhoto={setPhotoUrl}
        onDelete={canEdit ? deleteRecord : undefined}
      />
    );
  } else if (page === 'memories') {
    content = (
      <MemoriesPage
        user={user}
        householdId={household?.household_id}
        memories={memories}
        checkItems={checkItems}
        checkLogs={checkLogs}
        homeLayout={homeLayout}
        canEdit={canEdit}
        isViewer={isViewer}
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
        events={events}
        checkItems={checkItems}
        checkLogs={checkLogs}
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
        householdId={household?.household_id}
        records={records}
        canEdit={canEdit}
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
  } else if (page === 'checklist') {
    content = (
      <ChecklistPage
        user={user}
        householdId={household?.household_id}
        canEdit={canEdit}
        items={checkItems}
        logs={checkLogs}
        onReload={loadChecklist}
      />
    );
  } else if (page === 'settings') {
    content = (
      <SettingsPage
        email={user.email}
        count={records.length}
        notificationSettings={notificationSettings}
        onChangeNotificationSettings={updateNotificationSettings}
        household={household}
        canEdit={canEdit}
        isViewer={isViewer}
        onHouseholdChanged={refreshHousehold}
        homeLayout={homeLayout}
        onChangeHomeLayout={updateHomeLayout}
        onResetHomeLayout={restoreDefaultHomeLayout}
      />
    );
  } else {
    content = (
      <HomePage
        records={records}
        memories={memories}
        checkItems={checkItems}
        checkLogs={checkLogs}
        homeLayout={homeLayout}
        canEdit={canEdit}
        onNavigate={setPage}
        notificationSettings={notificationSettings}
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
        role={household?.my_role}
        onLogout={async () => {
          document.body.classList.remove('modal-open');
          document.documentElement.classList.remove('modal-open');
          await supabase.auth.signOut();
        }}
      >
        {content}
      </Layout>

      <PhotoModal url={photoUrl} onClose={() => setPhotoUrl('')} />

      <MemoryDetailModal
        post={detailPost}
        initialIndex={detailIndex}
        onClose={() => setDetailPost(null)}
        onToggleFavorite={
          canEdit
            ? async (post) => {
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
              }
            : undefined
        }
      />
    </>
  );
}
