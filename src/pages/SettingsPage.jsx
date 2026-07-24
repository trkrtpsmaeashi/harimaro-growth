import { useState } from 'react';
import {
  createInviteCode,
  joinHousehold,
  updateDisplayName,
  loadHouseholdMembers,
} from '../lib/household';
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
  household,
  onHouseholdChanged,
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState(
    household?.my_display_name || ''
  );
  const [householdMessage, setHouseholdMessage] = useState('');
  const [members, setMembers] = useState([]);
  const permission =
    canShowBrowserNotifications() ? Notification.permission : 'unsupported';

  function update(key, value) {
    onChangeNotificationSettings({
      ...notificationSettings,
      [key]: value,
    });
  }


  async function refreshMembers() {
    try {
      const result = await loadHouseholdMembers();
      setMembers(result);
    } catch (error) {
      setHouseholdMessage(error.message);
    }
  }

  function shareInviteOnLine() {
    if (!inviteCode) {
      setHouseholdMessage('先に招待コードを発行してね。');
      return;
    }

    const appUrl = window.location.origin;
    const shareText = [
      '🦔 Harimaro Memoriesの共有グループに招待されました。',
      '',
      `招待コード：${inviteCode}`,
      `アプリURL：${appUrl}`,
      '',
      '1. URLを開いて新規登録またはログイン',
      '2. 設定 → 共有グループ',
      '3. 招待コードを入力して「参加する」',
      '',
      '※招待コードは24時間有効です。',
    ].join('\n');

    const lineUrl =
      `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;

    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  }

  async function generateInvite() {
    setHouseholdMessage('招待コードを作成中…');

    try {
      const result = await createInviteCode();
      setInviteCode(result.invite_code);
      setHouseholdMessage('このコードを共有したいメンバーへ送ってください。');
    } catch (error) {
      setHouseholdMessage(error.message);
    }
  }

  async function joinSharedHousehold() {
    if (!joinCode.trim()) {
      setHouseholdMessage('招待コードを入力してね。');
      return;
    }

    if (!confirm('現在の自分用データから、招待された共有グループへ切り替える？')) {
      return;
    }

    setHouseholdMessage('共有グループへ参加中…');

    try {
      await joinHousehold(joinCode);
      setJoinCode('');
      setHouseholdMessage('共有グループへ参加しました。');
      await onHouseholdChanged();
      await refreshMembers();
    } catch (error) {
      setHouseholdMessage(error.message);
    }
  }

  async function saveDisplayName() {
    if (!displayName.trim()) {
      setHouseholdMessage('表示名を入力してね。');
      return;
    }

    try {
      await updateDisplayName(displayName);
      setHouseholdMessage('表示名を保存しました。');
      await onHouseholdChanged();
      await refreshMembers();
    } catch (error) {
      setHouseholdMessage(error.message);
    }
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


      <section className="card household-settings-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SHARED HOME</p>
            <h2>共有グループ</h2>
          </div>
          <span className="member-count-pill">
            👥 {household?.member_count || 1}人
          </span>
        </div>

        <p className="notification-note">
          招待コードを使うと、家族やパートナーなどのメンバーと同じ体重記録・Memories・イベントを共同で見たり追加したりできます。
        </p>

        <div className="household-name-box">
          <span>共有グループ</span>
          <strong>{household?.household_name || '共有グループ'}</strong>
          <small>
            あなたの役割：{household?.my_role === 'owner' ? 'オーナー' : 'メンバー'}
          </small>
        </div>

        <div className="household-form-row">
          <div>
            <label>あなたの表示名</label>
            <input
              value={displayName}
              placeholder="紗希"
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <button type="button" onClick={saveDisplayName}>
            表示名を保存
          </button>
        </div>

        {household?.my_role === 'owner' && (
          <div className="invite-box">
            <div>
              <h3>メンバーを招待</h3>
              <p>招待コードは24時間だけ有効です。</p>
            </div>

            <button type="button" onClick={generateInvite}>
              招待コードを発行
            </button>

            {inviteCode && (
              <div className="invite-code-display invite-code-display-v202">
                <span>招待コード</span>
                <strong>{inviteCode}</strong>

                <div className="invite-share-actions">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(inviteCode)}
                  >
                    コピー
                  </button>

                  <button
                    type="button"
                    className="line-share-button"
                    onClick={shareInviteOnLine}
                  >
                    LINEで共有
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        <div className="household-members-box">
          <div className="household-members-heading">
            <h3>参加メンバー</h3>
            <button type="button" onClick={refreshMembers}>
              メンバーを表示
            </button>
          </div>

          {members.length > 0 ? (
            <div className="household-member-list">
              {members.map((member) => (
                <div key={member.user_id} className="household-member-item">
                  <span>👤</span>
                  <div>
                    <strong>{member.display_name || '名前未設定'}</strong>
                    <small>
                      {member.role === 'owner' ? 'オーナー' : 'メンバー'}
                    </small>
                  </div>
                  {member.is_me && <em>あなた</em>}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              「メンバーを表示」を押すと参加者を確認できます。
            </p>
          )}
        </div>
        <div className="join-box">
          <h3>招待されたグループへ参加</h3>
          <p>
            招待されたメンバーのアカウントで、受け取った6文字コードを入力します。
          </p>

          <div className="join-code-row">
            <input
              value={joinCode}
              maxLength={6}
              placeholder="ABC123"
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase())
              }
            />
            <button type="button" onClick={joinSharedHousehold}>
              参加する
            </button>
          </div>
        </div>

        <p className="message">{householdMessage}</p>
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
