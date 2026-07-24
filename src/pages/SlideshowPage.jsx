import { useEffect, useMemo, useRef, useState } from 'react';
import { currentMonth, formatDate } from '../lib/helpers';
import MemoryMedia from '../components/MemoryMedia';
import { getMediaType } from '../lib/media';

function buildSlides(memories, filter, month, order) {
  let posts = memories;

  if (filter === 'favorites') {
    posts = posts.filter((post) => post.is_favorite);
  }

  if (filter === 'month') {
    posts = posts.filter((post) => post.memory_date?.startsWith(month));
  }

  const slides = posts.flatMap((post) =>
    (post.photos || []).map((media, photoIndex) => ({
      id: media.id,
      media,
      photoIndex,
      post,
    }))
  );

  slides.sort((a, b) => {
    const dateCompare = a.post.memory_date.localeCompare(b.post.memory_date);
    if (dateCompare !== 0) return order === 'oldest' ? dateCompare : -dateCompare;
    return order === 'oldest'
      ? a.photoIndex - b.photoIndex
      : b.photoIndex - a.photoIndex;
  });

  return slides;
}

export default function SlideshowPage({ memories, onOpenMemory }) {
  const stageRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const [month, setMonth] = useState(currentMonth());
  const [order, setOrder] = useState('oldest');
  const [speed, setSpeed] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const slides = useMemo(
    () => buildSlides(memories, filter, month, order),
    [memories, filter, month, order]
  );

  const current = slides[index];

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [filter, month, order]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  useEffect(() => {
    if (!playing || slides.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setIndex((currentIndex) =>
        currentIndex >= slides.length - 1 ? 0 : currentIndex + 1
      );
    }, speed * 1000);

    return () => window.clearInterval(timer);
  }, [playing, slides.length, speed]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
      if (event.key === ' ') {
        event.preventDefault();
        setPlaying((currentPlaying) => !currentPlaying);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  function previous() {
    if (!slides.length) return;
    setIndex((currentIndex) =>
      currentIndex === 0 ? slides.length - 1 : currentIndex - 1
    );
  }

  function next() {
    if (!slides.length) return;
    setIndex((currentIndex) =>
      currentIndex >= slides.length - 1 ? 0 : currentIndex + 1
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

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await stageRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen API is not available on every browser.
    }
  }

  return (
    <>
      <section className="page-heading slideshow-heading">
        <div>
          <p className="eyebrow">SLIDESHOW</p>
          <h2>思い出スライドショー</h2>
          <p className="muted">
            はりまろの写真と動画を、アルバムのように眺められます。
          </p>
        </div>

        <span className="count-pill">{slides.length}件</span>
      </section>

      <section className="card slideshow-settings">
        <div>
          <label>表示するメディア</label>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">すべての写真・動画</option>
            <option value="favorites">お気に入りだけ</option>
            <option value="month">選んだ月だけ</option>
          </select>
        </div>

        <div>
          <label>対象月</label>
          <input
            type="month"
            value={month}
            disabled={filter !== 'month'}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>

        <div>
          <label>並び順</label>
          <select value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="oldest">古いものから</option>
            <option value="newest">新しいものから</option>
          </select>
        </div>

        <div>
          <label>自動再生速度</label>
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value={2}>2秒</option>
            <option value={4}>4秒</option>
            <option value={6}>6秒</option>
            <option value={10}>10秒</option>
          </select>
        </div>
      </section>

      <section
        ref={stageRef}
        className="slideshow-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {current ? (
          <>
            <MemoryMedia
              media={current.media}
              className={
                getMediaType(current.media) === 'video'
                  ? 'slideshow-video'
                  : 'slideshow-image'
              }
              controls={getMediaType(current.media) === 'video'}
              autoPlay={false}
              alt={current.post.caption || 'はりまろの思い出'}
            />

            <div className="slideshow-shade" />

            <header className="slideshow-topbar">
              <span>{index + 1} / {slides.length}</span>
              <button type="button" onClick={toggleFullscreen}>
                ⛶ 全画面
              </button>
            </header>

            <button
              type="button"
              className="slideshow-arrow slideshow-arrow-left"
              onClick={previous}
              aria-label="前の写真"
            >
              ‹
            </button>

            <button
              type="button"
              className="slideshow-arrow slideshow-arrow-right"
              onClick={next}
              aria-label="次の写真"
            >
              ›
            </button>

            <footer className="slideshow-caption">
              <div>
                <time>{formatDate(current.post.memory_date)}</time>
                <p>{current.post.caption || 'ひとことなし'}</p>
                <div className="tag-list slideshow-tags">
                  {(current.post.tags || []).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenMemory(current.post, current.photoIndex)}
              >
                投稿を開く
              </button>
            </footer>
          </>
        ) : (
          <div className="slideshow-empty">
            <span>🦔</span>
            <h3>表示できる写真・動画がありません</h3>
            <p>条件を変更するか、Memoriesに写真や動画を追加してね。</p>
          </div>
        )}
      </section>

      <section className="slideshow-controls">
        <button type="button" onClick={previous} disabled={!slides.length}>
          ⏮ 前へ
        </button>
        <button
          type="button"
          className="slideshow-play-button"
          onClick={() => setPlaying((currentPlaying) => !currentPlaying)}
          disabled={slides.length < 2}
        >
          {playing ? '⏸ 一時停止' : '▶ 自動再生'}
        </button>
        <button type="button" onClick={next} disabled={!slides.length}>
          次へ ⏭
        </button>
      </section>

      <p className="slideshow-help">
        スマホは左右スワイプ、PCは左右キーで切り替え。スペースキーで再生・停止できます。
      </p>
    </>
  );
}
