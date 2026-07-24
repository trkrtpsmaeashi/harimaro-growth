import { useState } from 'react';
import { formatDate } from '../lib/helpers';

export default function MemoryPostCard({
  post,
  onToggleFavorite,
  onDelete,
  onOpenDetail,
}) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const photos = post.photos || [];
  const currentPhoto = photos[index];

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
    <article className="memory-post-card">
      <div
        className="memory-carousel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentPhoto ? (
          <button
            className="memory-carousel-photo"
            onClick={() => onOpenDetail(post, index)}
          >
            <img
              src={currentPhoto.photo_url}
              alt={`はりまろの思い出 ${index + 1}`}
            />
          </button>
        ) : (
          <div className="memory-carousel-empty">🦔</div>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="carousel-arrow carousel-arrow-left"
              onClick={previous}
              aria-label="前の写真"
            >
              ‹
            </button>

            <button
              type="button"
              className="carousel-arrow carousel-arrow-right"
              onClick={next}
              aria-label="次の写真"
            >
              ›
            </button>

            <span className="carousel-count">
              {index + 1} / {photos.length}
            </span>
          </>
        )}

        <button
          type="button"
          className={`favorite-button ${post.is_favorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(post)}
          aria-label="お気に入り"
        >
          {post.is_favorite ? '❤️' : '🤍'}
        </button>
      </div>

      {photos.length > 1 && (
        <div className="carousel-dots" aria-label="写真ページ">
          {photos.map((photo, dotIndex) => (
            <button
              key={photo.id}
              type="button"
              className={dotIndex === index ? 'active' : ''}
              onClick={() => setIndex(dotIndex)}
              aria-label={`${dotIndex + 1}枚目を表示`}
            />
          ))}
        </div>
      )}

      <div className="memory-post-body">
        <time>{formatDate(post.memory_date)}</time>
        <p>{post.caption || 'ひとことなし'}</p>

        <div className="tag-list">
          {(post.tags || []).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <button
          type="button"
          className="delete-button memory-delete"
          onClick={() => onDelete(post)}
        >
          投稿を削除
        </button>
      </div>
    </article>
  );
}
