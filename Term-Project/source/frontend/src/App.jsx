import { Route, Routes } from 'react-router-dom';
import AppLayout from './pages/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import NewRequestPage from './pages/NewRequestPage.jsx';
import MyRequestsPage from './pages/MyRequestsPage.jsx';
import RequestDetailPage from './pages/RequestDetailPage.jsx';
import AdminRequestsPage from './pages/AdminRequestsPage.jsx';
import UserGuidePage from './pages/UserGuidePage.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="requests/new" element={<NewRequestPage />} />
            <Route path="requests" element={<MyRequestsPage />} />
            <Route path="requests/:requestId" element={<RequestDetailPage />} />
            <Route path="admin/requests" element={<AdminRequestsPage />} />
            <Route path="guide" element={<UserGuidePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}
export default App;
