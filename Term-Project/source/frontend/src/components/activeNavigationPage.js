import { matchPath } from 'react-router-dom';

export function getActiveNavigationPage(pathname) {
  const path = String(pathname ?? '/').replace(/\/+$/, '') || '/';
  if (path === '/') return 'nav.home';
  if (path === '/requests/new') return 'nav.newRequest';
  if (path === '/requests' || matchPath({ path: '/requests/:requestId', end: true }, path)) return 'nav.myRequests';
  if (path === '/admin/requests' || matchPath({ path: '/admin/requests/:requestId', end: true }, path)) return 'nav.admin';
  if (path === '/guide') return 'nav.guide';
  return null;
}
