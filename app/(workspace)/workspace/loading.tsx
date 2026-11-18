export default function WorkspaceLoading() {
  return (
    <div className="page-stack workspace-loading" aria-label="Loading workspace" aria-busy="true">
      <div>
        <div className="loading-placeholder loading-copy" />
        <div className="loading-placeholder loading-heading" style={{ marginTop: 12 }} />
      </div>
      <div className="loading-metrics" aria-hidden="true">
        <div className="loading-placeholder loading-metric" />
        <div className="loading-placeholder loading-metric" />
        <div className="loading-placeholder loading-metric" />
      </div>
      <div className="loading-placeholder loading-panel" aria-hidden="true" />
    </div>
  );
}
