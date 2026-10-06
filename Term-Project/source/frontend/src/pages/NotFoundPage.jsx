import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="state-card" data-testid="page-not-found">
      <p className="eyebrow dark">404 · ROUTE NOT FOUND</p><h1>Page not found</h1><p>This shuttle page does not exist.</p><Link className="button primary inline" to="/">Back to dashboard</Link>
    </section>
  );
}

export default NotFoundPage;
