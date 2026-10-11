"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Eye, EyeOff, Lock, Mail, User, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    // Trạng thái Form: true = Đăng nhập, false = Đăng ký
    const [isLoginMode, setIsLoginMode] = useState(true);

    const [email, setEmail] = useState("admin@brewlite.com");
    const [password, setPassword] = useState("password123");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLoginMode) {
                // ---------------- ĐĂNG NHẬP ----------------
                const res = await apiFetch<any>("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email: email.trim(), password }),
                });

                const token =
                    typeof res === "string" ? res : res?.access_token || res?.accessToken || res?.token;

                if (!token) throw new Error("Không nhận được JWT Token từ hệ thống!");

                const userInfo = res?.user || {
                    email: email.trim(),
                    name: res?.name || "Admin",
                    role: res?.role || "ADMIN",
                };

                // Nếu chỉ cho phép ADMIN vào trang Dashboard:
                if (userInfo.role && String(userInfo.role).toUpperCase() !== "ADMIN") {
                    throw new Error("Tài khoản của bạn không có quyền truy cập trang Quản trị!");
                }

                login(token, userInfo);
                toast.success("Đăng nhập thành công!");
                router.replace("/");

            } else {
                // ---------------- ĐĂNG KÝ ----------------
                await apiFetch<any>("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                        name: name.trim(),
                        phone: phone.trim()
                    }),
                });

                toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
                setIsLoginMode(true); // Tự động chuyển về form Đăng nhập
            }
        } catch (err: any) {
            toast.error(err.message || (isLoginMode ? "Email hoặc mật khẩu không chính xác!" : "Lỗi khi đăng ký tài khoản!"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex w-14 h-14 bg-gradient-to-br from-primary to-primary/70 rounded-2xl items-center justify-center shadow-xl shadow-primary/25 mb-4">
                        <Coffee className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        BrewLite
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Coffee Shop Management System
                    </p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setIsLoginMode(true)}
                            className={`flex-1 text-sm font-semibold pb-2 border-b-2 transition-colors ${
                                isLoginMode ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLoginMode(false)}
                            className={`flex-1 text-sm font-semibold pb-2 border-b-2 transition-colors ${
                                !isLoginMode ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLoginMode && (
                            <>
                                <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-300">
                                    <Label htmlFor="name" className="text-sm font-medium">Họ và tên</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 rounded-xl h-10"
                                            placeholder="Nguyễn Văn A"
                                            required={!isLoginMode}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-300 delay-75">
                                    <Label htmlFor="phone" className="text-sm font-medium">Số điện thoại</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="pl-10 rounded-xl h-10"
                                            placeholder="0901234567"
                                            required={!isLoginMode}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 rounded-xl h-10"
                                    placeholder="admin@brewlite.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10 rounded-xl h-10"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-10 rounded-xl mt-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    {isLoginMode ? "Signing in..." : "Signing up..."}
                </span>
                            ) : (
                                isLoginMode ? "Sign In" : "Create Account"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}