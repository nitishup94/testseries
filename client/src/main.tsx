import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminHomePage } from './features/admin/AdminHomePage';
import { AdminLoginPage } from './features/admin/AdminLoginPage';
import { StudentHomePage } from './features/student/StudentHomePage';
import { AdminTestsPage } from './features/tests/AdminTestsPage';
import { testApi } from './features/tests/api';
import './styles.css';

function App(): React.JSX.Element | null {
  const [path, setPath] = useState(window.location.pathname);
  const [username, setUsername] = useState(testApi.getUsername() ?? 'Administrator');
  const authenticated = Boolean(testApi.getToken());
  const navigate = (destination: '/' | '/admin' | '/admin/tests' | '/admin/login'): void => {
    window.history.pushState({}, '', destination);
    setPath(destination);
  };
  useEffect(() => {
    const onPopState = (): void => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (!authenticated && path.startsWith('/admin') && path !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [authenticated, path]);
  const logout = (): void => {
    testApi.clearToken();
    navigate('/admin/login');
  };
  if (path === '/admin/login')
    return (
      <AdminLoginPage
        onAuthenticated={(name) => {
          setUsername(name);
          navigate('/admin');
        }}
      />
    );
  if (!authenticated && path.startsWith('/admin')) return null;
  if (!path.startsWith('/admin'))
    return <StudentHomePage onAdminLogin={() => navigate('/admin/login')} />;
  if (path === '/admin/tests')
    return <AdminTestsPage onHome={() => navigate('/admin')} onLogout={logout} />;
  return (
    <AdminHomePage username={username} onTests={() => navigate('/admin/tests')} onLogout={logout} />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
