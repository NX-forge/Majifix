import Link from "next/link";
import { WaterPointStatus, WaterPointType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { waterPointVisibilityWhere } from "@/lib/water-point-policy";

const PAGE_SIZE = 10;
const validTypes = new Set(Object.values(WaterPointType));
const validStatuses = new Set(Object.values(WaterPointStatus));

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}

export default async function WaterPointsPage({ searchParams }: { searchParams: Promise<{ q?: string; county?: string; type?: string; status?: string; page?: string; error?: string }> }) {
  const { user } = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const county = (params.county ?? "").trim().slice(0, 80);
  const type = validTypes.has(params.type as WaterPointType) ? params.type as WaterPointType : undefined;
  const status = validStatuses.has(params.status as WaterPointStatus) ? params.status as WaterPointStatus : undefined;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const visibility = waterPointVisibilityWhere({ role: user.role, userId: user.id });
  const where = {
    ...visibility,
    ...(county ? { county: { equals: county, mode: "insensitive" as const } } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(q ? { OR: [
      { code: { contains: q, mode: "insensitive" as const } },
      { name: { contains: q, mode: "insensitive" as const } },
      { county: { contains: q, mode: "insensitive" as const } },
      { subCounty: { contains: q, mode: "insensitive" as const } },
      { community: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };

  const [total, operational, nonOperational, counties, visibleTotal] = await Promise.all([
    prisma.waterPoint.count({ where }),
    prisma.waterPoint.count({ where: { ...visibility, status: "OPERATIONAL" } }),
    prisma.waterPoint.count({ where: { ...visibility, status: "NON_OPERATIONAL" } }),
    prisma.waterPoint.findMany({ where: visibility, distinct: ["county"], select: { county: true }, orderBy: { county: "asc" } }),
    prisma.waterPoint.count({ where: visibility }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const points = await prisma.waterPoint.findMany({
    where,
    orderBy: [{ county: "asc" }, { name: "asc" }],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { faults: user.role === "COMMUNITY" ? { where: { reporterId: user.id } } : true } } },
  });
  const canManage = user.role === "ADMIN" || user.role === "OPERATOR";
  const filters = { q, county, type: type ?? "", status: status ?? "" };
  const errorMessage = params.error === "forbidden" ? "You do not have permission to manage that water point." : params.error === "not-found" ? "The water point could not be found in your assigned registry." : undefined;

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Registry</div><h1>Water points</h1><p className="muted" style={{ margin: 0 }}>Browse and manage registered community water infrastructure.</p></div>
      {canManage && <Link href="/water-points/new" className="btn btn-primary">Add water point</Link>}
    </div>
    {errorMessage && <div className="notice error" role="alert">{errorMessage}</div>}
    <div className="grid stats">
      <div className="card"><div className="stat-label">Registered water points</div><div className="stat-value">{visibleTotal.toLocaleString("en-KE")}</div><div className="stat-foot">Within your registry access</div></div>
      <div className="card"><div className="stat-label">Operational</div><div className="stat-value">{operational.toLocaleString("en-KE")}</div><div className="stat-foot">Currently recorded as operational</div></div>
      <div className="card"><div className="stat-label">Non-operational</div><div className="stat-value">{nonOperational.toLocaleString("en-KE")}</div><div className="stat-foot">Requires attention</div></div>
      <div className="card"><div className="stat-label">Matching records</div><div className="stat-value">{total.toLocaleString("en-KE")}</div><div className="stat-foot">For the selected filters</div></div>
    </div>
    <form method="get" className="card" style={{ marginBottom: 18 }}>
      <div className="form-grid">
        <div className="field"><label htmlFor="q">Search registry</label><input id="q" name="q" defaultValue={q} placeholder="Name, code, county or community" maxLength={100} /></div>
        <div className="field"><label htmlFor="county">County</label><select id="county" name="county" defaultValue={county}><option value="">All counties</option>{counties.map((item) => <option key={item.county} value={item.county}>{item.county}</option>)}</select></div>
        <div className="field"><label htmlFor="type">Infrastructure type</label><select id="type" name="type" defaultValue={type ?? ""}><option value="">All types</option>{Object.values(WaterPointType).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
        <div className="field"><label htmlFor="status">Operational status</label><select id="status" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{Object.values(WaterPointStatus).map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}><Link href="/water-points" className="btn btn-secondary">Clear filters</Link><button className="btn btn-primary" type="submit">Apply filters</button></div>
    </form>
    <div className="card">
      {points.length === 0 ? <div className="empty">No water points match these filters. {canManage ? "Register a water point or clear the filters." : "Try changing your search."}</div> : <>
        <div className="table-wrap"><table><thead><tr><th>Code / Name</th><th>Location</th><th>Type</th><th>People served</th><th>Status</th><th>Reports</th><th> </th></tr></thead><tbody>
          {points.map((point) => <tr key={point.id}>
            <td><Link href={`/water-points/${point.id}`} style={{ fontWeight: 800, color: "var(--blue)" }}>{point.name}</Link><div className="muted" style={{ fontSize: 11 }}>{point.code}</div></td>
            <td>{point.community || point.subCounty || point.county}<div className="muted" style={{ fontSize: 11 }}>{point.county}</div></td>
            <td>{point.type.replaceAll("_", " ")}</td><td>{point.peopleServed.toLocaleString("en-KE")}</td>
            <td><span className={`pill ${point.status === "OPERATIONAL" ? "pill-restored" : point.status === "NON_OPERATIONAL" ? "pill-critical" : ""}`}>{point.status.replaceAll("_", " ")}</span></td>
            <td>{point._count.faults}</td><td><Link className="btn btn-secondary" href={`/water-points/${point.id}`}>View</Link></td>
          </tr>)}
        </tbody></table></div>
        <div className="pagination"><span className="muted">Page {currentPage} of {totalPages} · {total} records</span><div style={{ display: "flex", gap: 8 }}>
          {currentPage > 1 && <Link className="btn btn-secondary" href={`/water-points?${queryString({ ...filters, page: currentPage - 1 })}`}>Previous</Link>}
          {currentPage < totalPages && <Link className="btn btn-secondary" href={`/water-points?${queryString({ ...filters, page: currentPage + 1 })}`}>Next</Link>}
        </div></div>
      </>}
    </div>
  </>;
}
