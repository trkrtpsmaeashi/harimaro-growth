import { useMemo, useState } from 'react';
import { formatDate } from '../lib/helpers';

function pad(value) {
  return String(value).padStart(2, '0');
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function StatCard({ icon, value, label }) {
  return (
    <article className="report-stat-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

export default function MonthlyReportPage({
  records,
  memories,
  onOpenMemory,
  onPhoto,
}) {
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const monthRecords = useMemo(
    () =>
      records
        .filter((record) => record.recorded_on?.startsWith(month))
        .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on)),
    [records, month]
  );

  const monthMemories = useMemo(
    () =>
      memories
        .filter((memory) => memory.memory_date?.startsWith(month))
        .sort((a, b) => a.memory_date.localeCompare(b.memory_date)),
    [memories, month]
  );

  const photoCount = monthMemories.reduce(
    (sum, memory) => sum + (memory.photos?.length || 0),
    0
  );

  const favoriteCount = monthMemories.filter(
    (memory) => memory.is_favorite
  ).length;

  const firstRecord = monthRecords[0];
  const lastRecord = monthRecords[monthRecords.length - 1];

  const weightChange =
    firstRecord && lastRecord
      ? Number(lastRecord.weight_g) - Number(firstRecord.weight_g)
      : null;

  const averageWeight = monthRecords.length
    ? Math.round(
        monthRecords.reduce(
          (sum, record) => sum + Number(record.weight_g),
          0
        ) / monthRecords.length
      )
    : null;

  const tagStats = useMemo(() => {
    const counts = {};

    for (const record of monthRecords) {
      for (const tag of record.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }

    for (const memory of monthMemories) {
      for (const tag of memory.tags || []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [monthRecords, monthMemories]);

  const highlightMemories = [
    ...monthMemories.filter((memory) => memory.is_favorite),
    ...monthMemories.filter((memory) => !memory.is_favorite),
  ].slice(0, 6);

  const hasData = monthRecords.length > 0 || monthMemories.length > 0;

  function exportPdf() {
    document.body.classList.add('printing-photobook');

    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-photobook');
      }, 300);
    });
  }

  return (
    <>
      <section className="page-heading report-heading">
        <div>
          <p className="eyebrow">MONTHLY REPORT</p>
          <h2>月間レポート</h2>
          <p className="muted">
            ひと月の成長と思い出を、自動でまとめて振り返れます。
          </p>
        </div>

        <div className="report-heading-actions">
          <button
            type="button"
            className="pdf-export-button"
            onClick={exportPdf}
            disabled={!hasData}
          >
            📕 PDFフォトブック
          </button>

          <div className="report-month-controls">
          <button
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
            aria-label="前の月"
          >
            ‹
          </button>

          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />

          <button
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
            aria-label="次の月"
          >
            ›
          </button>
          </div>
        </div>
      </section>

      <section className="report-title-card">
        <p>HARIMARO MEMORIES</p>
        <h2>{monthLabel(month)}</h2>
        <span>
          {hasData
            ? '今月のはりまろとの毎日'
            : 'この月の記録はまだありません'}
        </span>
      </section>

      <section className="report-stat-grid">
        <StatCard
          icon="⚖️"
          value={`${monthRecords.length}件`}
          label="体重記録"
        />
        <StatCard
          icon="📷"
          value={`${monthMemories.length}投稿`}
          label="Memories"
        />
        <StatCard
          icon="🖼️"
          value={`${photoCount}枚`}
          label="写真"
        />
        <StatCard
          icon="❤️"
          value={`${favoriteCount}投稿`}
          label="お気に入り"
        />
      </section>

      <section className="report-two-column">
        <article className="card report-weight-card">
          <p className="eyebrow">GROWTH</p>
          <h2>今月の成長</h2>

          {monthRecords.length ? (
            <>
              <div className="report-weight-main">
                <div>
                  <span>月初</span>
                  <strong>{firstRecord.weight_g}g</strong>
                  <small>{formatDate(firstRecord.recorded_on)}</small>
                </div>

                <span className="report-weight-arrow">→</span>

                <div>
                  <span>月末</span>
                  <strong>{lastRecord.weight_g}g</strong>
                  <small>{formatDate(lastRecord.recorded_on)}</small>
                </div>
              </div>

              <div className="report-weight-summary">
                <div>
                  <span>増減</span>
                  <strong>
                    {weightChange >= 0 ? '+' : ''}
                    {weightChange}g
                  </strong>
                </div>
                <div>
                  <span>平均</span>
                  <strong>{averageWeight}g</strong>
                </div>
              </div>
            </>
          ) : (
            <p className="muted">この月の体重記録はありません。</p>
          )}
        </article>

        <article className="card">
          <p className="eyebrow">TOP TAGS</p>
          <h2>今月によく残したこと</h2>

          {tagStats.length ? (
            <div className="report-tag-list">
              {tagStats.map(([tag, count], index) => (
                <div key={tag}>
                  <span>{index + 1}</span>
                  <strong>{tag}</strong>
                  <small>{count}回</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">この月のタグはありません。</p>
          )}
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HIGHLIGHTS</p>
            <h2>今月のハイライト</h2>
          </div>
          <span className="count-pill">{highlightMemories.length}投稿</span>
        </div>

        {highlightMemories.length ? (
          <div className="report-highlight-grid">
            {highlightMemories.map((memory) => (
              <button
                type="button"
                key={memory.id}
                className="report-highlight-card"
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

                <div>
                  <time>{formatDate(memory.memory_date)}</time>
                  <strong>
                    {memory.is_favorite ? '❤️ ' : ''}
                    {memory.photos?.length || 0}枚
                  </strong>
                  <p>{memory.caption || 'ひとことなし'}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">この月のMemoriesはありません。</p>
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECORD LOG</p>
            <h2>今月の体重記録</h2>
          </div>
          <span className="count-pill">{monthRecords.length}件</span>
        </div>

        {monthRecords.length ? (
          <div className="report-record-grid">
            {monthRecords.map((record) => (
              <article key={record.id} className="report-record-card">
                {record.photo_url ? (
                  <button
                    type="button"
                    onClick={() => onPhoto(record.photo_url)}
                  >
                    <img src={record.photo_url} alt="はりまろ" />
                  </button>
                ) : (
                  <div className="report-record-placeholder">🦔</div>
                )}

                <div>
                  <time>{formatDate(record.recorded_on)}</time>
                  <strong>{record.weight_g}g</strong>
                  <p>{record.memo || 'メモなし'}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">この月の体重記録はありません。</p>
        )}
      </section>


      <section className="photobook-print" aria-hidden="true">
        <article className="photobook-page photobook-cover">
          <p>HARIMARO MEMORIES</p>
          <h1>{monthLabel(month)}</h1>
          <div className="photobook-cover-icon">🦔</div>
          <h2>はりまろとの毎日</h2>
          <small>作成日：{new Date().toLocaleDateString('ja-JP')}</small>
        </article>

        <article className="photobook-page photobook-summary-page">
          <p className="photobook-kicker">MONTHLY SUMMARY</p>
          <h2>{monthLabel(month)}のまとめ</h2>

          <div className="photobook-summary-grid">
            <div><strong>{monthRecords.length}</strong><span>体重記録</span></div>
            <div><strong>{monthMemories.length}</strong><span>Memories</span></div>
            <div><strong>{photoCount}</strong><span>写真</span></div>
            <div><strong>{favoriteCount}</strong><span>お気に入り</span></div>
          </div>

          {firstRecord && lastRecord && (
            <div className="photobook-growth-summary">
              <h3>今月の成長</h3>
              <p>
                {firstRecord.weight_g}g
                <span> → </span>
                {lastRecord.weight_g}g
              </p>
              <strong>
                {weightChange >= 0 ? '+' : ''}{weightChange}g
              </strong>
            </div>
          )}

          {tagStats.length > 0 && (
            <div className="photobook-tags">
              <h3>よく残したこと</h3>
              <p>
                {tagStats.map(([tag, count]) => `#${tag}（${count}回）`).join('　')}
              </p>
            </div>
          )}
        </article>

        {monthMemories.flatMap((memory) =>
          (memory.photos || []).map((photo, photoIndex) => (
            <article
              key={`book-${memory.id}-${photo.id}`}
              className="photobook-page photobook-photo-page"
            >
              <header>
                <span>{formatDate(memory.memory_date)}</span>
                <strong>
                  {photoIndex + 1} / {memory.photos.length}
                </strong>
              </header>

              <img
                src={photo.photo_url}
                alt={memory.caption || 'はりまろの思い出'}
              />

              <div className="photobook-caption">
                <p>{memory.caption || 'ひとことなし'}</p>
                {memory.is_favorite && <strong>❤️ お気に入り</strong>}
                {(memory.tags || []).length > 0 && (
                  <small>
                    {(memory.tags || []).map((tag) => `#${tag}`).join('　')}
                  </small>
                )}
              </div>
            </article>
          ))
        )}

        {monthRecords.length > 0 && (
          <article className="photobook-page photobook-record-page">
            <p className="photobook-kicker">WEIGHT RECORD</p>
            <h2>今月の体重記録</h2>

            <div className="photobook-record-list">
              {monthRecords.map((record) => (
                <div key={`print-record-${record.id}`}>
                  <span>{formatDate(record.recorded_on)}</span>
                  <strong>{record.weight_g}g</strong>
                  <p>{record.memo || 'メモなし'}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        <article className="photobook-page photobook-end-page">
          <div>🦔</div>
          <h1>Harimaro Memories</h1>
          <p>{monthLabel(month)}</p>
          <small>END</small>
        </article>
      </section>
    </>
  );
}
