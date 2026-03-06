import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getToken, clearTokens } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("observatory_user");
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });

  const isAuthenticated = !!user && !!getToken();

  useEffect(() => {
    if (user) {
      localStorage.setItem("observatory_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("observatory_user");
    }
  }, [user]);

  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
