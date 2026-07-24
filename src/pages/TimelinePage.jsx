import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, today } from '../lib/helpers';

const EVENT_TYPES = [
  ['welcome', '🏠', 'お迎え'],
  ['birthday', '🎂', '誕生日'],
  ['hospital', '🏥', '病院'],
  ['nails', '✂️', '爪切り'],
  ['first', '🌟', '初めて'],
  ['food', '🐛', 'ごはん'],
  ['other', '🎉', 'その他'],
];

function eventMeta(type) {
  return EVENT_TYPES.find(([id]) => id === type) || EVENT_TYPES.at(-1);
}

function dateValue(item) {
  if (item.kind === 'record') return item.recorded_on;
  if (item.kind === 'memory') return item.memory_date;
  return item.event_date;
}

function yearOf(item) {
  return dateValue(item)?.slice(0, 4) || '不明';
}

export default function TimelinePage({
  user,
  householdId,
  records,
  memories,
  events,
  onReloadEvents,
  onPhoto,
  onOpenMemory,
}) {
  const [filter, setFilter] = useState('all');
  const [openYears, setOpenYears] = useState({});
  const [formOpen, setFormOpen] = useState(false);
  const [eventDate, setEventDate] = useState(today());
  const [eventType, setEventType] = useState('other');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');

  const timelineItems = useMemo(() => {
    const recordItems = records.map((record) => ({
      ...record,
      kind: 'record',
    }));

    const memoryItems = memories.map((memory) => ({
      ...memory,
      kind: 'memory',
    }));

    const eventItems = events.map((event) => ({
      ...event,
      kind: 'event',
    }));

    return [...recordItems, ...memoryItems, ...eventItems].sort((a, b) =>
      dateValue(b).localeCompare(dateValue(a))
    );
  }, [records, memories, events]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return timelineItems;
    return timelineItems.filter((item) => item.kind === filter);
  }, [timelineItems, filter]);

  const grouped = useMemo(() => {
    return filteredItems.reduce((map, item) => {
      const year = yearOf(item);
      if (!map[year]) map[year] = [];
      map[year].push(item);
      return map;
    }, {});
  }, [filteredItems]);

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const yearlyStats = useMemo(() => {
    return timelineItems.reduce((map, item) => {
      const year = yearOf(item);
      if (!map[year]) {
        map[year] = {
          records: 0,
          memories: 0,
          favorites: 0,
          events: 0,
          tags: new Set(),
        };
      }

      if (item.kind === 'record') {
        map[year].records += 1;
        (item.tags || []).forEach((tag) => map[year].tags.add(tag));
      }

      if (item.kind === 'memory') {
        map[year].memories += 1;
        if (item.is_favorite) map[year].favorites += 1;
        (item.tags || []).forEach((tag) => map[year].tags.add(tag));
      }

      if (item.kind === 'event') {
        map[year].events += 1;
      }

      return map;
    }, {});
  }, [timelineItems]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    setFiles((current) => {
      const next = [...current];

      for (const file of incoming) {
        const duplicate = next.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );
        if (!duplicate) next.push(file);
      }

      return next;
    });
  }

  async function saveEvent() {
    if (!eventDate || !title.trim()) {
      setMessage('日付とタイトルを入力してね。');
      return;
    }

    setMessage('イベントを保存中…');

    const { data: event, error: eventError } = await supabase
      .from('harimaro_events')
      .insert({
        user_id: user.id,
        household_id: householdId,
        created_by: user.id,
        event_date: eventDate,
        event_type: eventType,
        title: title.trim(),
        note: note.trim(),
      })
      .select()
      .single();

    if (eventError) {
      setMessage(eventError.message);
      return;
    }

    const uploadedPaths = [];
    const photoRows = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const safeName = file.name.replace(/[^\w.-]/g, '_');
      const path = `${user.id}/events/${event.id}/${crypto.randomUUID()}-${safeName}`;

      const upload = await supabase.storage
        .from('harimaro-photos')
        .upload(path, file, { upsert: false });

      if (upload.error) {
        if (uploadedPaths.length) {
          await supabase.storage.from('harimaro-photos').remove(uploadedPaths);
        }
        await supabase.from('harimaro_events').delete().eq('id', event.id);
        setMessage(upload.error.message);
        return;
      }

      uploadedPaths.push(path);

      const photoUrl = supabase.storage
        .from('harimaro-photos')
        .getPublicUrl(path).data.publicUrl;

      photoRows.push({
        event_id: event.id,
        photo_url: photoUrl,
        photo_path: path,
        sort_order: index,
      });
    }

    if (photoRows.length) {
      const { error: photosError } = await supabase
        .from('harimaro_event_photos')
        .insert(photoRows);

      if (photosError) {
        await supabase.storage.from('harimaro-photos').remove(uploadedPaths);
        await supabase.from('harimaro_events').delete().eq('id', event.id);
        setMessage(photosError.message);
        return;
      }
    }

    setEventDate(today());
    setEventType('other');
    setTitle('');
    setNote('');
    setFiles([]);
    setMessage('イベントを保存しました。');
    setFormOpen(false);
    await onReloadEvents();
  }

  async function deleteEvent(event) {
    if (!confirm(`「${event.title}」を削除する？`)) return;

    const paths = (event.photos || [])
      .map((photo) => photo.photo_path)
      .filter(Boolean);

    if (paths.length) {
      await supabase.storage.from('harimaro-photos').remove(paths);
    }

    const { error } = await supabase
      .from('harimaro_events')
      .delete()
      .eq('id', event.id)
      .eq('household_id', householdId);

    if (error) {
      alert(error.message);
      return;
    }

    await onReloadEvents();
  }

  function toggleYear(year) {
    setOpenYears((current) => ({
      ...current,
      [year]: current[year] === false ? true : false,
    }));
  }

  return (
    <>
      <section className="page-heading timeline-heading">
        <div>
          <p className="eyebrow">TIMELINE</p>
          <h2>はりまろ年表</h2>
          <p className="muted">
            体重、Memories、特別な出来事をひとつの年表で振り返れます。
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => setFormOpen((current) => !current)}
        >
          🎉 イベントを追加
        </button>
      </section>

      {formOpen && (
        <section className="card timeline-event-form">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEW EVENT</p>
              <h2>特別な出来事を残す</h2>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => setFormOpen(false)}
            >
              閉じる
            </button>
          </div>

          <div className="form-grid">
            <div>
              <label>日付</label>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </div>

            <div>
              <label>カテゴリー</label>
              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
              >
                {EVENT_TYPES.map(([id, icon, label]) => (
                  <option key={id} value={id}>
                    {icon} {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label>タイトル</label>
          <input
            value={title}
            placeholder="初めて500gを超えた"
            onChange={(event) => setTitle(event.target.value)}
          />

          <label>内容（任意）</label>
          <textarea
            value={note}
            placeholder="この日の出来事や気持ちを書いておこう"
            onChange={(event) => setNote(event.target.value)}
          />

          <label>写真（任意・複数可）</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />

          {files.length > 0 && (
            <div className="selected-file-list">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="selected-file-item"
                >
                  <span>{index + 1}. {file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="button-row">
            <button type="button" onClick={saveEvent}>
              🎉 イベントを保存
            </button>
          </div>

          <p className="message">{message}</p>
        </section>
      )}

      <section className="timeline-filter-row">
        {[
          ['all', 'すべて'],
          ['record', '⚖️ 体重'],
          ['memory', '📷 Memories'],
          ['event', '🎉 イベント'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filter === id ? 'active' : ''}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </section>

      {years.length ? (
        years.map((year) => {
          const isOpen = openYears[year] !== false;
          const stats = yearlyStats[year];

          return (
            <section key={year} className="timeline-year-section">
              <button
                type="button"
                className="timeline-year-header"
                onClick={() => toggleYear(year)}
              >
                <div>
                  <span>{isOpen ? '▼' : '▶'}</span>
                  <h2>{year}年</h2>
                  <small>{grouped[year].length}件</small>
                </div>

                <div className="timeline-year-stats">
                  <span>⚖️ {stats.records}</span>
                  <span>📷 {stats.memories}</span>
                  <span>❤️ {stats.favorites}</span>
                  <span>🎉 {stats.events}</span>
                  <span>🏷️ {stats.tags.size}</span>
                </div>
              </button>

              {isOpen && (
                <div className="timeline-list">
                  {grouped[year].map((item) => {
                    if (item.kind === 'record') {
                      return (
                        <article
                          key={`record-${item.id}`}
                          className="timeline-item timeline-record"
                        >
                          <span className="timeline-dot">⚖️</span>

                          <div className="timeline-card">
                            <time>{formatDate(item.recorded_on)}</time>

                            <div className="timeline-card-content">
                              {item.photo_url && (
                                <button
                                  type="button"
                                  className="timeline-thumb"
                                  onClick={() => onPhoto(item.photo_url)}
                                >
                                  <img src={item.photo_url} alt="はりまろ" />
                                </button>
                              )}

                              <div>
                                <strong>{item.weight_g}g</strong>
                                <p>{item.memo || 'メモなし'}</p>
                                <div className="tag-list">
                                  {(item.tags || []).map((tag) => (
                                    <span key={tag} className="tag">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    }

                    if (item.kind === 'memory') {
                      return (
                        <article
                          key={`memory-${item.id}`}
                          className="timeline-item timeline-memory"
                        >
                          <span className="timeline-dot">
                            {item.is_favorite ? '❤️' : '📷'}
                          </span>

                          <button
                            type="button"
                            className="timeline-card timeline-clickable"
                            onClick={() => onOpenMemory(item, 0)}
                          >
                            <time>{formatDate(item.memory_date)}</time>

                            <div className="timeline-card-content">
                              {item.photos?.[0] && (
                                <span className="timeline-thumb">
                                  <img
                                    src={item.photos[0].photo_url}
                                    alt={item.caption || 'はりまろの思い出'}
                                  />
                                </span>
                              )}

                              <div>
                                <strong>
                                  Memories・{item.photos?.length || 0}枚
                                </strong>
                                <p>{item.caption || 'ひとことなし'}</p>
                                <div className="tag-list">
                                  {(item.tags || []).map((tag) => (
                                    <span key={tag} className="tag">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        </article>
                      );
                    }

                    const [, icon, label] = eventMeta(item.event_type);

                    return (
                      <article
                        key={`event-${item.id}`}
                        className="timeline-item timeline-event"
                      >
                        <span className="timeline-dot">{icon}</span>

                        <div className="timeline-card timeline-event-card">
                          <div className="timeline-event-top">
                            <div>
                              <time>{formatDate(item.event_date)}</time>
                              <small>{icon} {label}</small>
                            </div>

                            <button
                              type="button"
                              className="timeline-delete-event"
                              onClick={() => deleteEvent(item)}
                            >
                              削除
                            </button>
                          </div>

                          <h3>{item.title}</h3>
                          <p>{item.note || '内容なし'}</p>

                          {(item.photos || []).length > 0 && (
                            <div className="timeline-event-photos">
                              {item.photos.map((photo) => (
                                <button
                                  key={photo.id}
                                  type="button"
                                  onClick={() => onPhoto(photo.photo_url)}
                                >
                                  <img
                                    src={photo.photo_url}
                                    alt={item.title}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      ) : (
        <p className="card muted">表示できる年表データがありません。</p>
      )}
    </>
  );
}
