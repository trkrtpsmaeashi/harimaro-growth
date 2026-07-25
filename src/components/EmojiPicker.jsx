import { useMemo, useState } from 'react';

const EMOJI_GROUPS = [
  {
    id: 'recent',
    label: '最近',
    icon: '🕘',
    emojis: [],
  },
  {
    id: 'care',
    label: 'お世話',
    icon: '🦔',
    emojis: [
      ['🦔', 'はりねずみ ペット'],
      ['🐾', '足あと ペット'],
      ['🤲', 'お世話 ふれあい'],
      ['❤️', '愛情 かわいい'],
      ['🫶', '愛情 ふれあい'],
      ['👀', '確認 見る'],
      ['✅', '完了 チェック'],
      ['☑️', '確認 チェック'],
      ['⭐', '大事 お気に入り'],
      ['🌟', '特別 初めて'],
      ['📷', '写真 撮影'],
      ['🎥', '動画 撮影'],
    ],
  },
  {
    id: 'food',
    label: 'ご飯',
    icon: '🍚',
    emojis: [
      ['🍚', 'ご飯 フード'],
      ['🥣', 'ご飯 皿'],
      ['🍽️', '食事 ご飯'],
      ['🥩', '肉 ご飯'],
      ['🍗', '肉 チキン'],
      ['🥕', '野菜 にんじん'],
      ['🍎', '果物 りんご'],
      ['🍌', '果物 バナナ'],
      ['🪱', 'ミルワーム 虫'],
      ['🐛', '虫 ミルワーム'],
      ['🧀', 'チーズ おやつ'],
      ['🥛', 'ミルク 飲み物'],
      ['🍼', 'ミルク'],
      ['😋', '食べた おいしい'],
    ],
  },
  {
    id: 'water',
    label: '水・温度',
    icon: '💧',
    emojis: [
      ['💧', '水 交換'],
      ['🚰', '水 飲み水'],
      ['🥤', '飲み物'],
      ['🫗', '水 入れる'],
      ['🌡️', '温度 温度計'],
      ['🔥', '暖房 ヒーター'],
      ['❄️', '冷房 涼しい'],
      ['☀️', '昼 暖かい'],
      ['🌙', '夜'],
      ['💨', '風 換気'],
      ['💦', '水 湿度'],
      ['🏜️', '乾燥'],
    ],
  },
  {
    id: 'exercise',
    label: '運動・行動',
    icon: '🎡',
    emojis: [
      ['🎡', '回し車 運動'],
      ['🏃', '走る 運動'],
      ['💨', '走った'],
      ['🛞', '回し車 ホイール'],
      ['🏠', '巣箱 ハウス'],
      ['🛏️', '寝床 睡眠'],
      ['😴', '寝る 睡眠'],
      ['💤', '睡眠'],
      ['🔍', '確認 探索'],
      ['🧭', '探索 冒険'],
      ['🚪', '部屋んぽ 外'],
      ['🎉', '元気 遊ぶ'],
    ],
  },
  {
    id: 'clean',
    label: '掃除・排泄',
    icon: '🧹',
    emojis: [
      ['🧹', '掃除'],
      ['🧼', '洗う 掃除'],
      ['🧽', '掃除 スポンジ'],
      ['🗑️', 'ゴミ 捨てる'],
      ['💩', 'うんち 排泄'],
      ['🚽', 'トイレ 排泄'],
      ['🪣', '水替え 掃除'],
      ['🧺', '洗濯 タオル'],
      ['✨', 'きれい 掃除'],
      ['🪵', '床材 チップ'],
      ['🏖️', '砂浴び 砂'],
      ['🛁', 'お風呂 洗う'],
    ],
  },
  {
    id: 'health',
    label: '健康',
    icon: '🏥',
    emojis: [
      ['⚖️', '体重 測定'],
      ['🏥', '病院'],
      ['🩺', '診察 健康'],
      ['💊', '薬 投薬'],
      ['💉', '注射 病院'],
      ['🩹', 'けが 手当'],
      ['✂️', '爪切り'],
      ['🦷', '歯 口'],
      ['👂', '耳 確認'],
      ['👃', '鼻 確認'],
      ['🫁', '呼吸 健康'],
      ['🤒', '体調不良'],
      ['😊', '元気 体調'],
      ['😟', '心配 体調'],
    ],
  },
  {
    id: 'time',
    label: '時間・予定',
    icon: '⏰',
    emojis: [
      ['⏰', '時間 アラーム'],
      ['🕒', '時間'],
      ['📅', '日付 予定'],
      ['🗓️', '予定 カレンダー'],
      ['📌', '重要 予定'],
      ['🔔', '通知 リマインダー'],
      ['🌅', '朝'],
      ['🌆', '夕方'],
      ['🌙', '夜'],
      ['📆', '毎日'],
      ['🔁', '繰り返し'],
      ['⏳', '待つ 時間'],
    ],
  },
];

const RECENT_KEY = 'harimaro-checklist-recent-emojis';

function loadRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 18) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji, current) {
  const next = [emoji, ...current.filter((item) => item !== emoji)].slice(0, 18);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be disabled in private browsing.
  }

  return next;
}

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState('care');
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState(loadRecent);

  const groups = useMemo(
    () =>
      EMOJI_GROUPS.map((item) =>
        item.id === 'recent'
          ? {
              ...item,
              emojis: recent.map((emoji) => [emoji, '最近 使用']),
            }
          : item
      ),
    [recent]
  );

  const results = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (keyword) {
      return groups
        .flatMap((item) => item.emojis)
        .filter(
          ([emoji, words], index, list) =>
            words.toLowerCase().includes(keyword) &&
            list.findIndex(([candidate]) => candidate === emoji) === index
        );
    }

    return (
      groups.find((item) => item.id === group)?.emojis || []
    );
  }, [groups, group, search]);

  function selectEmoji(emoji) {
    onChange(emoji);
    setRecent((current) => saveRecent(emoji, current));
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="emoji-picker">
      <button
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value || '✅'}</span>
        <strong>絵文字を選ぶ</strong>
      </button>

      {open && (
        <div className="emoji-picker-panel">
          <header>
            <div>
              <strong>絵文字を選択</strong>
              <small>検索またはカテゴリから選べます</small>
            </div>

            <button
              type="button"
              className="emoji-picker-close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <input
            className="emoji-picker-search"
            value={search}
            placeholder="ご飯、水、掃除、病院…"
            onChange={(event) => setSearch(event.target.value)}
          />

          {!search && (
            <div className="emoji-picker-tabs">
              {groups.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  className={group === item.id ? 'active' : ''}
                  disabled={item.id === 'recent' && recent.length === 0}
                  onClick={() => setGroup(item.id)}
                >
                  <span>{item.icon}</span>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
          )}

          <div className="emoji-picker-grid">
            {results.map(([emoji, words]) => (
              <button
                key={`${emoji}-${words}`}
                type="button"
                title={words}
                onClick={() => selectEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          {!results.length && (
            <div className="emoji-picker-empty">
              <span>🔍</span>
              <p>見つかりませんでした</p>
              <small>下の入力欄から好きな絵文字を直接入力できます。</small>
            </div>
          )}

          <div className="emoji-picker-custom">
            <label>好きな絵文字を直接入力</label>
            <div>
              <input
                value={value}
                maxLength={8}
                placeholder="🐹"
                onChange={(event) => onChange(event.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (value.trim()) selectEmoji(value.trim());
                }}
              >
                決定
              </button>
            </div>
            <small>
              スマホでは絵文字キーボードから、どの絵文字でも入力できます。
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
