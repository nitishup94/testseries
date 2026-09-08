import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminHomePage } from './features/admin/AdminHomePage';
import { AdminLoginPage } from './features/admin/AdminLoginPage';
import { studentApi } from './features/student/api';
import { StudentHomePage } from './features/student/StudentHomePage';
import { AdminTestsPage } from './features/tests/AdminTestsPage';
import { testApi } from './features/tests/api';
import './styles.css';

const APP_BASE = '/testseries';
const normalizePath = (value: string): string => {
  const pathname = value.startsWith(APP_BASE) ? value.slice(APP_BASE.length) || '/' : value;
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};
const withBase = (pathname: string): string => {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${APP_BASE}${clean === '/' ? '' : clean}`;
};

function App(): React.JSX.Element | null {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  const [username, setUsername] = useState(testApi.getUsername() ?? 'Administrator');
  const [studentSessionVersion, setStudentSessionVersion] = useState(0);
  const [ssoPending, setSsoPending] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean((params.get('token') || params.get('auth_token')) && !studentApi.session());
  });
  const authenticated = Boolean(testApi.getToken());

  useEffect(() => {
    const clearSsoParams = (): void => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('token');
      nextUrl.searchParams.delete('auth_token');
      const next = `${nextUrl.pathname}${nextUrl.search ? `?${nextUrl.searchParams.toString()}` : ''}${nextUrl.hash}`;
      window.history.replaceState({}, '', next);
    };

    const urlToken = studentApi.readUrlToken();
    if (!urlToken || studentApi.session()) {
      if (
        (window.location.search.includes('token=') ||
          window.location.search.includes('auth_token=')) &&
        !urlToken
      ) {
        clearSsoParams();
      }
      setSsoPending(false);
      return;
    }

    setSsoPending(true);
    let cancelled = false;
    void (async () => {
      try {
        const session = await studentApi.ssoLogin(urlToken);
        if (cancelled) return;
        studentApi.setSession(session);
        studentApi.consumeSsoToken();
        setStudentSessionVersion((value) => value + 1);
        clearSsoParams();
      } catch {
        if (cancelled) return;
        studentApi.clearSession();
        clearSsoParams();
      } finally {
        if (!cancelled) setSsoPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  const navigate = (destination: '/' | '/admin' | '/admin/tests' | '/admin/login'): void => {
    const nextPath = normalizePath(destination);
    window.history.pushState({}, '', withBase(nextPath));
    setPath(nextPath);
  };
  useEffect(() => {
    const onPopState = (): void => setPath(normalizePath(window.location.pathname));
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
    return (
      <StudentHomePage key={studentSessionVersion} onAdminLogin={() => navigate('/admin/login')} />
    );
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
