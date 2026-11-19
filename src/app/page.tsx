import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Droplets, ShieldCheck, Wrench } from "lucide-react";

const steps = [
  { icon: ClipboardList, title: "Report the fault", description: "Share what has broken, where it happened and how the community is affected." },
  { icon: Wrench, title: "Coordinate the repair", description: "Operators assign technicians and follow progress through a shared workflow." },
  { icon: CheckCircle2, title: "Confirm water is back", description: "Record repair completion, then verify that the water point is working again." },
];

export default function HomePage() {
  return (
    <div className="public-home">
      <section className="home-hero">
        <div className="home-copy">
          <div className="eyebrow home-eyebrow"><span className="eyebrow-dot"/> Community water service coordination</div>
          <h1>When water points break, every hour matters.</h1>
          <p className="home-lead">MajiFix connects communities, water operators and technicians in one clear process to report faults, coordinate repairs and confirm when water service returns.</p>
          <div className="home-actions">
            <Link className="btn btn-primary home-primary" href="/register">Create an account <ArrowRight size={16}/></Link>
            <Link className="btn btn-secondary home-secondary" href="/login">Sign in</Link>
          </div>
          <div className="home-trust"><ShieldCheck size={16}/><span>Role-based access · Repair tracking · Restoration confirmation</span></div>
        </div>
        <div className="home-visual" aria-label="Illustration of the MajiFix repair workflow">
          <div className="visual-topline"><span className="visual-live-dot"/> REPAIR WORKFLOW</div>
          <div className="visual-watermark"><Droplets size={88} strokeWidth={1.1}/></div>
          <div className="visual-card visual-card-main">
            <div className="visual-card-header"><span className="visual-icon"><Droplets size={18}/></span><span className="pill pill-critical">HIGH PRIORITY</span></div>
            <span className="visual-label">WATER POINT REPORT</span>
            <strong>Community borehole</strong>
            <span className="visual-location">Sample location · Kenya</span>
            <div className="visual-progress"><span/></div>
            <div className="visual-progress-caption"><span>Repair coordination</span><strong>In progress</strong></div>
          </div>
          <div className="visual-status visual-status-one"><span className="visual-status-check"><CheckCircle2 size={15}/></span><span><strong>Fault recorded</strong><small>Reference created</small></span></div>
          <div className="visual-status visual-status-two"><span className="visual-status-check"><Wrench size={15}/></span><span><strong>Technician assigned</strong><small>Work can be tracked</small></span></div>
          <div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/>
        </div>
      </section>

      <section className="home-process">
        <div className="home-section-heading"><div className="eyebrow">One connected process</div><h2>From the first report to restored service.</h2><p className="muted">Every role sees the information and next steps relevant to their work.</p></div>
        <div className="home-step-grid">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <article className="home-step" key={title}><div className="home-step-number">0{index + 1}</div><div className="home-step-icon"><Icon size={21}/></div><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>
      <section className="home-bottom-cta"><div><div className="eyebrow">Start with MajiFix</div><h2>Make every repair easier to follow.</h2><p>Bring fault reports, repair updates and service confirmation into one workspace.</p></div><Link href="/register" className="btn btn-primary">Get started <ArrowRight size={16}/></Link></section>
      <p className="home-demo-note">Demonstration screens may contain sample records. Do not enter sensitive personal information in a public demo.</p>
    </div>
  );
}
