"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Coffee, Eye, EyeOff, Lock, Mail, User, Phone, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function AuthForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get("redirect");

    const { login } = useAuth();

    // true = Đăng nhập, false = Đăng ký
    const [isLoginMode, setIsLoginMode] = useState(true);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLoginMode) {
                // 1. ĐĂNG NHẬP (POST /auth/login)
                const res = await apiFetch<any>("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email: email.trim(), password }),
                });

                const token =
                    typeof res === "string" ? res : res?.access_token || res?.accessToken || res?.token;

                if (!token) throw new Error("Không nhận được token xác thực!");

                const userInfo = res?.user || {
                    email: email.trim(),
                    name: res?.name || "Khách hàng",
                    role: res?.role || "CUSTOMER",
                    loyaltyPoints: res?.loyaltyPoints ?? res?.points ?? 0,
                };

                // Lưu phiên đăng nhập
                login(token, userInfo);
                localStorage.setItem("token", token);
                localStorage.setItem("brewlite_token", token);
                localStorage.setItem("brewlite_user", JSON.stringify(userInfo));

                toast.success(`Xin chào, ${userInfo.name || "bạn"}! Đăng nhập thành công.`);

                // Điều hướng thông minh
                if (redirectUrl) {
                    router.replace(redirectUrl);
                } else if (String(userInfo.role).toUpperCase() === "ADMIN") {
                    router.replace("/");
                } else {
                    router.replace("/shop");
                }
            } else {
                // 2. ĐĂNG KÝ (POST /auth/register)
                await apiFetch<any>("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                        name: name.trim(),
                        phone: phone.trim(),
                    }),
                });

                toast.success("Đăng ký thành viên thành công! Vui lòng đăng nhập.");
                setIsLoginMode(true);
                setPassword("");
            }
        } catch (err: any) {
            toast.error(err.message || (isLoginMode ? "Email hoặc mật khẩu không chính xác!" : "Lỗi khi đăng ký tài khoản!"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm">
            {/* Header nhận diện thương hiệu BrewLite */}
            <div className="text-center mb-6">
                <div className="inline-flex w-14 h-14 bg-gradient-to-br from-amber-800 to-amber-950 rounded-2xl items-center justify-center shadow-xl shadow-amber-900/20 mb-3 text-white">
                    <Coffee className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    BrewLite Coffee
                </h1>
                <p className="text-xs text-stone-500 mt-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Đặt nước nhanh & Tích lũy điểm Beans
                </p>
            </div>

            {/* Thẻ Form */}
            <div className="bg-card border border-border rounded-3xl shadow-xl p-7">
                <div className="flex items-center gap-4 mb-6 border-b border-border">
                    <button
                        type="button"
                        onClick={() => setIsLoginMode(true)}
                        className={`flex-1 text-sm font-bold pb-2.5 transition-colors border-b-2 ${
                            isLoginMode
                                ? "border-amber-800 text-amber-900 dark:text-amber-400"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Đăng Nhập
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsLoginMode(false)}
                        className={`flex-1 text-sm font-bold pb-2.5 transition-colors border-b-2 ${
                            !isLoginMode
                                ? "border-amber-800 text-amber-900 dark:text-amber-400"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Đăng Ký
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLoginMode && (
                        <>
                            <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-200">
                                <Label htmlFor="name" className="text-xs font-semibold text-stone-600 uppercase">
                                    Họ và tên
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-9 rounded-xl h-10 text-sm"
                                        placeholder="Nguyễn Văn A"
                                        required={!isLoginMode}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-200 delay-75">
                                <Label htmlFor="phone" className="text-xs font-semibold text-stone-600 uppercase">
                                    Số điện thoại
                                </Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="pl-9 rounded-xl h-10 text-sm"
                                        placeholder="0901234567"
                                        required={!isLoginMode}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-stone-600 uppercase">
                            Email
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9 rounded-xl h-10 text-sm"
                                placeholder="name@brewlite.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs font-semibold text-stone-600 uppercase">
                            Mật khẩu
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 pr-9 rounded-xl h-10 text-sm"
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
                        className="w-full h-11 rounded-xl mt-2 font-bold bg-amber-900 hover:bg-amber-800 text-white shadow-md shadow-amber-900/20"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {isLoginMode ? "Đang xác thực..." : "Đang tạo tài khoản..."}
                            </span>
                        ) : isLoginMode ? (
                            "Đăng Nhập"
                        ) : (
                            "Đăng Ký Thành Viên"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function AuthLoginPage() {
    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
            <Suspense fallback={<div className="text-xs text-muted-foreground">Đang tải biểu mẫu...</div>}>
                <AuthForm />
            </Suspense>
        </div>
    );
}