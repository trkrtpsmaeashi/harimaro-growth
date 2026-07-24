import { useMemo, useState } from 'react';
import RecordCard from '../components/RecordCard';
import { formatDate } from '../lib/helpers';
import { getMediaType, getMediaUrl } from '../lib/media';
import MemoryMedia from '../components/MemoryMedia';

function monthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

export default function TagsPage({
  records,
  memories,
  onPhoto,
  onDelete,
  onOpenMemory,
}) {
  const [selected, setSelected] = useState('');
  const [source, setSource] = useState('all');

  const tagStats = useMemo(() => {
    const stats = {};

    for (const record of records) {
      for (const tag of record.tags || []) {
        if (!stats[tag]) {
          stats[tag] = {
            tag,
            recordCount: 0,
            memoryCount: 0,
            total: 0,
            months: {},
          };
        }

        stats[tag].recordCount += 1;
        stats[tag].total += 1;

        const month = record.recorded_on?.slice(0, 7);
        if (month) {
          stats[tag].months[month] = (stats[tag].months[month] || 0) + 1;
        }
      }
    }

    for (const memory of memories) {
      for (const tag of memory.tags || []) {
        if (!stats[tag]) {
          stats[tag] = {
            tag,
            recordCount: 0,
            memoryCount: 0,
            total: 0,
            months: {},
          };
        }

        stats[tag].memoryCount += 1;
        stats[tag].total += 1;

        const month = memory.memory_date?.slice(0, 7);
        if (month) {
          stats[tag].months[month] = (stats[tag].months[month] || 0) + 1;
        }
      }
    }

    return Object.values(stats).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.tag.localeCompare(b.tag, 'ja');
    });
  }, [records, memories]);

  const selectedStat = tagStats.find((item) => item.tag === selected);

  const filteredRecords = useMemo(() => {
    if (!selected || source === 'memories') return [];

    return records.filter((record) =>
      (record.tags || []).includes(selected)
    );
  }, [records, selected, source]);

  const filteredMemories = useMemo(() => {
    if (!selected || source === 'records') return [];

    return memories.filter((memory) =>
      (memory.tags || []).includes(selected)
    );
  }, [memories, selected, source]);

  const maxCount = tagStats[0]?.total || 1;

  const monthEntries = selectedStat
    ? Object.entries(selectedStat.months).sort((a, b) =>
        b[0].localeCompare(a[0])
      )
    : [];

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">TAG ANALYTICS</p>
        <h2>タグ統計</h2>
        <p className="muted">
          記録とMemoriesで、よく残している出来事を確認できます。
        </p>
      </section>

      <section className="tag-summary-grid">
        <article>
          <span>🏷️</span>
          <strong>{tagStats.length}種類</strong>
          <small>登録済みタグ</small>
        </article>

        <article>
          <span>🥇</span>
          <strong>{tagStats[0]?.tag || '-'}</strong>
          <small>
            {tagStats[0] ? `${tagStats[0].total}回・最多タグ` : '最多タグ'}
          </small>
        </article>

        <article>
          <span>📝</span>
          <strong>
            {tagStats.reduce((sum, item) => sum + item.total, 0)}回
          </strong>
          <small>タグ使用合計</small>
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RANKING</p>
            <h2>タグランキング</h2>
          </div>
          <span className="count-pill">{tagStats.length}件</span>
        </div>

        {tagStats.length ? (
          <div className="tag-ranking-list">
            {tagStats.map((item, index) => (
              <button
                key={item.tag}
                type="button"
                className={`tag-ranking-item ${
                  selected === item.tag ? 'active' : ''
                }`}
                onClick={() =>
                  setSelected((current) =>
                    current === item.tag ? '' : item.tag
                  )
                }
              >
                <span className="tag-rank">
                  {index === 0
                    ? '🥇'
                    : index === 1
                    ? '🥈'
                    : index === 2
                    ? '🥉'
                    : `${index + 1}`}
                </span>

                <div className="tag-ranking-main">
                  <div className="tag-ranking-header">
                    <strong>{item.tag}</strong>
                    <span>{item.total}回</span>
                  </div>

                  <div className="tag-progress">
                    <i
                      style={{
                        width: `${Math.max(
                          8,
                          (item.total / maxCount) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <small>
                    記録 {item.recordCount}件・Memories {item.memoryCount}件
                  </small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">まだタグがありません。</p>
        )}
      </section>

      {selected && selectedStat && (
        <>
          <section className="card selected-tag-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SELECTED TAG</p>
                <h2>🏷️ {selected}</h2>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => setSelected('')}
              >
                選択解除
              </button>
            </div>

            <div className="source-filter-row">
              <button
                type="button"
                className={source === 'all' ? 'active' : ''}
                onClick={() => setSource('all')}
              >
                すべて
              </button>

              <button
                type="button"
                className={source === 'records' ? 'active' : ''}
                onClick={() => setSource('records')}
              >
                体重記録
              </button>

              <button
                type="button"
                className={source === 'memories' ? 'active' : ''}
                onClick={() => setSource('memories')}
              >
                Memories
              </button>
            </div>

            {monthEntries.length > 0 && (
              <div className="tag-month-list">
                {monthEntries.map(([month, count]) => (
                  <div key={month}>
                    <span>{monthLabel(month)}</span>
                    <strong>{count}回</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {source !== 'memories' && (
            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">RECORDS</p>
                  <h2>体重記録</h2>
                </div>
                <span className="count-pill">
                  {filteredRecords.length}件
                </span>
              </div>

              {filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    onPhoto={onPhoto}
                    onDelete={onDelete}
                  />
                ))
              ) : (
                <p className="muted">
                  このタグが付いた体重記録はありません。
                </p>
              )}
            </section>
          )}

          {source !== 'records' && (
            <section className="card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MEMORIES</p>
                  <h2>思い出投稿</h2>
                </div>
                <span className="count-pill">
                  {filteredMemories.length}投稿
                </span>
              </div>

              {filteredMemories.length ? (
                <div className="tag-memory-grid">
                  {filteredMemories.map((memory) => (
                    <button
                      key={memory.id}
                      type="button"
                      className="tag-memory-card"
                      onClick={() => onOpenMemory(memory, 0)}
                    >
                      {memory.photos?.[0] ? (
                        <MemoryMedia
                  media={memory.photos[0]}
                  alt={memory.caption || 'はりまろの思い出'}
                />
                      ) : (
                        <span>🦔</span>
                      )}

                      <div>
                        <time>{formatDate(memory.memory_date)}</time>
                        <strong>
                          {memory.photos?.length || 0}枚
                          {memory.is_favorite ? ' ❤️' : ''}
                        </strong>
                        <p>{memory.caption || 'ひとことなし'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  このタグが付いたMemoriesはありません。
                </p>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
