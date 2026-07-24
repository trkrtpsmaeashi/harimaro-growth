import './style.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const app = document.querySelector('#app');

let user = null;
let records = [];
let currentView = 'home';
let selectedTag = '';

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(dateText) {
  if (!dateText) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${dateText}T00:00:00`));
}

function loginView() {
  app.innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand-mark">🐹</div>
        <h1>はりまろ成長記録</h1>
        <p>写真・体重・体調をクラウドに保存します。</p>

        <label for="email">メールアドレス</label>
        <input id="email" type="email" autocomplete="email">

        <label for="password">パスワード</label>
        <input id="password" type="password" autocomplete="current-password">

        <div class="button-row">
          <button id="loginButton">ログイン</button>
          <button id="signupButton" class="secondary-button">新規登録</button>
        </div>

        <p id="authMessage" class="message"></p>
      </section>
    </main>
  `;

  document.querySelector('#loginButton').onclick = () => authenticate('login');
  document.querySelector('#signupButton').onclick = () => authenticate('signup');
}

async function authenticate(mode) {
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const message = document.querySelector('#authMessage');

  message.textContent = '';

  if (!email || !password) {
    message.className = 'message error';
    message.textContent = 'メールアドレスとパスワードを入力してね。';
    return;
  }

  const result =
    mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

  message.className = result.error ? 'message error' : 'message success';
  message.textContent = result.error
    ? result.error.message
    : mode === 'signup'
      ? '登録しました。確認メールが届いた場合は認証してください。'
      : 'ログインしました。';
}

async function loadRecords() {
  const { data, error } = await supabase
    .from('hedgehog_records')
    .select('*')
    .order('recorded_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  records = data || [];
}

function appShell(content) {
  const email = escapeHtml(user?.email || '');

  app.innerHTML = `
    <header class="topbar">
      <button id="menuButton" class="icon-button" aria-label="メニューを開く">☰</button>

      <div class="topbar-title">
        <h1>🐹 はりまろ成長記録</h1>
        <p>写真・体重・体調をクラウドで安全に保存</p>
      </div>
    </header>

    <div id="overlay" class="overlay hidden"></div>

    <aside id="sidebar" class="sidebar">
      <div class="sidebar-top">
        <div>
          <h2>🐹 はりまろ</h2>
          <p>成長記録メニュー</p>
        </div>
        <button id="closeMenuButton" class="close-button" aria-label="メニューを閉じる">×</button>
      </div>

      <nav class="sidebar-nav">
        ${menuButton('home', '🏠', 'ホーム')}
        ${menuButton('chart', '📈', '成長グラフ')}
        ${menuButton('photos', '📷', '写真アルバム')}
        ${menuButton('tags', '🏷️', 'タグ検索')}
        ${menuButton('settings', '⚙️', '設定')}
      </nav>

      <div class="sidebar-bottom">
        <div class="account-box">
          <span>ログイン中</span>
          <strong>${email}</strong>
        </div>
        <button id="logoutButton" class="logout-button">🚪 ログアウト</button>
      </div>
    </aside>

    <main class="app-main">
      ${content}
    </main>

    <div id="photoModal" class="photo-modal hidden">
      <button id="closePhotoModal" class="photo-modal-close">×</button>
      <img id="modalPhoto" alt="はりまろの写真">
    </div>
  `;

  bindShellEvents();
}

function menuButton(view, icon, label) {
  return `
    <button class="nav-button ${currentView === view ? 'active' : ''}" data-view="${view}">
      <span>${icon}</span>
      <strong>${label}</strong>
    </button>
  `;
}

function bindShellEvents() {
  document.querySelector('#menuButton').onclick = openSidebar;
  document.querySelector('#closeMenuButton').onclick = closeSidebar;
  document.querySelector('#overlay').onclick = closeSidebar;
  document.querySelector('#logoutButton').onclick = () => supabase.auth.signOut();

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.onclick = () => {
      currentView = button.dataset.view;
      closeSidebar();
      renderCurrentView();
    };
  });

  document.querySelector('#closePhotoModal').onclick = closePhotoModal;
  document.querySelector('#photoModal').onclick = (event) => {
    if (event.target.id === 'photoModal') closePhotoModal();
  };

  document.addEventListener('keydown', handleEscapeKey, { once: true });
}

function handleEscapeKey(event) {
  if (event.key === 'Escape') {
    closeSidebar();
    closePhotoModal();
  }
}

function openSidebar() {
  document.querySelector('#sidebar')?.classList.add('open');
  document.querySelector('#overlay')?.classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closeSidebar() {
  document.querySelector('#sidebar')?.classList.remove('open');
  document.querySelector('#overlay')?.classList.add('hidden');
  document.body.classList.remove('no-scroll');
}

function openPhotoModal(url) {
  const modal = document.querySelector('#photoModal');
  const image = document.querySelector('#modalPhoto');

  image.src = url;
  modal.classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closePhotoModal() {
  document.querySelector('#photoModal')?.classList.add('hidden');
  document.body.classList.remove('no-scroll');
}

function renderCurrentView() {
  switch (currentView) {
    case 'chart':
      renderChartView();
      break;
    case 'photos':
      renderPhotoView();
      break;
    case 'tags':
      renderTagView();
      break;
    case 'settings':
      renderSettingsView();
      break;
    default:
      renderHomeView();
  }
}

function renderHomeView() {
  const latest = records[0];
  const previous = records[1];
  const difference =
    latest && previous ? latest.weight_g - previous.weight_g : null;

  appShell(`
    <section class="page-heading">
      <div>
        <p class="eyebrow">HOME</p>
        <h2>今日の記録</h2>
      </div>
    </section>

    <section class="card record-form-card">
      <h3>新しい記録</h3>

      <div class="form-grid">
        <div>
          <label for="recordDate">日付</label>
          <input id="recordDate" type="date" value="${today()}">
        </div>

        <div>
          <label for="recordWeight">体重（g）</label>
          <input id="recordWeight" type="number" min="1" placeholder="567">
        </div>
      </div>

      <div class="form-field">
        <label for="recordPhoto">写真</label>
        <input id="recordPhoto" type="file" accept="image/*" capture="environment">
      </div>

      <div class="form-field">
        <label for="recordMemo">メモ</label>
        <textarea id="recordMemo" placeholder="ご飯、うんち、回し車、爪切りなど"></textarea>
      </div>

      <div class="form-field">
        <label for="recordTags">タグ（カンマ区切り）</label>
        <input id="recordTags" placeholder="爪切り, 緑便, 部屋んぽ">
      </div>

      <div class="button-row">
        <button id="saveRecordButton">保存する</button>
      </div>

      <p id="formMessage" class="message"></p>
    </section>

    <section class="summary-grid">
      ${summaryCard(latest ? `${latest.weight_g}g` : '-', '最新体重')}
      ${summaryCard(
        difference === null
          ? '-'
          : `${difference >= 0 ? '+' : ''}${difference}g`,
        '前回比'
      )}
      ${summaryCard(String(records.length), '記録件数')}
    </section>

    <section class="card">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">TIMELINE</p>
          <h3>記録一覧</h3>
        </div>
      </div>

      <div class="timeline">
        ${renderRecordCards(records)}
      </div>
    </section>
  `);

  document.querySelector('#saveRecordButton').onclick = saveRecord;
  bindRecordButtons();
}

function summaryCard(value, label) {
  return `
    <article class="summary-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function renderRecordCards(list) {
  if (!list.length) {
    return '<p class="empty-message">まだ記録がありません。</p>';
  }

  return list
    .map(
      (record) => `
        <article class="record-card">
          ${
            record.photo_url
              ? `<button class="photo-button" data-photo="${escapeHtml(record.photo_url)}">
                   <img src="${escapeHtml(record.photo_url)}" alt="はりまろ">
                 </button>`
              : '<div class="photo-placeholder">🐹</div>'
          }

          <div class="record-content">
            <div class="record-header">
              <div>
                <time>${escapeHtml(formatDate(record.recorded_on))}</time>
                <h4>${record.weight_g}g</h4>
              </div>

              <button
                class="delete-button"
                data-delete="${record.id}"
                data-path="${escapeHtml(record.photo_path || '')}"
              >
                削除
              </button>
            </div>

            <p>${escapeHtml(record.memo || 'メモなし')}</p>

            <div class="tag-list">
              ${(record.tags || [])
                .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
                .join('')}
            </div>
          </div>
        </article>
      `
    )
    .join('');
}

function bindRecordButtons() {
  document.querySelectorAll('[data-photo]').forEach((button) => {
    button.onclick = () => openPhotoModal(button.dataset.photo);
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.onclick = () =>
      deleteRecord(button.dataset.delete, button.dataset.path);
  });
}

function renderChartView() {
  const latest = records[0];
  const previous = records[1];
  const difference =
    latest && previous ? latest.weight_g - previous.weight_g : null;

  appShell(`
    <section class="page-heading">
      <div>
        <p class="eyebrow">WEIGHT</p>
        <h2>成長グラフ</h2>
      </div>
    </section>

    <section class="summary-grid">
      ${summaryCard(latest ? `${latest.weight_g}g` : '-', '最新体重')}
      ${summaryCard(
        difference === null
          ? '-'
          : `${difference >= 0 ? '+' : ''}${difference}g`,
        '前回比'
      )}
      ${summaryCard(String(records.length), '記録件数')}
    </section>

    <section class="card chart-card">
      <canvas id="weightChart" width="900" height="380"></canvas>
    </section>
  `);

  drawChart();
}

function drawChart() {
  const canvas = document.querySelector('#weightChart');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const chartRecords = [...records].sort((a, b) =>
    a.recorded_on.localeCompare(b.recorded_on)
  );

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (chartRecords.length < 2) {
    context.fillStyle = '#6b7280';
    context.font = '18px sans-serif';
    context.fillText('記録が2件以上になるとグラフが表示されます', 40, 60);
    return;
  }

  const weights = chartRecords.map((record) => record.weight_g);
  const minimum = Math.min(...weights) - 10;
  const maximum = Math.max(...weights) + 10;

  const left = 70;
  const right = 30;
  const top = 35;
  const bottom = 55;
  const chartWidth = canvas.width - left - right;
  const chartHeight = canvas.height - top - bottom;

  context.strokeStyle = '#e5e7eb';
  context.fillStyle = '#6b7280';
  context.font = '13px sans-serif';
  context.lineWidth = 1;

  for (let index = 0; index < 5; index += 1) {
    const y = top + (chartHeight * index) / 4;
    const value = Math.round(maximum - ((maximum - minimum) * index) / 4);

    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + chartWidth, y);
    context.stroke();
    context.fillText(`${value}g`, 18, y + 4);
  }

  context.strokeStyle = '#6474ff';
  context.lineWidth = 5;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();

  chartRecords.forEach((record, index) => {
    const x =
      left + (chartWidth * index) / Math.max(chartRecords.length - 1, 1);
    const y =
      top +
      chartHeight *
        (1 - (record.weight_g - minimum) / (maximum - minimum));

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();

  chartRecords.forEach((record, index) => {
    const x =
      left + (chartWidth * index) / Math.max(chartRecords.length - 1, 1);
    const y =
      top +
      chartHeight *
        (1 - (record.weight_g - minimum) / (maximum - minimum));

    context.fillStyle = '#6474ff';
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#6b7280';
    context.font = '12px sans-serif';
    context.fillText(record.recorded_on.slice(5).replace('-', '/'), x - 18, canvas.height - 20);
  });
}

function renderPhotoView() {
  const photoRecords = records.filter((record) => record.photo_url);

  appShell(`
    <section class="page-heading">
      <div>
        <p class="eyebrow">ALBUM</p>
        <h2>写真アルバム</h2>
      </div>
      <span class="count-badge">${photoRecords.length}枚</span>
    </section>

    <section class="photo-grid">
      ${
        photoRecords.length
          ? photoRecords
              .map(
                (record) => `
                  <button class="album-card" data-photo="${escapeHtml(record.photo_url)}">
                    <img src="${escapeHtml(record.photo_url)}" alt="はりまろ">
                    <span>${escapeHtml(formatDate(record.recorded_on))}</span>
                    <strong>${record.weight_g}g</strong>
                  </button>
                `
              )
              .join('')
          : '<p class="empty-message card">写真付きの記録がまだありません。</p>'
      }
    </section>
  `);

  document.querySelectorAll('[data-photo]').forEach((button) => {
    button.onclick = () => openPhotoModal(button.dataset.photo);
  });
}

function renderTagView() {
  const allTags = [
    ...new Set(records.flatMap((record) => record.tags || [])),
  ].sort((a, b) => a.localeCompare(b, 'ja'));

  const filteredRecords = selectedTag
    ? records.filter((record) => (record.tags || []).includes(selectedTag))
    : records;

  appShell(`
    <section class="page-heading">
      <div>
        <p class="eyebrow">TAGS</p>
        <h2>タグ検索</h2>
      </div>
    </section>

    <section class="card">
      <div class="filter-tags">
        <button class="filter-tag ${selectedTag === '' ? 'active' : ''}" data-tag="">
          すべて
        </button>

        ${allTags
          .map(
            (tag) => `
              <button
                class="filter-tag ${selectedTag === tag ? 'active' : ''}"
                data-tag="${escapeHtml(tag)}"
              >
                ${escapeHtml(tag)}
              </button>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="card">
      <div class="timeline">
        ${renderRecordCards(filteredRecords)}
      </div>
    </section>
  `);

  document.querySelectorAll('[data-tag]').forEach((button) => {
    button.onclick = () => {
      selectedTag = button.dataset.tag;
      renderTagView();
    };
  });

  bindRecordButtons();
}

function renderSettingsView() {
  appShell(`
    <section class="page-heading">
      <div>
        <p class="eyebrow">SETTINGS</p>
        <h2>設定</h2>
      </div>
    </section>

    <section class="card settings-card">
      <div class="setting-row">
        <div>
          <h3>ログイン中のアカウント</h3>
          <p>${escapeHtml(user?.email || '')}</p>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <h3>保存済み記録</h3>
          <p>${records.length}件</p>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <h3>家族共有</h3>
          <p>次の更新で2人共有機能を追加予定です。</p>
        </div>
        <span class="status-badge">準備中</span>
      </div>
    </section>
  `);
}

async function saveRecord() {
  const message = document.querySelector('#formMessage');
  const recordedOn = document.querySelector('#recordDate').value;
  const weight = Number(document.querySelector('#recordWeight').value);
  const file = document.querySelector('#recordPhoto').files[0];

  if (!recordedOn || !weight) {
    message.className = 'message error';
    message.textContent = '日付と体重を入力してね。';
    return;
  }

  message.className = 'message';
  message.textContent = '保存中…';

  let photoUrl = null;
  let photoPath = null;

  if (file) {
    photoPath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;

    const uploadResult = await supabase.storage
      .from('harimaro-photos')
      .upload(photoPath, file, { upsert: false });

    if (uploadResult.error) {
      message.className = 'message error';
      message.textContent = uploadResult.error.message;
      return;
    }

    photoUrl = supabase.storage
      .from('harimaro-photos')
      .getPublicUrl(photoPath).data.publicUrl;
  }

  const { error } = await supabase.from('hedgehog_records').insert({
    user_id: user.id,
    recorded_on: recordedOn,
    weight_g: weight,
    memo: document.querySelector('#recordMemo').value.trim(),
    tags: document
      .querySelector('#recordTags')
      .value.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    photo_url: photoUrl,
    photo_path: photoPath,
  });

  if (error) {
    message.className = 'message error';
    message.textContent = error.message;
    return;
  }

  await loadRecords();
  renderHomeView();
}

async function deleteRecord(recordId, photoPath) {
  const confirmed = confirm('この記録を削除する？');
  if (!confirmed) return;

  if (photoPath) {
    await supabase.storage.from('harimaro-photos').remove([photoPath]);
  }

  const { error } = await supabase
    .from('hedgehog_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadRecords();
  renderCurrentView();
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  user = session?.user || null;

  if (!user) {
    loginView();
    return;
  }

  try {
    await loadRecords();
    renderCurrentView();
  } catch (error) {
    app.innerHTML = `
      <main class="auth-page">
        <section class="auth-card">
          <p class="message error">${escapeHtml(error.message)}</p>
        </section>
      </main>
    `;
  }
});
