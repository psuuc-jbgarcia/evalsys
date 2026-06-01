import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sections from './pages/admin/Sections';
import Groups from './pages/admin/Groups';
import Users from './pages/admin/Users';
import Results from './pages/admin/Results';
import Rubrics from './pages/admin/Rubrics';
import AssignPanels from './pages/admin/AssignPanels';
import RegistrationLinks from './pages/admin/RegistrationLinks';
import Subjects from './pages/admin/Subjects';
import Subscription from './pages/admin/Subscription';
import Grade from './pages/panel/Grade';
import RegisterGroup from './pages/RegisterGroup';
import Landing from './pages/Landing';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterGroup />} />
          <Route path="/register/:token" element={<RegisterGroup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/sections" element={<ProtectedRoute role="admin"><Sections /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute role="admin"><Subjects /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute role="admin"><Subscription /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute role="admin"><Groups /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute role="admin"><Users /></ProtectedRoute>} />
          <Route path="/assign-panels" element={<ProtectedRoute role="admin"><AssignPanels /></ProtectedRoute>} />
          <Route path="/registration-links" element={<ProtectedRoute role="admin"><RegistrationLinks /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute role="admin"><Results /></ProtectedRoute>} />
          <Route path="/rubrics" element={<ProtectedRoute role="admin"><Rubrics /></ProtectedRoute>} />

          {/* Panel routes */}
          <Route path="/grade" element={<ProtectedRoute role="panel"><Grade /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
