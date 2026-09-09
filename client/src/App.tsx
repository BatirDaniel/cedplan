import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyCalendarPage } from './pages/MyCalendarPage';
import { NotificationsFeedPage } from './pages/NotificationsFeedPage';
import { ProjectLayout } from './pages/ProjectLayout';
import { WorkItemsPage } from './pages/project/WorkItemsPage';
import { WikiPage } from './pages/project/WikiPage';
import { TimePage } from './pages/project/TimePage';
import { MembersPage } from './pages/project/MembersPage';
import { AdministrationPage } from './pages/settings/AdministrationPage';
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { ProfilePage } from './pages/settings/ProfilePage';
import { PreferencesPage } from './pages/settings/PreferencesPage';
import { NotificationsPage } from './pages/settings/NotificationsPage';
import { WorkingHoursPage } from './pages/settings/WorkingHoursPage';
import { SecurityPasswordPage } from './pages/settings/SecurityPasswordPage';
import { SecuritySessionsPage } from './pages/settings/SecuritySessionsPage';
import { ConnectedAppsPage } from './pages/settings/ConnectedAppsPage';
import { ActivityPage } from './pages/settings/ActivityPage';
import { ExportDataPage } from './pages/settings/ExportDataPage';
import { AccountManagementPage } from './pages/settings/AccountManagementPage';
import { AvailabilityPage } from './pages/settings/AvailabilityPage';
import { CalendarPage } from './pages/settings/CalendarPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    document.title = 'CEDPlan';
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<MyCalendarPage />} />
        <Route path="notifications" element={<NotificationsFeedPage />} />
        <Route path="administration" element={<AdministrationPage />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="working-hours" element={<WorkingHoursPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="security/password" element={<SecurityPasswordPage />} />
          <Route path="security/sessions" element={<SecuritySessionsPage />} />
          <Route path="integrations/connected-apps" element={<ConnectedAppsPage />} />
          <Route path="privacy/activity" element={<ActivityPage />} />
          <Route path="privacy/export" element={<ExportDataPage />} />
          <Route path="account" element={<AccountManagementPage />} />
        </Route>
        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<WorkItemsPage />} />
          <Route path="wiki" element={<WikiPage />} />
          <Route path="time" element={<TimePage />} />
          <Route path="members" element={<MembersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
