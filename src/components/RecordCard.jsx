import { formatDate } from '../lib/helpers';

export default function RecordCard({ record, onPhoto, onDelete }) {
  return (
    <article className="record-card">
      {record.photo_url ? (
        <button className="record-photo" onClick={() => onPhoto(record.photo_url)}>
          <img src={record.photo_url} alt="はりまろ" />
        </button>
      ) : (
        <div className="record-photo placeholder">🦔</div>
      )}

      <div className="record-body">
        <div className="record-header">
          <div>
            <time>{formatDate(record.recorded_on)}</time>
            <h3>{record.weight_g}g</h3>
          </div>
          <button
            className="delete-button"
            onClick={() => onDelete(record.id, record.photo_path)}
          >
            削除
          </button>
        </div>

        <p>{record.memo || 'メモなし'}</p>

        <div className="tag-list">
          {(record.tags || []).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
