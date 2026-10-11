"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

export interface AuthUser {
    id?: number;
    email: string;
    name?: string | null;
    role?: string;
}

type AuthContextValue = {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    login: (token: string, userData?: AuthUser) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): any {
    try {
        const base64Url = token.split(".")[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(window.atob(base64));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (savedToken) {
            const decoded = parseJwt(savedToken);
            // Kiểm tra xem Token có hợp lệ và còn hạn sử dụng không (exp tính bằng giây)
            if (!decoded || (decoded.exp && decoded.exp * 1000 < Date.now())) {
                // Nếu hết hạn -> Xóa sạch
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setToken(null);
                setUser(null);
            } else {
                // Nếu còn hạn -> Cho phép đăng nhập
                setToken(savedToken);
                if (savedUser) {
                    try {
                        setUser(JSON.parse(savedUser));
                    } catch {
                        setUser(null);
                    }
                } else {
                    setUser({
                        id: decoded.sub || decoded.id,
                        email: decoded.email || "admin@brewlite.com",
                        name: decoded.name || "Admin",
                        role: decoded.role || "ADMIN",
                    });
                }
            }
        }
        setIsLoading(false);
    }, []);

    const login = (t: string, userData?: AuthUser) => {
        localStorage.setItem("token", t);
        setToken(t);

        let finalUser = userData;
        if (!finalUser) {
            const decoded = parseJwt(t);
            if (decoded) {
                finalUser = {
                    id: decoded.sub || decoded.id,
                    email: decoded.email || "admin@brewlite.com",
                    name: decoded.name || "Admin",
                    role: decoded.role || "ADMIN",
                };
            }
        }

        if (finalUser) {
            localStorage.setItem("user", JSON.stringify(finalUser));
            setUser(finalUser);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated: !!token, isLoading, user, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}