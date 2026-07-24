import { useMemo, useState } from 'react';
import WeightChart from '../components/WeightChart';
import { formatDate } from '../lib/helpers';

const FILTERS = [
  ['30d', '30日'],
  ['90d', '90日'],
  ['1y', '1年'],
  ['all', '全期間'],
];

function getStartDate(filter) {
  const date = new Date();

  if (filter === '30d') date.setDate(date.getDate() - 30);
  if (filter === '90d') date.setDate(date.getDate() - 90);
  if (filter === '1y') date.setFullYear(date.getFullYear() - 1);

  return filter === 'all' ? null : date.toISOString().slice(0, 10);
}

function StatCard({ icon, value, label }) {
  return (
    <article className="chart-stat-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

export default function ChartPage({ records }) {
  const [filter, setFilter] = useState('all');

  const filteredRecords = useMemo(() => {
    const startDate = getStartDate(filter);
    const sorted = [...records].sort((a, b) =>
      a.recorded_on.localeCompare(b.recorded_on)
    );

    if (!startDate) return sorted;

    const filtered = sorted.filter(
      (record) => record.recorded_on >= startDate
    );

    return filtered.length >= 2 ? filtered : sorted;
  }, [records, filter]);

  const weights = filteredRecords.map((record) => Number(record.weight_g));

  const average = weights.length
    ? Math.round(
        weights.reduce((sum, value) => sum + value, 0) / weights.length
      )
    : null;

  const first = filteredRecords[0];
  const last = filteredRecords[filteredRecords.length - 1];
  const totalChange =
    first && last ? Number(last.weight_g) - Number(first.weight_g) : null;

  const taggedRecords = filteredRecords
    .filter((record) => (record.tags || []).length > 0)
    .sort((a, b) => b.recorded_on.localeCompare(a.recorded_on));

  return (
    <>
      <section className="page-heading chart-heading">
        <div>
          <p className="eyebrow">WEIGHT</p>
          <h2>成長グラフ</h2>
          <p className="muted">
            体重の変化と、その日にあった出来事を振り返れます。
          </p>
        </div>

        <div className="chart-filter-row">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="chart-stat-grid">
        <StatCard
          icon="⬆️"
          value={weights.length ? `${Math.max(...weights)}g` : '-'}
          label="最高体重"
        />
        <StatCard
          icon="⬇️"
          value={weights.length ? `${Math.min(...weights)}g` : '-'}
          label="最低体重"
        />
        <StatCard
          icon="📊"
          value={average === null ? '-' : `${average}g`}
          label="平均体重"
        />
        <StatCard
          icon={totalChange !== null && totalChange < 0 ? '📉' : '📈'}
          value={
            totalChange === null
              ? '-'
              : `${totalChange >= 0 ? '+' : ''}${totalChange}g`
          }
          label="期間内の増減"
        />
      </section>

      <section className="card chart-card chart-card-v11">
        <div className="chart-period-caption">
          <span>
            {first ? formatDate(first.recorded_on) : '-'}
          </span>
          <strong>〜</strong>
          <span>
            {last ? formatDate(last.recorded_on) : '-'}
          </span>
          <small>{filteredRecords.length}件の記録</small>
        </div>

        <WeightChart records={filteredRecords} />

        <div className="chart-legend">
          <span><i className="normal-dot" /> 通常記録</span>
          <span><i className="event-dot" /> タグ付き記録</span>
        </div>
      </section>

      <section className="card chart-events-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EVENTS</p>
            <h2>期間内の出来事</h2>
          </div>
          <span className="count-pill">{taggedRecords.length}件</span>
        </div>

        {taggedRecords.length ? (
          <div className="chart-event-list">
            {taggedRecords.map((record) => (
              <article key={record.id} className="chart-event-item">
                <time>{formatDate(record.recorded_on)}</time>

                <div>
                  <strong>{record.weight_g}g</strong>
                  <p>{record.memo || 'メモなし'}</p>

                  <div className="tag-list">
                    {(record.tags || []).map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            この期間にはタグ付きの記録がありません。
          </p>
        )}
      </section>
    </>
  );
}
