import { useState } from 'react';
import RecordCard from '../components/RecordCard';

export default function TagsPage({ records, onPhoto, onDelete }) {
  const [selected, setSelected] = useState('');
  const tags = [...new Set(records.flatMap((record) => record.tags || []))];
  const filtered = selected
    ? records.filter((record) => (record.tags || []).includes(selected))
    : records;

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">TAGS</p>
        <h2>タグ検索</h2>
      </section>

      <section className="card tag-filters">
        <button className={!selected ? 'active' : ''} onClick={() => setSelected('')}>すべて</button>
        {tags.map((tag) => (
          <button key={tag} className={selected === tag ? 'active' : ''} onClick={() => setSelected(tag)}>
            {tag}
          </button>
        ))}
      </section>

      <section className="card">
        {filtered.map((record) => (
          <RecordCard key={record.id} record={record} onPhoto={onPhoto} onDelete={onDelete} />
        ))}
      </section>
    </>
  );
}
