import { useState } from 'react';
import { formatDate } from '../lib/helpers';
import MemoryMedia from './MemoryMedia';
import {
  getMediaType,
  getMediaUrl,
  mediaExtension,
} from '../lib/media';

export default function MemoryPostCard({
  post,
  canEdit,
  isViewer,
  onToggleFavorite,
  onDelete,
  onDownload,
  onOpenDetail,
}) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const mediaItems = post.photos || [];
  const currentMedia = mediaItems[index];
  const currentType = getMediaType(currentMedia);

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
    <article className="memory-post-card">
      <div
        className="memory-carousel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentMedia ? (
          currentType === 'video' ? (
            <div className="memory-carousel-video-wrap">
              <MemoryMedia
                media={currentMedia}
                className="memory-carousel-video"
                controls
              />
              <button
                type="button"
                className="open-media-detail-button"
                onClick={() => onOpenDetail(post, index)}
              >
                ⛶ 詳細
              </button>
            </div>
          ) : (
            <button
              className="memory-carousel-photo"
              onClick={() => onOpenDetail(post, index)}
            >
              <MemoryMedia
                media={currentMedia}
                alt={`はりまろの思い出 ${index + 1}`}
              />
            </button>
          )
        ) : (
          <div className="memory-carousel-empty">🦔</div>
        )}

        {mediaItems.length > 1 && (
          <>
            <button
              type="button"
              className="carousel-arrow carousel-arrow-left"
              onClick={previous}
              aria-label="前のメディア"
            >
              ‹
            </button>

            <button
              type="button"
              className="carousel-arrow carousel-arrow-right"
              onClick={next}
              aria-label="次のメディア"
            >
              ›
            </button>

            <span className="carousel-count">
              {index + 1} / {mediaItems.length}
            </span>
          </>
        )}

        {currentMedia && (
          <span className="media-type-badge">
            {currentType === 'video' ? '🎥 動画' : '📷 写真'}
          </span>
        )}

        {canEdit && onToggleFavorite && (
          <button
            type="button"
            className={`favorite-button ${post.is_favorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite(post)}
            aria-label="お気に入り"
          >
            {post.is_favorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      {mediaItems.length > 1 && (
        <div className="carousel-dots" aria-label="メディアページ">
          {mediaItems.map((media, dotIndex) => (
            <button
              key={media.id}
              type="button"
              className={dotIndex === index ? 'active' : ''}
              onClick={() => setIndex(dotIndex)}
              aria-label={`${dotIndex + 1}件目を表示`}
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

        <div className="memory-card-actions">
          {isViewer && currentMedia && (
            <button
              type="button"
              className="download-photo-button"
              onClick={() =>
                onDownload(
                  getMediaUrl(currentMedia),
                  `harimaro-${post.memory_date}-${index + 1}.${mediaExtension(
                    currentMedia,
                    currentType === 'video' ? 'mp4' : 'jpg'
                  )}`
                )
              }
            >
              ⬇ {currentType === 'video' ? '動画' : '写真'}を保存
            </button>
          )}

          {canEdit && onDelete && (
            <button
              type="button"
              className="delete-button memory-delete"
              onClick={() => onDelete(post)}
            >
              投稿を削除
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
