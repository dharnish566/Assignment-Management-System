import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ProtectedRoute, RoleProtectedRoute } from './routes/ProtectedRoute.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import RoleDashboard from './pages/app/RoleDashboard.jsx';
import WorkspacePage from './pages/app/WorkspacePage.jsx';
import GroupPage from './pages/app/GroupPage.jsx';
import CreateGroupPage from './pages/app/CreateGroupPage.jsx';
import InvitationsPage from './pages/app/InvitationsPage.jsx';
import AssignmentsPage from './pages/app/AssignmentsPage.jsx';
import AssignmentFormPage from './pages/app/AssignmentFormPage.jsx';
import AssignmentDetailsPage from './pages/app/AssignmentDetailsPage.jsx';
import ProgressPage from './pages/app/ProgressPage.jsx';
import AdminSubmissionsPage from './pages/app/AdminSubmissionsPage.jsx';
import AnalyticsPage from './pages/app/AnalyticsPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';

function Landing() { const { user } = useAuth(); return <Navigate to={user ? (user.role === 'ADMIN' ? '/admin' : '/student') : '/login'} replace />; }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleProtectedRoute roles={['STUDENT']} />}>
          <Route element={<StudentLayout />}>
            <Route path="/student" element={<RoleDashboard role="STUDENT" />} />
            <Route path="/student/group" element={<GroupPage />} />
            <Route path="/student/group/create" element={<CreateGroupPage />} />
            <Route path="/student/invitations" element={<InvitationsPage />} />
            <Route path="/student/assignments" element={<AssignmentsPage role="STUDENT" />} />
            <Route path="/student/assignments/:id" element={<AssignmentDetailsPage />} />
            <Route path="/student/progress" element={<ProgressPage />} />
            <Route path="/student/profile" element={<WorkspacePage type="profile" />} />
          </Route>
        </Route>
        <Route element={<RoleProtectedRoute roles={['ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<RoleDashboard role="ADMIN" />} />
            <Route path="/admin/assignments" element={<AssignmentsPage role="ADMIN" />} />
            <Route path="/admin/assignments/new" element={<AssignmentFormPage />} />
            <Route path="/admin/assignments/:id" element={<AssignmentDetailsPage />} />
            <Route path="/admin/assignments/:id/edit" element={<AssignmentFormPage />} />
            <Route path="/admin/tracker" element={<AdminSubmissionsPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/profile" element={<WorkspacePage type="profile" />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
