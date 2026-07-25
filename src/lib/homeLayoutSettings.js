export const DEFAULT_HOME_LAYOUT = [
  { id: 'reminders', label: 'リマインダー', visible: true },
  { id: 'checklist', label: '毎日のチェック', visible: true },
  { id: 'hero', label: 'はりまろの今', visible: true },
  { id: 'weightSummary', label: '体重サマリー', visible: true },
  { id: 'memorySummary', label: 'Memoriesサマリー', visible: true },
  { id: 'dashboard', label: '最新記録・すぐ見る', visible: true },
  { id: 'onThisDay', label: '今日と同じ日の思い出', visible: true },
  { id: 'recentMemories', label: '最近の思い出', visible: true },
  { id: 'recentRecords', label: '最近の記録', visible: true },
];

const STORAGE_KEY = 'harimaro-home-layout-v35';

export function loadHomeLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');

    if (!Array.isArray(saved)) {
      return DEFAULT_HOME_LAYOUT.map((item) => ({ ...item }));
    }

    const savedMap = new Map(saved.map((item) => [item.id, item]));
    const merged = DEFAULT_HOME_LAYOUT.map((item) => ({
      ...item,
      visible:
        typeof savedMap.get(item.id)?.visible === 'boolean'
          ? savedMap.get(item.id).visible
          : item.visible,
    }));

    const ordered = saved
      .map((item) => merged.find((candidate) => candidate.id === item.id))
      .filter(Boolean);

    for (const item of merged) {
      if (!ordered.some((candidate) => candidate.id === item.id)) {
        ordered.push(item);
      }
    }

    return ordered;
  } catch {
    return DEFAULT_HOME_LAYOUT.map((item) => ({ ...item }));
  }
}

export function saveHomeLayout(layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function resetHomeLayout() {
  const next = DEFAULT_HOME_LAYOUT.map((item) => ({ ...item }));
  saveHomeLayout(next);
  return next;
}
