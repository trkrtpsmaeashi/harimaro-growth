import { useEffect, useState } from 'react';

const CARD_META = {
  reminders: { icon: '🔔', sample: '今日のリマインダー' },
  checklist: { icon: '☑️', sample: '3/5項目を確認済み' },
  hero: { icon: '🦔', sample: 'はりまろの今' },
  weightSummary: { icon: '⚖️', sample: '最新体重・前回比' },
  memorySummary: { icon: '📷', sample: '今月の写真とお気に入り' },
  dashboard: { icon: '🏠', sample: '最新の記録・すぐ見る' },
  onThisDay: { icon: '🗓️', sample: '今日と同じ日の思い出' },
  recentMemories: { icon: '🎞️', sample: '最近の思い出' },
  recentRecords: { icon: '📚', sample: '最近の記録' },
};

export default function HomeLayoutEditor({
  open,
  layout,
  onClose,
  onSave,
  onReset,
}) {
  const [draft, setDraft] = useState(layout);
  const [draggedId, setDraggedId] = useState('');
  const [touchId, setTouchId] = useState('');

  useEffect(() => {
    if (open) setDraft(layout.map((item) => ({ ...item })));
  }, [open, layout]);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
      return undefined;
    }

    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, []);

  if (!open) return null;

  function moveItem(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setDraft((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId);
      const targetIndex = current.findIndex((item) => item.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function toggleVisible(id) {
    setDraft((current) =>
      current.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  }

  function handleDrop(event, targetId) {
    event.preventDefault();
    moveItem(draggedId, targetId);
    setDraggedId('');
  }

  function handleTouchStart(id) {
    setTouchId(id);
  }

  function handleTouchEnd(event, targetId) {
    if (!touchId) return;

    const touch = event.changedTouches?.[0];
    const element = touch
      ? document.elementFromPoint(touch.clientX, touch.clientY)
      : null;
    const card = element?.closest?.('[data-home-card-id]');
    moveItem(touchId, card?.dataset?.homeCardId || targetId);
    setTouchId('');
  }

  function save() {
    onSave(draft);
    onClose();
  }

  function reset() {
    const next = onReset();
    if (Array.isArray(next)) setDraft(next.map((item) => ({ ...item })));
  }

  return (
    <div className="home-editor-backdrop" onClick={onClose}>
      <section
        className="home-editor-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="home-editor-header">
          <div>
            <p className="eyebrow">EDIT HOME</p>
            <h2>ホーム画面を編集</h2>
            <p>カードをつかんで、好きな場所へ移動できます。</p>
          </div>

          <button type="button" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="home-editor-workspace">
          <div className="home-phone-preview">
            <div className="home-phone-top">
              <span>🦔 Harimaro Memories</span>
              <small>プレビュー</small>
            </div>

            <div className="home-preview-list">
              {draft.map((item) => {
                const meta = CARD_META[item.id] || {
                  icon: '▫️',
                  sample: item.label,
                };

                return (
                  <article
                    key={item.id}
                    data-home-card-id={item.id}
                    draggable
                    className={`home-preview-card ${
                      !item.visible ? 'is-hidden' : ''
                    } ${draggedId === item.id || touchId === item.id ? 'is-dragging' : ''}`}
                    onDragStart={() => setDraggedId(item.id)}
                    onDragEnd={() => setDraggedId('')}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, item.id)}
                    onTouchStart={() => handleTouchStart(item.id)}
                    onTouchEnd={(event) => handleTouchEnd(event, item.id)}
                  >
                    <button
                      type="button"
                      className="home-preview-drag"
                      aria-label={`${item.label}を移動`}
                    >
                      ☰
                    </button>

                    <span className="home-preview-icon">{meta.icon}</span>

                    <div>
                      <strong>{item.label}</strong>
                      <small>{meta.sample}</small>
                    </div>

                    <button
                      type="button"
                      className="home-preview-visibility"
                      onClick={() => toggleVisible(item.id)}
                      aria-label={`${item.label}の表示を変更`}
                    >
                      {item.visible ? '👁' : '🚫'}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="home-editor-help">
            <h3>使い方</h3>
            <p>☰をつかんで上下へ動かすと、ホームの順番が変わります。</p>
            <p>👁を押すと、そのカードをホームから隠せます。</p>
            <p>変更は「保存する」を押すまでホームへ反映されません。</p>
          </aside>
        </div>

        <footer className="home-editor-footer">
          <button type="button" className="home-editor-reset" onClick={reset}>
            ↺ デフォルト
          </button>

          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              キャンセル
            </button>
            <button type="button" onClick={save}>
              保存する
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
