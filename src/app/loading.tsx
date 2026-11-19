export default function LoadingPage() {
  return (
    <div className="loading-page" role="status" aria-live="polite" aria-label="Loading MajiFix workspace">
      <span className="loading-mark" aria-hidden="true" />
      <div className="loading-copy"><strong>Preparing your workspace</strong><span>Loading the latest water service information…</span></div>
      <div className="loading-skeleton-grid" aria-hidden="true"><span/><span/><span/><span/></div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
