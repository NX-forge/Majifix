export const metadata = { title: "Privacy and data handling" };

export default function PrivacyPage() {
  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">MajiFix · Privacy</div>
        <h1>Privacy and data handling</h1>
        <p className="muted" style={{ margin: 0 }}>How account, water-point and repair information is used and retained.</p>
      </div>
    </div>
    <div className="grid" style={{ gap: 16 }}>
      <section className="card">
        <h2>Information recorded</h2>
        <p className="muted">MajiFix stores account details, contact information supplied by users, water-point records, fault descriptions, repair updates, evidence files, notifications, session records and security audit events.</p>
      </section>
      <section className="card">
        <h2>Why information is used</h2>
        <p className="muted">Information supports account access, fault triage, repair coordination, restoration confirmation, service reporting, security monitoring and communication about a user's repair reports or assignments.</p>
      </section>
      <section className="card">
        <h2>Access and protection</h2>
        <p className="muted">Access is restricted by account role and record ownership. Evidence downloads are private. Important workflow changes are recorded in audit logs. Production operators must use HTTPS, restrict database access and protect backups and application secrets.</p>
      </section>
      <section className="card">
        <h2>Retention schedule</h2>
        <ul className="muted" style={{ lineHeight: 1.8, paddingLeft: 20 }}>
          <li>In-app and email notification records: 365 days by default.</li>
          <li>Expired authentication sessions: 30 days after expiry.</li>
          <li>Expired verification tokens: 30 days after expiry.</li>
          <li>Rate-limit counters: 7 days after their last request.</li>
          <li>Fault, repair, evidence and audit records are not automatically purged by the maintenance job. Their retention must be set by the data controller under an approved retention schedule.</li>
        </ul>
        <p className="muted">Retention periods can be configured by the deployment operator. The maintenance command reports eligible records before deletion and requires an explicit execution flag. Production deletion also requires a separate confirmation environment variable.</p>
      </section>
      <section className="card">
        <h2>Requests about your information</h2>
        <p className="muted">For a request to access, correct or delete personal information, contact the MajiFix administrator responsible for your account. Requests must be reviewed against account security, active repair workflows, audit requirements and applicable data-protection obligations before action is taken.</p>
      </section>
      <div className="notice">This page describes the application's current data handling. The organisation operating MajiFix must identify its data controller, publish official contact details, document its lawful basis and review this notice with qualified privacy counsel before collecting real community data.</div>
    </div>
  </>;
}
