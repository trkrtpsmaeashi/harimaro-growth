import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { today } from '../lib/helpers';

export default function NewRecordPage({ user, householdId, onSaved, onCancel }) {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  async function save() {
    if (!date || !weight) {
      setMessage('日付と体重を入力してね。');
      return;
    }

    setMessage('保存中…');
    let photoUrl = null;
    let photoPath = null;

    if (file) {
      photoPath = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const upload = await supabase.storage.from('harimaro-photos').upload(photoPath, file);

      if (upload.error) {
        setMessage(upload.error.message);
        return;
      }

      photoUrl = supabase.storage.from('harimaro-photos').getPublicUrl(photoPath).data.publicUrl;
    }

    const { error } = await supabase.from('hedgehog_records').insert({
      user_id: user.id,
      household_id: householdId,
      created_by: user.id,
      recorded_on: date,
      weight_g: Number(weight),
      memo: memo.trim(),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      photo_url: photoUrl,
      photo_path: photoPath,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await onSaved();
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">NEW RECORD</p>
        <h2>新しい記録</h2>
      </section>

      <section className="card">
        <div className="form-grid">
          <div>
            <label>日付</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>体重（g）</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
        </div>

        <label>写真</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />

        <label>メモ</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} />

        <label>タグ（カンマ区切り）</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} />

        <div className="button-row">
          <button onClick={save}>保存する</button>
          <button className="secondary-button" onClick={onCancel}>ホームへ戻る</button>
        </div>

        <p className="message">{message}</p>
      </section>
    </>
  );
}
