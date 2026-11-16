import { requireUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";

export default async function AnalyticsPage(){
 const {user}=await requireUser();
 const where=user.role==="COMMUNITY"?{reporterId:user.id}:user.role==="TECHNICIAN"?{repairJob:{technicianId:user.id}}:{};
 const [all,restored,open,critical,categoryGroups,priorityGroups,completedJobs]=await Promise.all([
  prisma.faultReport.count({where}),
  prisma.faultReport.count({where:{...where,status:"RESTORED"}}),
  prisma.faultReport.count({where:{...where,status:{notIn:["RESTORED","REJECTED","CANCELLED"]}}}),
  prisma.faultReport.count({where:{...where,priority:"CRITICAL",status:{notIn:["RESTORED","REJECTED","CANCELLED"]}}}),
  prisma.faultReport.groupBy({by:["category"],where,_count:{_all:true},orderBy:{_count:{category:"desc"}}}),
  prisma.faultReport.groupBy({by:["priority"],where,_count:{_all:true}}),
  prisma.repairJob.findMany({where:{faultReport:where,restoredAt:{not:null},startedAt:{not:null}},select:{startedAt:true,restoredAt:true}}),
 ]);
 const avgHours=completedJobs.length?completedJobs.reduce((sum,j)=>sum+(j.restoredAt!.getTime()-j.startedAt!.getTime())/3600000,0)/completedJobs.length:0;
 const maxCategory=Math.max(1,...categoryGroups.map(g=>g._count._all));
 return <><div className="page-head"><div><div className="eyebrow">Service performance</div><h1>Analytics</h1><p className="muted" style={{margin:0}}>A view of reported faults and verified restoration activity.</p></div></div><div className="grid stats">{[{label:"Total reports",value:all,foot:"Reports in your access scope"},{label:"Open reports",value:open,foot:"Not yet closed or restored"},{label:"Restoration rate",value:all?`${Math.round(restored/all*100)}%`:"—",foot:"Confirmed restored / all reports"},{label:"Average repair time",value:completedJobs.length?formatDuration(Math.round(avgHours)):"—",foot:"From work start to restoration confirmation"}].map(s=><div className="card" key={s.label}><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div><div className="stat-foot">{s.foot}</div></div>)}</div><div className="split"><section className="card"><h2>Reports by fault category</h2>{categoryGroups.length===0?<div className="empty">No report data yet.</div>:categoryGroups.map(g=><div key={g.category} style={{marginBottom:17}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:7}}><span>{g.category.replaceAll("_"," ")}</span><strong>{g._count._all}</strong></div><div style={{height:9,background:"#edf2f7",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:`${g._count._all/maxCategory*100}%`,background:"#087e8b",borderRadius:20}}/></div></div>)}</section><section className="card"><h2>Priority distribution</h2>{priorityGroups.length===0?<div className="empty">No priority data yet.</div>:priorityGroups.map(g=><div key={g.priority} style={{display:"flex",justifyContent:"space-between",padding:"13px 0",borderBottom:"1px solid #edf2f7"}}><span className={`pill pill-${g.priority.toLowerCase()}`}>{g.priority}</span><strong>{g._count._all}</strong></div>)}<div className="notice" style={{marginTop:18,marginBottom:0}}>Critical open reports: {critical}. Priorities are triage indicators, not verified measures of impact.</div></section></div><p className="muted" style={{fontSize:12,marginTop:18}}>Metrics are calculated from recorded platform activity. They do not represent independently verified field outcomes unless a pilot has validated the records.</p></>;
}
