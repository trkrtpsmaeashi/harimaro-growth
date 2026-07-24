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

export default function HomePage({
  records,
  onNavigate,
  onPhoto,
  onDelete,
}) {
  const latest = records[0];
  const previous = records[1];
  const difference = latest && previous
    ? latest.weight_g - previous.weight_g
    : null;

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">HARIMARO TODAY</p>
          <h2>はりまろの今</h2>
          <p>最新の体重と記録をひと目で確認できます。</p>
        </div>
        <button className="primary-button" onClick={() => onNavigate('new')}>
          ➕ 今日の記録を書く
        </button>
      </section>

      <section className="summary-grid">
        <Summary value={latest ? `${latest.weight_g}g` : '-'} label="最新体重" />
        <Summary
          value={difference === null ? '-' : `${difference >= 0 ? '+' : ''}${difference}g`}
          label="前回比"
        />
        <Summary value={latest ? formatDate(latest.recorded_on) : '-'} label="最終記録" />
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <p className="eyebrow">LATEST</p>
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
            <button onClick={() => onNavigate('chart')}>📈 成長グラフ</button>
            <button onClick={() => onNavigate('photos')}>📷 写真アルバム</button>
            <button onClick={() => onNavigate('records')}>📚 記録一覧</button>
            <button onClick={() => onNavigate('new')}>➕ 新しい記録</button>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECENT</p>
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
