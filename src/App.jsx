import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
// Add page imports here
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PostLogin from '@/pages/PostLogin';
import Dashboard from '@/pages/Dashboard';
import ReportProblem from '@/pages/ReportProblem';
import MyProblems from '@/pages/MyProblems';
import ProblemDetails from '@/pages/ProblemDetails';
import NearbyMap from '@/pages/NearbyMap';
import Notifications from '@/pages/Notifications';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminProblems from '@/pages/AdminProblems';
import AdminMap from '@/pages/AdminMap';
import AdminUsers from '@/pages/AdminUsers';
import Analytics from '@/pages/Analytics';

const AUTH_PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password', '/post-login']);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required' && !AUTH_PUBLIC_PATHS.has(location.pathname)) {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/post-login" element={<PostLogin />} />

      {/* Citizen (authenticated) routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<ReportProblem />} />
        <Route path="/my-problems" element={<MyProblems />} />
        <Route path="/problems/:id" element={<ProblemDetails />} />
        <Route path="/nearby" element={<NearbyMap />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/problems" element={<AdminProblems />} />
        <Route path="/admin/map" element={<AdminMap />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/analytics" element={<Analytics />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App