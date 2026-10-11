"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Pencil,
    Search,
    Lock,
    Unlock,
    Shield,
    User as UserIcon,
    Phone,
    Mail,
    ShieldAlert,
    KeyRound
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UserFormState {
    email: string;
    name: string;
    phone: string;
    password?: string;
    gender?: string;
}

const emptyForm: UserFormState = {
    email: "",
    name: "",
    phone: "",
    password: "",
    gender: "",
};

const translateError = (msg: string) => {
    if (!msg) return "Không thể xử lý yêu cầu";
    let text = msg;
    text = text.replace(/password must be longer than or equal to 6 characters/gi, "Mật khẩu phải từ 6 ký tự trở lên");
    text = text.replace(/email must be an email/gi, "Định dạng email không hợp lệ");
    text = text.replace(/should not be empty/gi, "không được để trống");
    text = text.replace(/already exists/gi, "đã tồn tại trong hệ thống");
    text = text.replace(/Mật khẩu cũ không chính xác/gi, "Mật khẩu cũ không đúng!");
    return text;
};

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // State cho Quản lý User
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<UserFormState>(emptyForm);
    const [toggleStatusId, setToggleStatusId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // State cho Đổi mật khẩu cá nhân
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: ""
    });
    const [submittingPassword, setSubmittingPassword] = useState(false);

    async function loadUsers() {
        setLoading(true);
        try {
            const res = await apiFetch<any>("/users?page=1&limit=100");
            const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            setUsers(list);
        } catch (err: any) {
            toast.error("Không thể tải danh sách người dùng");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const filtered = users.filter(
        (u) =>
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.phone?.includes(search)
    );

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setDialogOpen(true);
    }

    function openEdit(u: any) {
        setEditing(u);
        setForm({
            email: u.email || "",
            name: u.name || "",
            phone: u.phone || "",
            gender: u.gender || "",
            password: "",
        });
        setDialogOpen(true);
    }

    async function handleSave() {
        if (!form.email.trim()) {
            toast.error("Email không được để trống");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;

        if (!editing) {
            if (!form.password) {
                toast.error("Vui lòng nhập mật khẩu cho tài khoản mới");
                return;
            }
            if (!passwordRegex.test(form.password)) {
                toast.error("Mật khẩu phải từ 8 ký tự, chứa chữ hoa, chữ thường, số và ký tự đặc biệt");
                return;
            }
        }

        if (form.phone && !/^(84|0[35789])[0-9]{8}$/.test(form.phone)) {
            toast.error("Số điện thoại không hợp lệ (Phải là số ĐT Việt Nam 10 số)");
            return;
        }

        setSubmitting(true);
        try {
            if (editing) {
                const updateData: any = {
                    name: form.name.trim() || undefined,
                    phone: form.phone.trim() || undefined,
                    gender: form.gender || undefined,
                };

                // Bỏ gửi password khi edit người khác để tránh update mật khẩu ngoài ý muốn
                await apiFetch(`/users/${editing.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(updateData),
                });
                toast.success("Cập nhật thông tin thành công!");
            } else {
                await apiFetch("/users", {
                    method: "POST",
                    body: JSON.stringify({
                        email: form.email.trim(),
                        password: form.password,
                        name: form.name.trim(),
                        phone: form.phone.trim(),
                        gender: form.gender,
                    }),
                });
                toast.success("Tạo tài khoản Quản trị viên mới thành công!");
            }

            setDialogOpen(false);
            await loadUsers();
        } catch (err: any) {
            toast.error(translateError(err.message));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleToggleStatus() {
        if (toggleStatusId === null) return;
        try {
            await apiFetch(`/users/${toggleStatusId}/status`, {
                method: "PATCH",
                body: JSON.stringify({})
            });
            toast.success("Thay đổi trạng thái tài khoản thành công!");
            await loadUsers();
        } catch (err: any) {
            toast.error(translateError(err.message));
        } finally {
            setToggleStatusId(null);
        }
    }

    function triggerStatusToggle(u: any) {
        if (u.id === currentUser?.id) {
            toast.error("Bạn không thể tự khóa tài khoản của chính mình!");
            return;
        }
        setToggleStatusId(u.id);
    }

    // ==========================================
    // LOGIC ĐỔI MẬT KHẨU CÁ NHÂN
    // ==========================================
    function openChangePassword() {
        setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
        setPasswordDialogOpen(true);
    }

    async function handleChangePassword() {
        if (!passwordForm.oldPassword) {
            toast.error("Vui lòng nhập mật khẩu cũ!");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;
        if (!passwordRegex.test(passwordForm.newPassword)) {
            toast.error("Mật khẩu mới phải từ 8 ký tự, chứa chữ hoa, chữ thường, số và ký tự đặc biệt");
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            toast.error("Xác nhận mật khẩu mới không khớp!");
            return;
        }

        setSubmittingPassword(true);
        try {
            // Gọi API PATCH /users/me/password
            await apiFetch("/users/me/password", {
                method: "PATCH",
                body: JSON.stringify(passwordForm)
            });
            toast.success("Đổi mật khẩu cá nhân thành công!");
            setPasswordDialogOpen(false);
        } catch (err: any) {
            toast.error(translateError(err.message));
        } finally {
            setSubmittingPassword(false);
        }
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Users Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {users.length} accounts in system
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={openChangePassword} className="rounded-xl gap-2 text-slate-700 border-slate-300">
                        <KeyRound className="w-4 h-4" /> Đổi mật khẩu
                    </Button>
                    <Button onClick={openCreate} className="rounded-xl gap-2">
                        <ShieldAlert className="w-4 h-4" /> Add Admin
                    </Button>
                </div>
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, phone..."
                    className="pl-10 rounded-xl h-9"
                    autoComplete="off"
                    name="search_users_field"
                />
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm">
                    <thead className="bg-accent/40 border-b border-border">
                    <tr>
                        <th className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3.5">#</th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">User Info</th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">Contact</th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">Role</th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">Points</th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">Status</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {!loading && filtered.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No users found
                            </td>
                        </tr>
                    )}
                    {filtered.map((u, idx) => {
                        const isAdmin = u.role === "ADMIN";
                        const isMe = u.id === currentUser?.id;

                        return (
                            <tr key={u.id} className={`hover:bg-accent/30 transition-colors ${!u.isActive ? "bg-red-50/30" : ""}`}>
                                <td className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">{idx + 1}</td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-base text-foreground flex items-center gap-1.5">
                                            {u.name || "Chưa cập nhật"}
                                            {isMe && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold">ME</span>}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <Mail className="w-3 h-3" /> {u.email}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1 text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {u.phone || "---"}</span>
                                        <span className="text-xs">Giới tính: {u.gender || "---"}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${isAdmin ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                        {isAdmin ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-center font-bold text-emerald-600">
                                    {u.loyaltyPoints || 0}
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <button
                                        onClick={() => triggerStatusToggle(u)}
                                        title="Click để Khóa / Mở khóa"
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            u.isActive
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                                : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                        }`}
                                    >
                                        {u.isActive ? "Active" : "Locked"}
                                    </button>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => openEdit(u)} title="Chỉnh sửa">
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        {!isMe && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`w-8 h-8 rounded-lg ${u.isActive ? "text-red-500 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                                                onClick={() => triggerStatusToggle(u)}
                                                title={u.isActive ? "Khóa tài khoản" : "Mở khóa"}
                                            >
                                                {u.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* DIALOG: TẠO/SỬA NGƯỜI DÙNG */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Chỉnh sửa người dùng" : "Tạo Admin mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Email (Tài khoản đăng nhập) *</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                disabled={!!editing}
                                placeholder="admin@brewlite.com"
                                className="rounded-xl disabled:bg-muted/50"
                                autoComplete="off"
                            />
                        </div>

                        {/* CHỈ HIỆN Ô NHẬP PASSWORD KHI TẠO MỚI */}
                        {!editing && (
                            <div className="space-y-1.5">
                                <Label>Mật khẩu *</Label>
                                <Input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    placeholder="••••••••"
                                    className="rounded-xl"
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Họ và tên</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Nguyễn Văn A"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Số điện thoại</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                    placeholder="0901234567"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Giới tính</Label>
                            <select
                                value={form.gender}
                                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                                className="w-full h-10 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">Không xác định</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                            </select>
                        </div>

                        {!editing && (
                            <p className="text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                                Lưu ý: Tài khoản tạo từ màn hình này sẽ tự động được cấp quyền ADMIN cao nhất.
                            </p>
                        )}
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Hủy</Button>
                        <Button onClick={handleSave} disabled={submitting} className="rounded-xl">
                            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG: ĐỔI MẬT KHẨU CÁ NHÂN CỦA ADMIN */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Đổi mật khẩu cá nhân</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleChangePassword();
                        }}
                    >
                        {/*
                          Ô username ẩn: trình duyệt luôn ghép ô mật khẩu với ô văn bản đứng NGAY TRƯỚC nó.
                          Dialog nằm trong portal ở cuối trang nên ô văn bản gần nhất trước đó là thanh Search,
                          do đó email bị điền nhầm vào Search. Có ô này thì trình duyệt dùng nó thay cho Search.
                          Dùng sr-only (ẩn bằng CSS) chứ KHÔNG dùng display:none vì trình duyệt bỏ qua input display:none.
                        */}
                        <input
                            type="text"
                            name="username"
                            autoComplete="username"
                            value={(currentUser as { email?: string } | null)?.email ?? ""}
                            readOnly
                            tabIndex={-1}
                            aria-hidden="true"
                            className="sr-only"
                        />
                        <div className="grid gap-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Mật khẩu hiện tại *</Label>
                                <Input
                                    type="password"
                                    name="current-password"
                                    autoComplete="current-password"
                                    value={passwordForm.oldPassword}
                                    onChange={(e) => setPasswordForm((f) => ({ ...f, oldPassword: e.target.value }))}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Mật khẩu mới *</Label>
                                <Input
                                    type="password"
                                    name="new-password"
                                    autoComplete="new-password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                                    placeholder="Nhập mật khẩu mới"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Xác nhận mật khẩu mới *</Label>
                                <Input
                                    type="password"
                                    name="confirm-new-password"
                                    autoComplete="new-password"
                                    value={passwordForm.confirmNewPassword}
                                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirmNewPassword: e.target.value }))}
                                    placeholder="Nhập lại mật khẩu mới"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-2">
                            <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)} className="rounded-xl">Hủy</Button>
                            <Button type="submit" disabled={submittingPassword} className="rounded-xl">
                                {submittingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOG: KHÓA TÀI KHOẢN */}
            <Dialog open={toggleStatusId !== null} onOpenChange={() => setToggleStatusId(null)}>
                <DialogContent className="rounded-2xl sm:max-w-sm">
                    <DialogHeader><DialogTitle>Xác nhận hành động</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Bạn có chắc chắn muốn thay đổi trạng thái hoạt động của tài khoản này? (Tài khoản bị khóa sẽ không thể đăng nhập hoặc đặt hàng).
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setToggleStatusId(null)} className="rounded-xl">Hủy</Button>
                        <Button variant="destructive" onClick={handleToggleStatus} className="rounded-xl">Xác nhận</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}