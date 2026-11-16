import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { setUserRoleAction } from "@/lib/actions";

const errorMessages: Record<string, string> = {
  "invalid-access-change": "Check the selected role, account status and suspension reason.",
  "user-not-found": "The selected account could not be found.",
  "email-not-verified": "Verify the user's email address before activating the account.",
  "technician-has-active-assignments": "This technician has active repair assignments. Reassign or close them before changing the role.",
  "last-active-admin": "You cannot deactivate or demote the last active administrator. Activate another administrator first.",
  "invalid-technician-profile": "Technician skills and service areas must each contain no more than the allowed number of entries, with each entry 80 characters or fewer.",
};

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { user: currentAdmin } = await requireUser(["ADMIN"]);
  const query = await searchParams;
  const users = await prisma.user.findMany({
    include: { technicianProfile: true },
    orderBy: [{ accountStatus: "asc" }, { createdAt: "desc" }],
  });

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Administration</div>
        <h1>Team access</h1>
        <p className="muted" style={{ margin: 0 }}>Approve accounts, manage roles and suspend access when required.</p>
      </div>
    </div>
    {query.error && <div className="notice error">{errorMessages[query.error] ?? "The access change could not be completed."}</div>}
    {query.updated && <div className="notice">Account access updated. Existing sessions were revoked so the new permissions take effect immediately.</div>}
    <div className="notice">New registrations remain pending until an administrator activates them. Only grant administrator access to trusted people. At least one active administrator must remain.</div>
    <div className="grid">
      {users.map((user) => <section className="card" key={user.id}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <strong>{user.name}</strong>
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{user.email}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 5 }}>Registered {user.createdAt.toLocaleDateString("en-KE")} · Email {user.emailVerified ? "verified" : "not verified"}</div>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
            <span className="pill">{user.role}</span>
            <span className={`pill ${user.accountStatus === "ACTIVE" ? "pill-restored" : user.accountStatus === "SUSPENDED" ? "pill-critical" : ""}`}>{user.accountStatus}</span>
          </div>
        </div>
        {user.suspensionReason && <p className="muted" style={{ fontSize: 12 }}>Suspension reason: {user.suspensionReason}</p>}
        {user.id === currentAdmin.id ? <div className="notice" style={{ marginBottom: 0 }}>This is your current administrator account. Use a separate verified administrator account to change its access.</div> : <form action={setUserRoleAction} className="form-grid">
          <input type="hidden" name="userId" value={user.id}/>
          <div className="field">
            <label htmlFor={`role-${user.id}`}>Account role</label>
            <select id={`role-${user.id}`} name="role" defaultValue={user.role}>
              <option value="COMMUNITY">Community</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="OPERATOR">Operator</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`status-${user.id}`}>Account status</label>
            <select id={`status-${user.id}`} name="accountStatus" defaultValue={user.accountStatus}>
              <option value="PENDING">Pending approval</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor={`reason-${user.id}`}>Suspension reason (required when suspending)</label>
            <input id={`reason-${user.id}`} name="suspensionReason" defaultValue={user.suspensionReason ?? ""} maxLength={500} placeholder="Explain why this account is being suspended" />
          </div>
          <div className="field">
            <label htmlFor={`skills-${user.id}`}>Technician skills</label>
            <input id={`skills-${user.id}`} name="skills" defaultValue={user.technicianProfile?.skills.join(", ") ?? ""} placeholder="Pump repair, electrical" />
          </div>
          <div className="field">
            <label htmlFor={`areas-${user.id}`}>Technician service areas</label>
            <input id={`areas-${user.id}`} name="serviceAreas" defaultValue={user.technicianProfile?.serviceAreas.join(", ") ?? ""} placeholder="Kitui, Mwingi or ALL" />
          </div>
          <div className="field full">
            <label className="checkbox"><input type="checkbox" name="available" defaultChecked={user.technicianProfile?.available ?? true}/> Available for repair assignments</label>
          </div>
          <div className="field full" style={{ alignItems: "flex-end" }}>
            <button className="btn btn-secondary">Save access changes</button>
          </div>
        </form>}
      </section>)}
    </div>
  </>;
}
