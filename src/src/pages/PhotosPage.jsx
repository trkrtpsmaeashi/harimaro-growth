import { formatDate } from '../lib/helpers';

export default function PhotosPage({ records, onPhoto }) {
  const photos = records.filter((record) => record.photo_url);

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">ALBUM</p>
        <h2>写真アルバム</h2>
      </section>

      <section className="photo-grid">
        {photos.map((record) => (
          <button key={record.id} className="album-card" onClick={() => onPhoto(record.photo_url)}>
            <img src={record.photo_url} alt="はりまろ" />
            <span>{formatDate(record.recorded_on)}</span>
            <strong>{record.weight_g}g</strong>
          </button>
        ))}
      </section>
    </>
  );
}
