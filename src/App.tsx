import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SipProfilesProvider } from "./hooks/useSipProfiles";
import { CallProvider } from "./hooks/useCallManager";

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/40 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {user ? (
        <>
          <Route path="/" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SipProfilesProvider>
        <CallProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CallProvider>
      </SipProfilesProvider>
    </AuthProvider>
  );
};

export default App;
