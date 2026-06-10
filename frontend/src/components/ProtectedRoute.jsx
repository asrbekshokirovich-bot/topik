import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Guards a route by authentication and (optionally) role.
 * - While the session is loading, shows a spinner.
 * - If unauthenticated, redirects to /login.
 * - If the role does not match `role`, redirects to the user's own dashboard.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    const home = user.role === 'TEACHER' ? '/teacher' : '/student';
    return <Navigate to={home} replace />;
  }

  return children;
}
