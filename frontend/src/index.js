import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import ServerWakingBanner from './components/ServerWakingBanner';
import { Spinner } from './components/ui';

// Shows the login page until there is a session, then the app
function Root() {
  const { user, checking } = useAuth();
  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner label="Checking your session…" />
      </div>
    );
  }
  // key=user.id remounts the app when switching accounts so no data leaks between users
  return user ? <App key={user.id} /> : <Login />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ServerWakingBanner />
          <Root />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
