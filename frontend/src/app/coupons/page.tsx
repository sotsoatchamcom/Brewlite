"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Ticket,
    RotateCcw,
    Percent,
    CalendarDays,
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

interface CouponFormState {
    code: string;
    type: "FIXED" | "PERCENT";
    value: number | string;
    minOrderValue: number | string;
    maxDiscount: number | string;
    usageLimit: number | string;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
}

const formatDatetimeLocal = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const getDefaultDates = () => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);
    return {
        startsAt: formatDatetimeLocal(now.toISOString()),
        expiresAt: formatDatetimeLocal(nextMonth.toISOString()),
    };
};

const emptyForm: CouponFormState = {
    code: "",
    type: "FIXED",
    value: 0,
    minOrderValue: 0,
    maxDiscount: 0,
    usageLimit: 0, // Mặc định là 0 (Không giới hạn)
    ...getDefaultDates(),
    isActive: true,
};

// Bộ từ điển dịch lỗi dự phòng
const translateError = (msg: string) => {
    if (!msg) return "Không thể lưu mã giảm giá";
    let text = msg;
    text = text.replace(/must not be less than 1/gi, "phải lớn hơn 0");
    text = text.replace(/must not be less than 0/gi, "không được nhỏ hơn 0");
    text = text.replace(/must be a number string/gi, "phải là số");
    text = text.replace(/must be a number/gi, "phải là định dạng số");
    text = text.replace(/should not be empty/gi, "không được để trống");
    text = text.replace(/must be an integer/gi, "phải là số nguyên");
    text = text.replace(/must be a boolean value/gi, "phải là giá trị đúng/sai");
    return text;
};

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<CouponFormState>(emptyForm);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function loadCoupons() {
        setLoading(true);
        try {
            const res = await apiFetch<any>("/coupons?page=1&limit=100");
            const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            setCoupons(list);
        } catch {
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCoupons();
    }, []);

    const filtered = coupons.filter(
        (c) => c.code?.toLowerCase().includes(search.toLowerCase())
    );

    function openCreate() {
        setEditing(null);
        setForm({ ...emptyForm, ...getDefaultDates() });
        setDialogOpen(true);
    }

    function openEdit(c: any) {
        setEditing(c);
        setForm({
            code: c.code,
            type: c.type || "FIXED",
            value: Number(c.value) || 0,
            minOrderValue: Number(c.minOrderValue) || 0,
            maxDiscount: Number(c.maxDiscount) || 0,
            usageLimit: Number(c.usageLimit) || 0,
            startsAt: formatDatetimeLocal(c.startsAt),
            expiresAt: formatDatetimeLocal(c.expiresAt),
            isActive: c.isActive ?? true,
        });
        setDialogOpen(true);
    }

    function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value.toUpperCase().replace(/\s/g, "");
        setForm((f) => ({ ...f, code: val }));
    }

    async function handleSave() {
        if (!form.code.trim()) {
            toast.error("Mã giảm giá không được để trống");
            return;
        }
        const numericValue = Math.round(Number(form.value));
        if (numericValue <= 0) {
            toast.error("Giá trị giảm phải lớn hơn 0");
            return;
        }
        if (form.type === "PERCENT" && numericValue > 100) {
            toast.error("Giá trị phần trăm không được vượt quá 100%");
            return;
        }

        if (!form.startsAt || !form.expiresAt) {
            toast.error("Vui lòng chọn thời gian áp dụng");
            return;
        }
        if (new Date(form.startsAt) >= new Date(form.expiresAt)) {
            toast.error("Ngày hết hạn phải sau ngày bắt đầu");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("code", form.code.trim());
            formData.append("type", form.type);
            formData.append("value", String(numericValue));
            formData.append("minOrderValue", String(Math.round(Number(form.minOrderValue))));

            if (form.type === "PERCENT" && Number(form.maxDiscount) > 0) {
                formData.append("maxDiscount", String(Math.round(Number(form.maxDiscount))));
            } else {
                formData.append("maxDiscount", "");
            }

            // Xử lý gửi số 0 an toàn
            formData.append("usageLimit", String(Math.round(Number(form.usageLimit))));

            formData.append("startsAt", new Date(form.startsAt).toISOString());
            formData.append("expiresAt", new Date(form.expiresAt).toISOString());
            formData.append("isActive", String(form.isActive));

            if (editing) {
                await apiFetch(`/coupons/${editing.id}`, {
                    method: "PATCH",
                    body: formData,
                });
                toast.success("Cập nhật mã giảm giá thành công!");
            } else {
                await apiFetch("/coupons", {
                    method: "POST",
                    body: formData,
                });
                toast.success("Tạo mã giảm giá mới thành công!");
            }

            setDialogOpen(false);
            await loadCoupons();
        } catch (err: any) {
            // Dịch lỗi dự phòng trước khi hiện Toast
            toast.error(translateError(err.message));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleStatus(c: any) {
        try {
            if (!c.isActive) {
                await apiFetch(`/coupons/${c.id}/restore`, { method: "PATCH" });
                toast.success(`Đã kích hoạt lại mã "${c.code}"`);
            } else {
                await apiFetch(`/coupons/${c.id}`, { method: "DELETE" });
                toast.success(`Đã khóa mã "${c.code}"`);
            }
            await loadCoupons();
        } catch (err: any) {
            toast.error(translateError(err.message));
        }
    }

    async function handleDelete() {
        if (deleteId === null) return;
        try {
            await apiFetch(`/coupons/${deleteId}`, { method: "DELETE" });
            toast.success("Đã khóa mã giảm giá thành công");
            await loadCoupons();
        } catch (err: any) {
            toast.error(translateError(err.message));
        } finally {
            setDeleteId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {coupons.length} discount codes total
                    </p>
                </div>
                <Button onClick={openCreate} className="rounded-xl gap-2">
                    <Plus className="w-4 h-4" /> Add Coupon
                </Button>
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by coupon code..."
                    className="pl-10 rounded-xl h-9"
                />
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm">
                    <thead className="bg-accent/40 border-b border-border">
                    <tr>
                        <th className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3.5">
                            #
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Coupon Code
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Discount Value
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Min Order
                        </th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Usage
                        </th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Status
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Actions
                        </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {!loading && filtered.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No coupons found
                            </td>
                        </tr>
                    )}
                    {filtered.map((c, idx) => {
                        const isPercent = c.type === "PERCENT";
                        const val = Number(c.value || 0);
                        const maxDisc = Number(c.maxDiscount || 0);
                        const isExpired = new Date(c.expiresAt) < new Date();

                        return (
                            <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                                <td className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">
                                    {idx + 1}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-[1.5px] border-dashed border-primary/60 bg-primary/5 text-primary font-bold tracking-widest font-mono">
                                            {c.code}
                                        </div>
                                        {isExpired && (
                                            <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 rounded border border-red-200">
                          Hết hạn
                        </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex flex-col items-end">
                      <span className="font-bold text-base text-red-500">
                        {isPercent ? `-${val}%` : `-${val.toLocaleString("vi-VN")}đ`}
                      </span>
                                        {isPercent && maxDisc > 0 && (
                                            <span className="text-[11px] text-muted-foreground">
                          Tối đa {maxDisc.toLocaleString("vi-VN")}đ
                        </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right font-medium text-muted-foreground">
                                    ≥ {Number(c.minOrderValue || 0).toLocaleString("vi-VN")}đ
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        {Number(c.usageLimit) > 0 ? (
                                            <span className="bg-accent text-accent-foreground px-2.5 py-1 rounded-md font-semibold text-xs border border-border">
                          {c.usedCount} / {c.usageLimit}
                        </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{c.usedCount} (Không giới hạn)</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <button
                                        onClick={() => toggleStatus(c)}
                                        title="Click to toggle status"
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                            c.isActive && !isExpired
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                                : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                        }`}
                                    >
                                        {c.isActive ? (isExpired ? "Hết hạn" : "Active") : "Locked"}
                                    </button>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {!c.isActive && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => toggleStatus(c)}
                                                title="Khôi phục mã"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 rounded-lg"
                                            onClick={() => openEdit(c)}
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteId(c.id)}
                                            title="Khóa mã"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Coupon" : "New Coupon"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Mã giảm giá (Code) *</Label>
                                <div className="relative">
                                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={form.code}
                                        onChange={handleCodeChange}
                                        placeholder="VD: SALE2026..."
                                        className="pl-10 rounded-xl font-mono uppercase tracking-wider font-bold text-primary"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Loại giảm giá</Label>
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "FIXED"|"PERCENT" }))}
                                    className="w-full h-10 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <option value="FIXED">Giảm thẳng tiền mặt (VNĐ)</option>
                                    <option value="PERCENT">Giảm theo phần trăm (%)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Giá trị giảm ({form.type === "PERCENT" ? "%" : "VNĐ"}) *</Label>
                                <Input
                                    type="number"
                                    step={form.type === "PERCENT" ? "1" : "1000"}
                                    min="0"
                                    max={form.type === "PERCENT" ? "100" : undefined}
                                    value={form.value}
                                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Giảm tối đa (Chỉ dùng khi %)</Label>
                                <Input
                                    type="number"
                                    step="1000"
                                    min="0"
                                    disabled={form.type !== "PERCENT"}
                                    value={form.maxDiscount}
                                    onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                                    placeholder={form.type !== "PERCENT" ? "Không áp dụng" : "0"}
                                    className="rounded-xl disabled:bg-muted/50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Đơn tối thiểu (VNĐ)</Label>
                                <Input
                                    type="number"
                                    step="1000"
                                    min="0"
                                    value={form.minOrderValue}
                                    onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Giới hạn lượt dùng (0 = Vô hạn)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.usageLimit}
                                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Bắt đầu từ *</Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="datetime-local"
                                        value={form.startsAt}
                                        onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                                        className="pl-10 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kết thúc lúc *</Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="datetime-local"
                                        value={form.expiresAt}
                                        onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                                        className="pl-10 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="couponActive"
                                checked={form.isActive}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                                }
                                className="w-4 h-4 rounded"
                            />
                            <Label htmlFor="couponActive">Kích hoạt (Khách hàng có thể nhập)</Label>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleSave} disabled={submitting} className="rounded-xl">
                            {submitting ? "Saving..." : editing ? "Save Changes" : "Create Coupon"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="rounded-2xl sm:max-w-sm">
                    <DialogHeader><DialogTitle>Khóa mã giảm giá</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Bạn có chắc chắn muốn khóa mã giảm giá này không?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}