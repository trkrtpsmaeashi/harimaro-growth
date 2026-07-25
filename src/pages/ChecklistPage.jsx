import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import EmojiPicker from '../components/EmojiPicker';
import {
  addDays,
  formatDateWithWeekday,
  today,
} from '../lib/helpers';


function calculateStreak(itemId, logs, fromDate) {
  const checkedDates = new Set(
    logs
      .filter((log) => log.item_id === itemId)
      .map((log) => log.check_date)
  );

  let streak = 0;
  let cursor = fromDate;

  while (checkedDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export default function ChecklistPage({
  user,
  householdId,
  canEdit,
  items,
  logs,
  onReload,
}) {
  const [selectedDate, setSelectedDate] = useState(today());
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✅');
  const [message, setMessage] = useState('');

  const activeItems = useMemo(
    () =>
      items
        .filter((item) => item.is_active !== false)
        .sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.created_at.localeCompare(b.created_at);
        }),
    [items]
  );

  const checkedIds = useMemo(
    () =>
      new Set(
        logs
          .filter((log) => log.check_date === selectedDate)
          .map((log) => log.item_id)
      ),
    [logs, selectedDate]
  );

  const checkedCount = activeItems.filter((item) =>
    checkedIds.has(item.id)
  ).length;

  const progress = activeItems.length
    ? Math.round((checkedCount / activeItems.length) * 100)
    : 0;

  async function toggleItem(item) {
    if (!canEdit) return;

    const isChecked = checkedIds.has(item.id);
    setMessage('保存中…');

    if (isChecked) {
      const { error } = await supabase
        .from('harimaro_check_logs')
        .delete()
        .eq('household_id', householdId)
        .eq('item_id', item.id)
        .eq('check_date', selectedDate);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('harimaro_check_logs')
        .upsert(
          {
            household_id: householdId,
            item_id: item.id,
            check_date: selectedDate,
            checked_by: user.id,
          },
          { onConflict: 'item_id,check_date' }
        );

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    setMessage('保存しました。');
    await onReload();
  }

  async function addItem() {
    if (!canEdit || !title.trim()) {
      setMessage('項目名を入力してね。');
      return;
    }

    const nextSort =
      activeItems.reduce(
        (max, item) => Math.max(max, Number(item.sort_order) || 0),
        0
      ) + 1;

    const { error } = await supabase
      .from('harimaro_check_items')
      .insert({
        household_id: householdId,
        title: title.trim(),
        icon: icon.trim() || '✅',
        sort_order: nextSort,
        created_by: user.id,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle('');
    setIcon('✅');
    setMessage('チェック項目を追加しました。');
    await onReload();
  }

  async function removeItem(item) {
    if (!canEdit) return;
    if (!confirm(`「${item.title}」をチェックリストから外す？`)) return;

    const { error } = await supabase
      .from('harimaro_check_items')
      .update({ is_active: false })
      .eq('household_id', householdId)
      .eq('id', item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('項目を非表示にしました。過去の履歴は残ります。');
    await onReload();
  }

  return (
    <>
      <section className="page-heading checklist-heading">
        <div>
          <p className="eyebrow">DAILY CHECK</p>
          <h2>毎日のチェック</h2>
          <p className="muted">
            ご飯や水、回し車など、毎日確認したいことを自由に登録できます。
          </p>
        </div>

        <span className="checklist-date-pill">
          {formatDateWithWeekday(selectedDate)}
        </span>
      </section>

      <section className="card checklist-day-card">
        <header className="checklist-day-nav">
          <button
            type="button"
            onClick={() =>
              setSelectedDate((current) => addDays(current, -1))
            }
            aria-label="前の日"
          >
            ‹
          </button>

          <div>
            <strong>{formatDateWithWeekday(selectedDate)}</strong>
            {selectedDate !== today() && (
              <button
                type="button"
                className="checklist-today-button"
                onClick={() => setSelectedDate(today())}
              >
                今日へ戻る
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedDate((current) => addDays(current, 1))
            }
            aria-label="次の日"
          >
            ›
          </button>
        </header>

        <div className="checklist-progress-header">
          <div>
            <strong>
              {checkedCount}/{activeItems.length}
            </strong>
            <span>項目を確認済み</span>
          </div>
          <em>{progress}%</em>
        </div>

        <div className="checklist-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>

        {activeItems.length ? (
          <div className="daily-check-list">
            {activeItems.map((item) => {
              const checked = checkedIds.has(item.id);
              const streak = calculateStreak(item.id, logs, selectedDate);

              return (
                <article
                  key={item.id}
                  className={`daily-check-item ${checked ? 'checked' : ''}`}
                >
                  <button
                    type="button"
                    className="daily-check-toggle"
                    disabled={!canEdit}
                    onClick={() => toggleItem(item)}
                    aria-pressed={checked}
                  >
                    <span className="daily-check-box">
                      {checked ? '✓' : ''}
                    </span>
                    <span className="daily-check-icon">{item.icon || '✅'}</span>
                    <span className="daily-check-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {streak > 0
                          ? `🔥 ${streak}日連続`
                          : canEdit
                          ? 'タップしてチェック'
                          : '未確認'}
                      </small>
                    </span>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      className="daily-check-remove"
                      onClick={() => removeItem(item)}
                      aria-label={`${item.title}を削除`}
                    >
                      ×
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="checklist-empty">
            <span>☑️</span>
            <h3>チェック項目がまだありません</h3>
            <p>
              {canEdit
                ? '下のフォームから、毎日確認したいことを追加してね。'
                : 'オーナーか編集メンバーが項目を追加すると表示されます。'}
            </p>
          </div>
        )}

        <p className="message">{message}</p>
      </section>

      {canEdit && (
        <section className="card checklist-create-card">
          <div>
            <p className="eyebrow">CUSTOM ITEM</p>
            <h2>項目を追加</h2>
          </div>

          <div className="checklist-create-grid">
            <div>
              <label>アイコン</label>
              <EmojiPicker value={icon} onChange={setIcon} />
              <div className="checklist-icon-preview">
                <span>{icon || '✅'}</span>
                <small>現在のアイコン</small>
              </div>
            </div>

            <div>
              <label>項目名</label>
              <input
                value={title}
                placeholder="例：ご飯をあげた"
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                  }
                }}
              />
            </div>

            <button type="button" onClick={addItem}>
              ＋ 追加する
            </button>
          </div>
        </section>
      )}
    </>
  );
}
