import { Navigate } from 'react-router-dom';
import LoadingState from './LoadingState.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

function ProtectedRoute({ children }) {
  const { session, ready, messageKey } = useAuth();
  const { t } = useLanguage();

  if (!ready) return <LoadingState message={t('common.restoringSession')} />;
  if (!session) return <Navigate to="/login" replace state={{ authMessage: messageKey || 'auth.required' }} />;
  return children;
}

export default ProtectedRoute;
