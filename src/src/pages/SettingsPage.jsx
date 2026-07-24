export default function SettingsPage({ email, count }) {
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">SETTINGS</p>
        <h2>設定</h2>
      </section>

      <section className="card settings-list">
        <div><strong>ログイン中</strong><span>{email}</span></div>
        <div><strong>保存済み記録</strong><span>{count}件</span></div>
        <div><strong>家族共有</strong><span>次の更新で追加予定</span></div>
      </section>
    </>
  );
}
