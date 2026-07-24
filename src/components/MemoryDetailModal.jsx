import { useEffect, useState } from 'react';
import { formatDate } from '../lib/helpers';

export default function MemoryDetailModal({
  post,
  initialIndex = 0,
  onClose,
  onToggleFavorite,
}) {
  const [index, setIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState(null);
  const photos = post?.photos || [];
  const currentPhoto = photos[index];

  useEffect(() => {
    setIndex(initialIndex);
  }, [post?.id, initialIndex]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    }

    window.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  });

  if (!post) return null;

  function previous() {
    setIndex((current) =>
      current === 0 ? Math.max(photos.length - 1, 0) : current - 1
    );
  }

  function next() {
    setIndex((current) =>
      current >= photos.length - 1 ? 0 : current + 1
    );
  }

  function handleTouchStart(event) {
    setTouchStart(event.touches[0].clientX);
  }

  function handleTouchEnd(event) {
    if (touchStart === null) return;

    const end = event.changedTouches[0].clientX;
    const distance = touchStart - end;

    if (Math.abs(distance) > 45) {
      if (distance > 0) next();
      else previous();
    }

    setTouchStart(null);
  }

  return (
    <div className="memory-detail-backdrop" onClick={onClose}>
      <section
        className="memory-detail-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="memory-detail-header">
          <div>
            <p className="eyebrow">MEMORY DETAIL</p>
            <h2>{formatDate(post.memory_date)}</h2>
          </div>

          <button
            type="button"
            className="memory-detail-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div
          className="memory-detail-carousel"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto.photo_url}
              alt={`はりまろの思い出 ${index + 1}`}
              draggable="false"
            />
          ) : (
            <div className="memory-detail-empty">🦔</div>
          )}

          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="detail-arrow detail-arrow-left"
                onClick={previous}
                aria-label="前の写真"
              >
                ‹
              </button>

              <button
                type="button"
                className="detail-arrow detail-arrow-right"
                onClick={next}
                aria-label="次の写真"
              >
                ›
              </button>

              <span className="detail-photo-count">
                {index + 1} / {photos.length}
              </span>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="detail-dots">
            {photos.map((photo, dotIndex) => (
              <button
                key={photo.id}
                type="button"
                className={dotIndex === index ? 'active' : ''}
                onClick={() => setIndex(dotIndex)}
                aria-label={`${dotIndex + 1}枚目`}
              />
            ))}
          </div>
        )}

        <div className="memory-detail-content">
          <div className="memory-detail-title-row">
            <div>
              <time>{formatDate(post.memory_date)}</time>
              <p>{post.caption || 'ひとことなし'}</p>
            </div>

            <button
              type="button"
              className={`detail-favorite-button ${post.is_favorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite(post)}
            >
              {post.is_favorite ? '❤️ お気に入り' : '🤍 お気に入りに追加'}
            </button>
          </div>

          <div className="tag-list">
            {(post.tags || []).map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>

          <p className="detail-help">
            スマホは左右スワイプ、PCは矢印キーでも切り替えられます。
          </p>
        </div>
      </section>
    </div>
  );
}
