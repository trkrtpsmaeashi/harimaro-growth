import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { today } from '../lib/helpers';
import MemoryPostCard from '../components/MemoryPostCard';

function monthLabel(dateText) {
  if (!dateText) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(`${dateText}T00:00:00`));
}

export default function MemoriesPage({
  user,
  memories,
  onReload,
  onOpenDetail,
}) {
  const [date, setDate] = useState(today());
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  function addSelectedFiles(fileList) {
    const incoming = Array.from(fileList || []);

    setFiles((current) => {
      const merged = [...current];

      for (const file of incoming) {
        const duplicate = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );

        if (!duplicate) merged.push(file);
      }

      return merged;
    });
  }

  function removeSelectedFile(indexToRemove) {
    setFiles((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  const allTags = useMemo(
    () => [...new Set(memories.flatMap((memory) => memory.tags || []))]
      .sort((a, b) => a.localeCompare(b, 'ja')),
    [memories]
  );

  const filteredMemories = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return memories.filter((memory) => {
      const captionMatch =
        !keyword || (memory.caption || '').toLowerCase().includes(keyword);

      const tagMatch =
        !selectedTag || (memory.tags || []).includes(selectedTag);

      const favoriteMatch = !favoritesOnly || memory.is_favorite;

      return captionMatch && tagMatch && favoriteMatch;
    });
  }, [memories, searchText, selectedTag, favoritesOnly]);

  const groupedMemories = useMemo(() => {
    return filteredMemories.reduce((groups, memory) => {
      const label = monthLabel(memory.memory_date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(memory);
      return groups;
    }, {});
  }, [filteredMemories]);

  async function saveMemory() {
    if (!date || files.length === 0) {
      setMessage('日付と写真を選んでね。');
      return;
    }

    setMessage(`${files.length}枚を保存中…`);

    const parsedTags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const { data: post, error: postError } = await supabase
      .from('harimaro_memory_posts')
      .insert({
        user_id: user.id,
        memory_date: date,
        caption: caption.trim(),
        tags: parsedTags,
        is_favorite: false,
      })
      .select()
      .single();

    if (postError) {
      setMessage(postError.message);
      return;
    }

    const uploadedPaths = [];
    const photoRows = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const path = `${user.id}/memory-posts/${post.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;

      const upload = await supabase.storage
        .from('harimaro-photos')
        .upload(path, file, { upsert: false });

      if (upload.error) {
        if (uploadedPaths.length) {
          await supabase.storage
            .from('harimaro-photos')
            .remove(uploadedPaths);
        }

        await supabase
          .from('harimaro_memory_posts')
          .delete()
          .eq('id', post.id);

        setMessage(upload.error.message);
        return;
      }

      uploadedPaths.push(path);

      const photoUrl = supabase.storage
        .from('harimaro-photos')
        .getPublicUrl(path).data.publicUrl;

      photoRows.push({
        post_id: post.id,
        photo_url: photoUrl,
        photo_path: path,
        sort_order: index,
      });
    }

    const { error: photosError } = await supabase
      .from('harimaro_memory_photos')
      .insert(photoRows);

    if (photosError) {
      await supabase.storage
        .from('harimaro-photos')
        .remove(uploadedPaths);

      await supabase
        .from('harimaro_memory_posts')
        .delete()
        .eq('id', post.id);

      setMessage(photosError.message);
      return;
    }

    const savedCount = files.length;
    setCaption('');
    setTags('');
    setFiles([]);
    setMessage(`${savedCount}枚を1つの思い出として保存しました。`);
    document.querySelector('#memoryPhoto').value = '';
    await onReload();
  }

  async function toggleFavorite(post) {
    const { error } = await supabase
      .from('harimaro_memory_posts')
      .update({ is_favorite: !post.is_favorite })
      .eq('id', post.id);

    if (error) {
      alert(error.message);
      return;
    }

    await onReload();
  }

  async function deletePost(post) {
    if (!confirm('この思い出投稿を写真ごと削除する？')) return;

    const paths = (post.photos || [])
      .map((photo) => photo.photo_path)
      .filter(Boolean);

    if (paths.length) {
      await supabase.storage
        .from('harimaro-photos')
        .remove(paths);
    }

    const { error } = await supabase
      .from('harimaro_memory_posts')
      .delete()
      .eq('id', post.id);

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
        <p className="muted">
          複数の写真を、1つの思い出投稿として保存できます。
        </p>
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
              multiple
              onChange={(event) => {
                addSelectedFiles(event.target.files);
                event.target.value = '';
              }}
            />

            <p className="selected-files">
              {files.length
                ? `${files.length}枚選択中。もう一度選択すると追加できます。`
                : '1枚ずつでも、複数枚まとめても追加できます。'}
            </p>

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
                      onClick={() => removeSelectedFile(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="clear-files-button"
                  onClick={() => setFiles([])}
                >
                  選択をすべて解除
                </button>
              </div>
            )}
          </div>
        </div>

        <label>ひとこと（任意）</label>
        <textarea
          value={caption}
          placeholder="今日はタオルに潜って爆睡してた"
          onChange={(event) => setCaption(event.target.value)}
        />

        <label>タグ（カンマ区切り・任意）</label>
        <input
          value={tags}
          placeholder="寝顔, 部屋んぽ, ミルワーム"
          onChange={(event) => setTags(event.target.value)}
        />

        <div className="button-row">
          <button onClick={saveMemory}>
            📷 {files.length > 1 ? `${files.length}枚を投稿` : '思い出を投稿'}
          </button>
        </div>

        <p className="message">{message}</p>
      </section>

      <section className="section-heading memory-heading">
        <div>
          <p className="eyebrow">ALBUM</p>
          <h2>Memories</h2>
        </div>
        <span className="count-pill">
          {filteredMemories.length} / {memories.length}投稿
        </span>
      </section>

      <section className="card memory-tools">
        <div className="memory-search">
          <label>ひとこと検索</label>
          <input
            type="search"
            value={searchText}
            placeholder="爆睡、タオル、かわいい…"
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="memory-filter-row">
          <button
            className={`memory-filter-button ${selectedTag === '' ? 'active' : ''}`}
            onClick={() => setSelectedTag('')}
          >
            すべて
          </button>

          {allTags.map((tag) => (
            <button
              key={tag}
              className={`memory-filter-button ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}

          <button
            className={`memory-filter-button favorite-filter ${favoritesOnly ? 'active' : ''}`}
            onClick={() => setFavoritesOnly((current) => !current)}
          >
            ❤️ お気に入り
          </button>
        </div>
      </section>

      {Object.keys(groupedMemories).length ? (
        Object.entries(groupedMemories).map(([label, posts]) => (
          <section key={label} className="memory-month">
            <h3>{label}</h3>

            <div className="memory-post-grid">
              {posts.map((post) => (
                <MemoryPostCard
                  key={post.id}
                  post={post}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deletePost}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="card muted">条件に合う思い出がありません。</p>
      )}
    </>
  );
}
