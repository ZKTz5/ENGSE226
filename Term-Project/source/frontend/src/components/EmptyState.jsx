function EmptyState({ title = 'No shuttles found', message = 'Try changing your search filters.', action }) {
  return (
    <section className="state-card empty-state" data-testid="empty-state">
      <span className="empty-icon" aria-hidden="true">↗</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  );
}

export default EmptyState;
