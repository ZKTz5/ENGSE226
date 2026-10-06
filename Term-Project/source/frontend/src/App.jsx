import { Route, Routes } from 'react-router-dom';
import AppLayout from './pages/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import NewRequestPage from './pages/NewRequestPage.jsx';
import MyRequestsPage from './pages/MyRequestsPage.jsx';
import RequestDetailPage from './pages/RequestDetailPage.jsx';
import AdminRequestsPage from './pages/AdminRequestsPage.jsx';
import AdminRequestDetailPage from './pages/AdminRequestDetailPage.jsx';
import UserGuidePage from './pages/UserGuidePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
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
            <Route path="requests/new" element={<ProtectedRoute><NewRequestPage /></ProtectedRoute>} />
            <Route path="requests" element={<ProtectedRoute><MyRequestsPage /></ProtectedRoute>} />
            <Route path="requests/:requestId" element={<ProtectedRoute><RequestDetailPage /></ProtectedRoute>} />
            <Route path="admin/requests" element={<ProtectedRoute><AdminRequestsPage /></ProtectedRoute>} />
            <Route path="admin/requests/:requestId" element={<ProtectedRoute><AdminRequestDetailPage /></ProtectedRoute>} />
            <Route path="guide" element={<UserGuidePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}
export default App;
