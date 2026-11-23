import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute() { 
    const { isAuthenticated } = useAuth(); 
    const location = useLocation(); 
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />; }


    export function RoleProtectedRoute({ roles }) { 
    const { user } = useAuth(); 
    if (!roles.includes(user?.role)) 
        return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/student'} replace />;
    return <Outlet />; }
