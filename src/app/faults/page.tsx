import Link from "next/link";
import { FaultCategory, FaultStatus, PriorityLevel } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-guard";
import { faultVisibilityWhere } from "@/lib/fault-access";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
const priorityOptions = Object.values(PriorityLevel) as PriorityLevel[];
const statusOptions = Object.values(FaultStatus) as FaultStatus[];
const categoryOptions = Object.values(FaultCategory) as FaultCategory[];
const validPriorities = new Set<string>(priorityOptions);
const validStatuses = new Set<string>(statusOptions);
const validCategories = new Set<string>(categoryOptions);

function buildQuery(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") query.set(key, String(value));
  return query.toString();
}

export default async function FaultsPage({ searchParams }: { searchParams: Promise<{ q?: string; priority?: string; status?: string; category?: string; page?: string; error?: string }> }) {
  const { user } = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const priority = validPriorities.has(params.priority ?? "") ? params.priority as PriorityLevel : undefined;
  const status = validStatuses.has(params.status ?? "") ? params.status as FaultStatus : undefined;
  const category = validCategories.has(params.category ?? "") ? params.category as FaultCategory : undefined;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const visibility = faultVisibilityWhere(user);
  const where = {
    ...visibility,
    ...(priority ? { priority } : {}),
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(q ? { OR: [
      { reference: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { waterPoint: { is: { name: { contains: q, mode: "insensitive" as const } } } },
      { waterPoint: { is: { code: { contains: q, mode: "insensitive" as const } } } },
      { waterPoint: { is: { county: { contains: q, mode: "insensitive" as const } } } },
    ] } : {}),
  };

  const [total, criticalCount, activeCount] = await Promise.all([
    prisma.faultReport.count({ where }),
    prisma.faultReport.count({ where: { ...visibility, priority: "CRITICAL", status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } }),
    prisma.faultReport.count({ where: { ...visibility, status: { notIn: ["RESTORED", "REJECTED", "CANCELLED"] } } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const faults = await prisma.faultReport.findMany({
    where,
    include: { waterPoint: { select: { id: true, name: true, code: true, county: true } }, reporter: { select: { name: true } } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const filters = { q, priority: priority ?? "", status: status ?? "", category: category ?? "" };

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Fault management</div><h1>Fault reports</h1><p className="muted" style={{ margin: 0 }}>Review reported breakdowns and track each case through restoration.</p></div>
      {user.role !== "TECHNICIAN" && <Link href="/faults/new" className="btn btn-primary">Report a fault</Link>}
    </div>
    {params.error === "not-found" && <div className="notice error" role="alert">That report is not available in your assigned access.</div>}
    <div className="grid stats">
      <div className="card"><div className="stat-label">Matching reports</div><div className="stat-value">{total.toLocaleString("en-KE")}</div><div className="stat-foot">For the selected filters</div></div>
      <div className="card"><div className="stat-label">Active reports</div><div className="stat-value">{activeCount.toLocaleString("en-KE")}</div><div className="stat-foot">Not yet closed</div></div>
      <div className="card"><div className="stat-label">Critical active</div><div className="stat-value">{criticalCount.toLocaleString("en-KE")}</div><div className="stat-foot">Require prompt review</div></div>
    </div>
    <form method="get" className="card" style={{ marginBottom: 18 }}>
      <div className="form-grid">
        <div className="field"><label htmlFor="q">Search reports</label><input id="q" name="q" defaultValue={q} maxLength={100} placeholder="Reference, water point or description" /></div>
        <div className="field"><label htmlFor="priority">Priority</label><select id="priority" name="priority" defaultValue={priority ?? ""}><option value="">All priorities</option>{priorityOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{statusOptions.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
        <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={category ?? ""}><option value="">All categories</option>{categoryOptions.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}><Link href="/faults" className="btn btn-secondary">Clear filters</Link><button className="btn btn-primary" type="submit">Apply filters</button></div>
    </form>
    <div className="card">
      {faults.length === 0 ? <div className="empty">No fault reports match these filters.</div> : <>
        <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Water point</th><th>Reported by</th><th>Priority</th><th>Status</th><th>Reported</th></tr></thead><tbody>
          {faults.map((fault) => <tr key={fault.id}>
            <td><Link href={`/faults/${fault.id}`} style={{ fontWeight: 800, color: "var(--blue)" }}>{fault.reference}</Link></td>
            <td><Link href={`/water-points/${fault.waterPoint.id}`}>{fault.waterPoint.name}</Link><div className="muted" style={{ fontSize: 11 }}>{fault.waterPoint.county} · {fault.waterPoint.code}</div></td>
            <td>{fault.reporter.name}</td>
            <td><span className={`pill pill-${fault.priority.toLowerCase()}`}>{fault.priority}</span></td>
            <td><span className="pill">{fault.status.replaceAll("_", " ")}</span></td>
            <td>{fault.createdAt.toLocaleDateString("en-KE")}</td>
          </tr>)}
        </tbody></table></div>
        <div className="pagination"><span className="muted">Page {currentPage} of {totalPages} · {total} reports</span><div style={{ display: "flex", gap: 8 }}>
          {currentPage > 1 && <Link className="btn btn-secondary" href={`/faults?${buildQuery({ ...filters, page: currentPage - 1 })}`}>Previous</Link>}
          {currentPage < totalPages && <Link className="btn btn-secondary" href={`/faults?${buildQuery({ ...filters, page: currentPage + 1 })}`}>Next</Link>}
        </div></div>
      </>}
    </div>
  </>;
}
