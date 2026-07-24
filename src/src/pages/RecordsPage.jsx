import RecordCard from '../components/RecordCard';

export default function RecordsPage({ records, onPhoto, onDelete }) {
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">RECORDS</p>
        <h2>記録一覧</h2>
      </section>

      <section className="card">
        {records.length ? records.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onPhoto={onPhoto}
            onDelete={onDelete}
          />
        )) : <p className="muted">まだ記録がありません。</p>}
      </section>
    </>
  );
}
