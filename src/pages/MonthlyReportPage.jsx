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
    </>
  );
}
