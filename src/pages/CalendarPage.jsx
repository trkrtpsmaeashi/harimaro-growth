import { useMemo, useState } from 'react';
import { formatDate } from '../lib/helpers';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function monthKey(year, monthIndex) {
  return `${year}-${pad(monthIndex + 1)}`;
}

function dateKey(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function getCalendarCells(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export default function CalendarPage({
  records,
  memories,
  onOpenMemory,
  onPhoto,
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState('');

  const currentMonthKey = monthKey(year, monthIndex);
  const cells = useMemo(
    () => getCalendarCells(year, monthIndex),
    [year, monthIndex]
  );

  const recordsByDate = useMemo(() => {
    return records.reduce((map, record) => {
      if (!map[record.recorded_on]) map[record.recorded_on] = [];
      map[record.recorded_on].push(record);
      return map;
    }, {});
  }, [records]);

  const memoriesByDate = useMemo(() => {
    return memories.reduce((map, memory) => {
      if (!map[memory.memory_date]) map[memory.memory_date] = [];
      map[memory.memory_date].push(memory);
      return map;
    }, {});
  }, [memories]);

  const selectedRecords = selectedDate
    ? recordsByDate[selectedDate] || []
    : [];

  const selectedMemories = selectedDate
    ? memoriesByDate[selectedDate] || []
    : [];

  const monthRecordCount = records.filter(
    (record) => record.recorded_on?.startsWith(currentMonthKey)
  ).length;

  const monthMemoryCount = memories.filter(
    (memory) => memory.memory_date?.startsWith(currentMonthKey)
  ).length;

  const monthPhotoCount = memories
    .filter((memory) => memory.memory_date?.startsWith(currentMonthKey))
    .reduce((total, memory) => total + (memory.photos?.length || 0), 0);

  function moveMonth(amount) {
    const next = new Date(year, monthIndex + amount, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
    setSelectedDate('');
  }

  function goToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
    setSelectedDate(today.toISOString().slice(0, 10));
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">CALENDAR</p>
        <h2>思い出カレンダー</h2>
        <p className="muted">
          体重記録とMemoriesを、日付ごとにまとめて確認できます。
        </p>
      </section>

      <section className="calendar-summary-grid">
        <article>
          <span>⚖️</span>
          <strong>{monthRecordCount}件</strong>
          <small>今月の記録</small>
        </article>
        <article>
          <span>📷</span>
          <strong>{monthMemoryCount}投稿</strong>
          <small>今月の思い出</small>
        </article>
        <article>
          <span>🖼️</span>
          <strong>{monthPhotoCount}枚</strong>
          <small>今月の写真</small>
        </article>
      </section>

      <section className="card calendar-card">
        <header className="calendar-header">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="前の月">
            ‹
          </button>

          <div>
            <h2>{year}年{monthIndex + 1}月</h2>
            <button type="button" className="today-button" onClick={goToday}>
              今日へ
            </button>
          </div>

          <button type="button" onClick={() => moveMonth(1)} aria-label="次の月">
            ›
          </button>
        </header>

        <div className="calendar-weekdays">
          {WEEKDAYS.map((weekday, index) => (
            <span
              key={weekday}
              className={
                index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''
              }
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="calendar-empty" />;
            }

            const key = dateKey(year, monthIndex, day);
            const dayRecords = recordsByDate[key] || [];
            const dayMemories = memoriesByDate[key] || [];
            const isSelected = selectedDate === key;
            const isToday = key === new Date().toISOString().slice(0, 10);

            return (
              <button
                key={key}
                type="button"
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(key)}
              >
                <span className="calendar-day-number">{day}</span>

                <span className="calendar-icons">
                  {dayRecords.length > 0 && (
                    <span title={`${dayRecords.length}件の記録`}>
                      ⚖️
                      {dayRecords.length > 1 && (
                        <small>{dayRecords.length}</small>
                      )}
                    </span>
                  )}

                  {dayMemories.length > 0 && (
                    <span title={`${dayMemories.length}件の思い出`}>
                      📷
                      {dayMemories.length > 1 && (
                        <small>{dayMemories.length}</small>
                      )}
                    </span>
                  )}
                </span>

                {dayMemories[0]?.photos?.[0] && (
                  <img
                    className="calendar-day-thumb"
                    src={dayMemories[0].photos[0].photo_url}
                    alt=""
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDate && (
        <section className="card calendar-detail">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DAY DETAIL</p>
              <h2>{formatDate(selectedDate)}</h2>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() => setSelectedDate('')}
            >
              閉じる
            </button>
          </div>

          {!selectedRecords.length && !selectedMemories.length && (
            <p className="muted">この日の記録はまだありません。</p>
          )}

          {selectedRecords.length > 0 && (
            <div className="calendar-detail-section">
              <h3>⚖️ 体重記録</h3>

              <div className="calendar-record-list">
                {selectedRecords.map((record) => (
                  <article key={record.id} className="calendar-record-item">
                    {record.photo_url ? (
                      <button
                        type="button"
                        onClick={() => onPhoto(record.photo_url)}
                      >
                        <img src={record.photo_url} alt="はりまろ" />
                      </button>
                    ) : (
                      <div className="calendar-record-placeholder">🦔</div>
                    )}

                    <div>
                      <strong>{record.weight_g}g</strong>
                      <p>{record.memo || 'メモなし'}</p>

                      <div className="tag-list">
                        {(record.tags || []).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {selectedMemories.length > 0 && (
            <div className="calendar-detail-section">
              <h3>📷 Memories</h3>

              <div className="calendar-memory-grid">
                {selectedMemories.map((memory) => (
                  <button
                    type="button"
                    key={memory.id}
                    className="calendar-memory-item"
                    onClick={() => onOpenMemory(memory, 0)}
                  >
                    {memory.photos?.[0] ? (
                      <img
                        src={memory.photos[0].photo_url}
                        alt={memory.caption || 'はりまろの思い出'}
                      />
                    ) : (
                      <span>🦔</span>
                    )}

                    <div>
                      <strong>
                        {memory.photos?.length || 0}枚
                        {memory.is_favorite ? ' ❤️' : ''}
                      </strong>
                      <p>{memory.caption || 'ひとことなし'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
