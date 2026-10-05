import { Route, Routes } from 'react-router-dom';
import AppLayout from './pages/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ScheduleDetailPage from './pages/ScheduleDetailPage.jsx';
import SchedulesPage from './pages/SchedulesPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
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
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="schedules/:scheduleId" element={<ScheduleDetailPage />} />
            <Route path="bookings" element={<MyBookingsPage />} />
            <Route path="guide" element={<UserGuidePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
