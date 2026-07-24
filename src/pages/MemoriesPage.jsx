import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, today } from '../lib/helpers';

export default function MemoriesPage({
  user,
  memories,
  onReload,
  onPhoto,
}) {
  const [date, setDate] = useState(today());
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  async function saveMemory() {
    if (!date || !file) {
      setMessage('日付と写真を選んでね。');
      return;
    }

    setMessage('保存中…');

    const path = `${user.id}/memories/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;

    const upload = await supabase.storage
      .from('harimaro-photos')
      .upload(path, file, { upsert: false });

    if (upload.error) {
      setMessage(upload.error.message);
      return;
    }

    const photoUrl = supabase.storage
      .from('harimaro-photos')
      .getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from('harimaro_memories').insert({
      user_id: user.id,
      memory_date: date,
      caption: caption.trim(),
      photo_url: photoUrl,
      photo_path: path,
    });

    if (error) {
      await supabase.storage.from('harimaro-photos').remove([path]);
      setMessage(error.message);
      return;
    }

    setCaption('');
    setFile(null);
    setMessage('保存しました。');
    document.querySelector('#memoryPhoto').value = '';
    await onReload();
  }

  async function deleteMemory(memory) {
    if (!confirm('この思い出を削除する？')) return;

    if (memory.photo_path) {
      await supabase.storage
        .from('harimaro-photos')
        .remove([memory.photo_path]);
    }

    const { error } = await supabase
      .from('harimaro_memories')
      .delete()
      .eq('id', memory.id);

    if (error) {
      alert(error.message);
      return;
    }

    await onReload();
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">MEMORIES</p>
        <h2>思い出を残す</h2>
        <p className="muted">体重を測らない日も、写真だけ気軽に残せます。</p>
      </section>

      <section className="card memory-form">
        <div className="form-grid">
          <div>
            <label>日付</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div>
            <label>写真</label>
            <input
              id="memoryPhoto"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </div>
        </div>

        <label>ひとこと（任意）</label>
        <textarea
          value={caption}
          placeholder="今日はタオルに潜って爆睡してた"
          onChange={(event) => setCaption(event.target.value)}
        />

        <div className="button-row">
          <button onClick={saveMemory}>📷 思い出を保存</button>
        </div>

        <p className="message">{message}</p>
      </section>

      <section className="section-heading memory-heading">
        <div>
          <p className="eyebrow">ALBUM</p>
          <h2>Memories</h2>
        </div>
        <span className="count-pill">{memories.length}枚</span>
      </section>

      <section className="memory-grid">
        {memories.length ? (
          memories.map((memory) => (
            <article key={memory.id} className="memory-card">
              <button
                className="memory-photo"
                onClick={() => onPhoto(memory.photo_url)}
              >
                <img src={memory.photo_url} alt="はりまろの思い出" />
              </button>

              <div className="memory-card-body">
                <time>{formatDate(memory.memory_date)}</time>
                <p>{memory.caption || 'ひとことなし'}</p>
                <button
                  className="delete-button"
                  onClick={() => deleteMemory(memory)}
                >
                  削除
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="card muted">まだ思い出写真がありません。</p>
        )}
      </section>
    </>
  );
}
