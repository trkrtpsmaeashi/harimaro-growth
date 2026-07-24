import WeightChart from '../components/WeightChart';

export default function ChartPage({ records }) {
  const weights = records.map((record) => record.weight_g);
  const average = weights.length
    ? Math.round(weights.reduce((sum, value) => sum + value, 0) / weights.length)
    : '-';

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">WEIGHT</p>
        <h2>成長グラフ</h2>
      </section>

      <section className="summary-grid">
        <article className="summary-card"><strong>{weights.length ? `${Math.max(...weights)}g` : '-'}</strong><span>最高</span></article>
        <article className="summary-card"><strong>{weights.length ? `${Math.min(...weights)}g` : '-'}</strong><span>最低</span></article>
        <article className="summary-card"><strong>{average === '-' ? '-' : `${average}g`}</strong><span>平均</span></article>
      </section>

      <section className="card chart-card">
        <WeightChart records={records} />
      </section>
    </>
  );
}
