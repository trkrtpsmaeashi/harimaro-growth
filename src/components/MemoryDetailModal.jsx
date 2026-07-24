import { useEffect, useState } from 'react';
import { formatDate } from '../lib/helpers';
import MemoryMedia from './MemoryMedia';
import { getMediaType } from '../lib/media';

export default function MemoryDetailModal({
  post,
  initialIndex = 0,
  onClose,
  onToggleFavorite,
}) {
  const [index, setIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState(null);
  const mediaItems = post?.photos || [];
  const currentMedia = mediaItems[index];
  const currentType = getMediaType(currentMedia);

  useEffect(() => {
    setIndex(initialIndex);
  }, [post?.id, initialIndex]);

  useEffect(() => {
    if (!post) {
      document.body.classList.remove('modal-open');
      return undefined;
    }

    function handleKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') {
        setIndex((current) =>
          current === 0 ? Math.max(mediaItems.length - 1, 0) : current - 1
        );
      }
      if (event.key === 'ArrowRight') {
        setIndex((current) =>
          current >= mediaItems.length - 1 ? 0 : current + 1
        );
      }
    }

    window.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  }, [post, mediaItems.length, onClose]);

  if (!post) return null;

  function previous() {
    setIndex((current) =>
      current === 0 ? Math.max(mediaItems.length - 1, 0) : current - 1
    );
  }

  function next() {
    setIndex((current) =>
      current >= mediaItems.length - 1 ? 0 : current + 1
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
          {currentMedia ? (
            <MemoryMedia
              media={currentMedia}
              className={
                currentType === 'video'
                  ? 'memory-detail-video'
                  : 'memory-detail-image'
              }
              controls={currentType === 'video'}
              alt={`はりまろの思い出 ${index + 1}`}
            />
          ) : (
            <div className="memory-detail-empty">🦔</div>
          )}

          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                className="detail-arrow detail-arrow-left"
                onClick={previous}
                aria-label="前のメディア"
              >
                ‹
              </button>

              <button
                type="button"
                className="detail-arrow detail-arrow-right"
                onClick={next}
                aria-label="次のメディア"
              >
                ›
              </button>

              <span className="detail-photo-count">
                {index + 1} / {mediaItems.length}
              </span>
            </>
          )}

          {currentMedia && (
            <span className="detail-media-badge">
              {currentType === 'video' ? '🎥 動画' : '📷 写真'}
            </span>
          )}
        </div>

        {mediaItems.length > 1 && (
          <div className="detail-dots">
            {mediaItems.map((media, dotIndex) => (
              <button
                key={media.id}
                type="button"
                className={dotIndex === index ? 'active' : ''}
                onClick={() => setIndex(dotIndex)}
                aria-label={`${dotIndex + 1}件目`}
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

            {onToggleFavorite && (
              <button
                type="button"
                className={`detail-favorite-button ${post.is_favorite ? 'active' : ''}`}
                onClick={() => onToggleFavorite(post)}
              >
                {post.is_favorite ? '❤️ お気に入り' : '🤍 お気に入りに追加'}
              </button>
            )}
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
