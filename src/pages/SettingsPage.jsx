import {
  canShowBrowserNotifications,
  requestNotificationPermission,
  showBrowserNotification,
  weekdayLabel,
} from '../lib/notificationSettings';

export default function SettingsPage({
  email,
  count,
  notificationSettings,
  onChangeNotificationSettings,
}) {
  const permission =
    canShowBrowserNotifications() ? Notification.permission : 'unsupported';

  function update(key, value) {
    onChangeNotificationSettings({
      ...notificationSettings,
      [key]: value,
    });
  }

  async function enableBrowserNotifications() {
    const result = await requestNotificationPermission();

    if (result === 'granted') {
      showBrowserNotification(
        '🦔 Harimaro Memories',
        '通知を使えるようになりました。'
      );
    } else if (result === 'denied') {
      alert('通知が拒否されています。ブラウザのサイト設定から許可してください。');
    } else {
      alert('このブラウザは通知に対応していません。');
    }
  }

  function testNotification() {
    const shown = showBrowserNotification(
      '🦔 はりまろ',
      '今日は思い出を残した？'
    );

    if (!shown) {
      alert('先に「ブラウザ通知を許可」を押してください。');
    }
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">SETTINGS</p>
        <h2>設定</h2>
      </section>

      <section className="card settings-list">
        <div><strong>ログイン中</strong><span>{email}</span></div>
        <div><strong>保存済み記録</strong><span>{count}件</span></div>
      </section>

      <section className="card notification-settings-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NOTIFICATIONS</p>
            <h2>通知・リマインダー</h2>
          </div>
          <span className={`permission-pill permission-${permission}`}>
            {permission === 'granted'
              ? '通知許可済み'
              : permission === 'denied'
              ? '通知拒否中'
              : permission === 'unsupported'
              ? '非対応'
              : '未許可'}
          </span>
        </div>

        <p className="notification-note">
          アプリを開いた時にホームへリマインダーを表示します。
          ブラウザ通知を許可すると、設定画面からテスト通知もできます。
        </p>

        <div className="notification-setting-list">
          <label className="notification-setting-item">
            <input
              type="checkbox"
              checked={notificationSettings.dailyEnabled}
              onChange={(event) => update('dailyEnabled', event.target.checked)}
            />
            <div>
              <strong>📷 毎日の思い出通知</strong>
              <span>その日にMemoriesがなければホームに表示</span>
            </div>
            <input
              type="time"
              value={notificationSettings.dailyTime}
              disabled={!notificationSettings.dailyEnabled}
              onChange={(event) => update('dailyTime', event.target.value)}
            />
          </label>

          <label className="notification-setting-item">
            <input
              type="checkbox"
              checked={notificationSettings.weightEnabled}
              onChange={(event) => update('weightEnabled', event.target.checked)}
            />
            <div>
              <strong>⚖️ 体重測定リマインド</strong>
              <span>毎週決めた曜日にホームに表示</span>
            </div>
            <select
              value={notificationSettings.weightWeekday}
              disabled={!notificationSettings.weightEnabled}
              onChange={(event) =>
                update('weightWeekday', Number(event.target.value))
              }
            >
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <option key={day} value={index}>
                  {day}曜日
                </option>
              ))}
            </select>
          </label>

          <label className="notification-setting-item">
            <input
              type="checkbox"
              checked={notificationSettings.monthlyEnabled}
              onChange={(event) => update('monthlyEnabled', event.target.checked)}
            />
            <div>
              <strong>📖 月間レポート通知</strong>
              <span>月末に月間レポートを案内</span>
            </div>
            <input
              type="time"
              value={notificationSettings.monthlyTime}
              disabled={!notificationSettings.monthlyEnabled}
              onChange={(event) => update('monthlyTime', event.target.value)}
            />
          </label>
        </div>

        <div className="notification-summary">
          <span>
            📷 毎日 {notificationSettings.dailyTime}
          </span>
          <span>
            ⚖️ 毎週{weekdayLabel(notificationSettings.weightWeekday)}曜日
          </span>
          <span>
            📖 月末 {notificationSettings.monthlyTime}
          </span>
        </div>

        <div className="button-row notification-button-row">
          <button type="button" onClick={enableBrowserNotifications}>
            🔔 ブラウザ通知を許可
          </button>
          <button type="button" className="secondary-action" onClick={testNotification}>
            通知をテストする
          </button>
        </div>
      </section>
    </>
  );
}
