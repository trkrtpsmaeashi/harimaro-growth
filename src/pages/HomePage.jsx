import { formatDate } from '../lib/helpers';
import RecordCard from '../components/RecordCard';

function Summary({ value, label }) {
  return (
    <article className="summary-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function getMonthKey(dateText) {
  return dateText?.slice(0, 7) || '';
}

function getMonthDay(dateText) {
  return dateText?.slice(5) || '';
}

export default function HomePage({
  records,
  memories,
  onNavigate,
  onPhoto,
  onDelete,
  onOpenMemory,
}) {
  const latest = records[0];
  const previous = records[1];
  const latestMemory = memories[0];

  const difference = latest && previous
    ? latest.weight_g - previous.weight_g
    : null;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthMemories = memories.filter(
    (memory) => getMonthKey(memory.memory_date) === currentMonth
  );

  const currentMonthPhotoCount = currentMonthMemories.reduce(
    (total, memory) => total + (memory.photos?.length || 0),
    0
  );

  const favoriteCount = memories.filter(
    (memory) => memory.is_favorite
  ).length;

  const tagCounts = memories
    .flatMap((memory) => memory.tags || [])
    .reduce((counts, tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      return counts;
    }, {});

  const topTag = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const todayMonthDay = new Date().toISOString().slice(5, 10);
  const todayMemories = memories.filter(
    (memory) => getMonthDay(memory.memory_date) === todayMonthDay
  );

  return (
    <>
      <section className="dashboard-hero dashboard-hero-v09">
        <div>
          <p className="eyebrow">HARIMARO TODAY</p>
          <h2>はりまろの今</h2>
          <p>体重と写真をまとめて、今日のはりまろを確認できます。</p>

          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate('new')}>
              ➕ 今日の記録を書く
            </button>
            <button className="secondary-action" onClick={() => onNavigate('memories')}>
              📷 思い出を残す
            </button>
          </div>
        </div>

        {latestMemory?.photos?.[0] ? (
          <button
            className="hero-memory-photo"
            onClick={() => onOpenMemory(latestMemory, 0)}
          >
            <img
              src={latestMemory.photos[0].photo_url}
              alt="最新のはりまろ"
            />
            <span>最新の思い出を見る</span>
          </button>
        ) : (
          <div className="hero-memory-photo hero-memory-empty">
            <span>🦔</span>
          </div>
        )}
      </section>

      <section className="summary-grid">
        <Summary value={latest ? `${latest.weight_g}g` : '-'} label="最新体重" />
        <Summary
          value={difference === null ? '-' : `${difference >= 0 ? '+' : ''}${difference}g`}
          label="前回比"
        />
        <Summary value={latest ? formatDate(latest.recorded_on) : '-'} label="最終記録" />
      </section>

      <section className="memory-summary-grid">
        <article className="memory-summary-card">
          <span>📷</span>
          <strong>{currentMonthPhotoCount}枚</strong>
          <small>今月の写真</small>
        </article>

        <article className="memory-summary-card">
          <span>❤️</span>
          <strong>{favoriteCount}投稿</strong>
          <small>お気に入り</small>
        </article>

        <article className="memory-summary-card">
          <span>🏷️</span>
          <strong>{topTag ? topTag[0] : '-'}</strong>
          <small>{topTag ? `${topTag[1]}回・人気タグ` : '人気タグ'}</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <p className="eyebrow">LATEST RECORD</p>
          <h2>最新の記録</h2>

          {latest ? (
            <div className="latest-record">
              {latest.photo_url ? (
                <button className="latest-photo" onClick={() => onPhoto(latest.photo_url)}>
                  <img src={latest.photo_url} alt="はりまろ" />
                </button>
              ) : (
                <div className="latest-photo placeholder">🦔</div>
              )}

              <div>
                <time>{formatDate(latest.recorded_on)}</time>
                <strong>{latest.weight_g}g</strong>
                <p>{latest.memo || 'メモなし'}</p>
              </div>
            </div>
          ) : (
            <p className="muted">まだ記録がありません。</p>
          )}
        </article>

        <article className="card">
          <p className="eyebrow">QUICK MENU</p>
          <h2>すぐ見る</h2>
          <div className="quick-menu">
            <button onClick={() => onNavigate('memories')}>📷 Memories</button>
            <button onClick={() => onNavigate('chart')}>📈 成長グラフ</button>
            <button onClick={() => onNavigate('records')}>📚 記録一覧</button>
            <button onClick={() => onNavigate('new')}>➕ 新しい記録</button>
          </div>
        </article>
      </section>

      {todayMemories.length > 0 && (
        <section className="card on-this-day-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ON THIS DAY</p>
              <h2>今日と同じ日の思い出</h2>
            </div>
            <span>{todayMemories.length}投稿</span>
          </div>

          <div className="home-memory-strip">
            {todayMemories.slice(0, 4).map((memory) => (
              <button
                key={memory.id}
                className="home-memory-thumb"
                onClick={() => onOpenMemory(memory, 0)}
              >
                {memory.photos?.[0] ? (
                  <img
                    src={memory.photos[0].photo_url}
                    alt={memory.caption || 'はりまろの思い出'}
                  />
                ) : (
                  <span>🦔</span>
                )}
                <small>{formatDate(memory.memory_date)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENT MEMORIES</p>
            <h2>最近の思い出</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate('memories')}>
            すべて見る →
          </button>
        </div>

        <div className="home-memory-strip">
          {memories.slice(0, 4).map((memory) => (
            <button
              key={memory.id}
              className="home-memory-thumb"
              onClick={() => onOpenMemory(memory, 0)}
            >
              {memory.photos?.[0] ? (
                <img
                  src={memory.photos[0].photo_url}
                  alt={memory.caption || 'はりまろの思い出'}
                />
              ) : (
                <span>🦔</span>
              )}
              <small>{formatDate(memory.memory_date)}</small>
            </button>
          ))}

          {!memories.length && (
            <p className="muted">まだ思い出がありません。</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENT RECORDS</p>
            <h2>最近の記録</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate('records')}>
            すべて見る →
          </button>
        </div>

        {records.slice(0, 3).map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onPhoto={onPhoto}
            onDelete={onDelete}
          />
        ))}
      </section>
    </>
  );
}
