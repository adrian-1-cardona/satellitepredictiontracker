import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearStoredAuth,
  getStoredAuth,
  loginUser,
  logoutUser,
  registerUser,
} from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());
    window.addEventListener("storage", syncAuth);
    window.addEventListener("satellite-auth-updated", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("satellite-auth-updated", syncAuth);
    };
  }, []);

  const login = useCallback(async (payload) => {
    const nextAuth = await loginUser(payload);
    setAuth(nextAuth);
    return nextAuth;
  }, []);

  const register = useCallback(async (payload) => {
    const nextAuth = await registerUser(payload);
    setAuth(nextAuth);
    return nextAuth;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setAuth(null);
  }, []);

  const clearAuth = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
  }, []);

  const value = useMemo(
    () => ({
      auth,
      user: auth ? { id: auth.userId, email: auth.email } : null,
      isAuthenticated: Boolean(auth?.accessToken),
      login,
      register,
      logout,
      clearAuth,
    }),
    [auth, clearAuth, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
