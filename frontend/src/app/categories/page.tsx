"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    List,
    RotateCcw,
    Upload,
    Image as ImageIcon,
    Coffee,
} from "lucide-react";
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from "@/lib/mockData";
import type { Category } from "@/lib/types";
import { apiFetch, getImageUrl } from "@/lib/api";
import { EntityThumbnail } from "@/components/EntityThumbnail";
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

interface CategoryFormState {
    name: string;
    description: string;
    isActive: boolean;
    file: File | null;
    previewUrl: string;
}

const emptyForm: CategoryFormState = {
    name: "",
    description: "",
    isActive: true,
    file: null,
    previewUrl: "",
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [form, setForm] = useState<CategoryFormState>(emptyForm);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function loadCategories() {
        setLoading(true);
        try {
            let res: any;
            try {
                res = await apiFetch<any>("/categories/admin/all?page=1&limit=100");
            } catch {
                res = await apiFetch<any>("/categories?page=1&limit=100");
            }

            const list = Array.isArray(res)
                ? res
                : Array.isArray(res?.data)
                    ? res.data
                    : [];
            setCategories(list);
        } catch {
            setCategories(MOCK_CATEGORIES as Category[]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCategories();
    }, []);

    const filtered = categories.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.description ?? "").toLowerCase().includes(search.toLowerCase())
    );

    function getProductCount(cat: any) {
        if (cat._count?.products !== undefined) return cat._count.products;
        if (Array.isArray(cat.products)) return cat.products.length;
        return MOCK_PRODUCTS.filter((p) => p.categoryId === cat.id).length;
    }

    function openCreate() {
        setEditing(null);
        setForm(emptyForm);
        setDialogOpen(true);
    }

    function openEdit(c: Category) {
        setEditing(c);
        setForm({
            name: c.name,
            description: c.description ?? "",
            isActive: c.isActive ?? true,
            file: null,
            previewUrl: getImageUrl((c as any).imageUrl) ?? "",
        });
        setDialogOpen(true);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] || null;
        if (selected) {
            setForm((f) => ({
                ...f,
                file: selected,
                previewUrl: URL.createObjectURL(selected),
            }));
        }
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error("Tên danh mục không được để trống");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", form.name.trim());
            // Luôn gửi description (nếu để trống thì gửi chuỗi rỗng "" để xóa mô tả cũ)
            formData.append("description", form.description.trim());
            formData.append("isActive", String(form.isActive));
            if (form.file) {
                formData.append("file", form.file);
            }

            if (editing) {
                await apiFetch(`/categories/${editing.id}`, {
                    method: "PATCH",
                    body: formData,
                });
                toast.success("Cập nhật danh mục thành công!");
            } else {
                await apiFetch("/categories", {
                    method: "POST",
                    body: formData,
                });
                toast.success("Thêm danh mục mới thành công!");
            }

            setDialogOpen(false);
            await loadCategories();
        } catch (err: any) {
            toast.error(err.message || "Không thể lưu danh mục");
        } finally {
            setSubmitting(false);
        }
    }

    // Đổi trạng thái Active / Hidden chuẩn theo ràng buộc sản phẩm của Backend
    async function toggleStatus(c: Category) {
        try {
            if (!c.isActive) {
                // Nếu đang ẩn -> Gọi API Restore (PATCH /categories/:id/restore)
                await apiFetch(`/categories/${c.id}/restore`, {
                    method: "PATCH",
                });
                toast.success(`Đã khôi phục danh mục "${c.name}"`);
            } else {
                // Nếu đang Active muốn chuyển sang Hidden -> Gọi DELETE /categories/:id
                // Backend sẽ tự động chặn và báo lỗi nếu _count.products > 0
                await apiFetch(`/categories/${c.id}`, {
                    method: "DELETE",
                });
                toast.success(`Đã ẩn danh mục "${c.name}"`);
            }
            await loadCategories();
        } catch (err: any) {
            // Hiển thị nguyên văn câu báo lỗi từ Backend: "Không thể xóa! Danh mục này đang chứa X sản phẩm..."
            toast.error(err.message || "Không thể thay đổi trạng thái");
        }
    }

    async function handleDelete() {
        if (deleteId === null) return;
        try {
            await apiFetch(`/categories/${deleteId}`, { method: "DELETE" });
            toast.success("Đã ẩn/xóa danh mục thành công");
            await loadCategories();
        } catch (err: any) {
            toast.error(err.message || "Không thể xóa danh mục này");
        } finally {
            setDeleteId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Categories</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {categories.length} menu categories total
                    </p>
                </div>
                <Button onClick={openCreate} className="rounded-xl gap-2">
                    <Plus className="w-4 h-4" /> Add Category
                </Button>
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search categories..."
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
                        <th className="w-28 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3.5">
                            Image
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Category Name
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Description
                        </th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Products
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
                                <List className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No categories found
                            </td>
                        </tr>
                    )}
                    {filtered.map((cat, idx) => (
                        <tr key={cat.id} className="hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">
                                {idx + 1}
                            </td>
                            <td className="px-4 py-3.5">
                                <div className="flex justify-center">
                                    <EntityThumbnail
                                        src={(cat as any).imageUrl}
                                        alt={cat.name}
                                        size="lg"
                                        fallbackIcon={<Coffee className="w-6 h-6" />}
                                    />
                                </div>
                            </td>
                            <td className="px-5 py-4">
                  <span className="font-semibold text-base text-foreground">
                    {cat.name}
                  </span>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground text-sm max-w-md">
                                {cat.description || "—"}
                            </td>
                            <td className="px-5 py-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full bg-accent text-xs font-bold">
                    {getProductCount(cat)}
                  </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                                <button
                                    onClick={() => toggleStatus(cat)}
                                    title="Click to toggle status"
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                        cat.isActive
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                    }`}
                                >
                                    {cat.isActive ? "Active" : "Hidden"}
                                </button>
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {!cat.isActive && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => toggleStatus(cat)}
                                            title="Khôi phục danh mục"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-lg"
                                        onClick={() => openEdit(cat)}
                                        title="Chỉnh sửa"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => setDeleteId(cat.id)}
                                        title="Xóa / Ẩn danh mục"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Edit Category" : "New Category"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-1">
                        <div className="space-y-1.5">
                            <Label>Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="VD: Cà phê pha máy, Trà trái cây..."
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, description: e.target.value }))
                                }
                                placeholder="Mô tả ngắn cho danh mục..."
                                className="rounded-xl"
                            />
                        </div>

                        {/* Khung chọn ảnh lớn và trực quan hơn */}
                        <div className="space-y-1.5">
                            <Label>Category Image</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl border border-amber-200/80 bg-[#FFF8EE] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                    {form.previewUrl ? (
                                        <img
                                            src={form.previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="w-7 h-7 text-amber-700/60" />
                                    )}
                                </div>
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                                        <Upload className="w-5 h-5" />
                                        <span className="truncate max-w-[200px]">
                      {form.file ? form.file.name : "Click to upload image"}
                    </span>
                                        <span className="text-[11px] text-muted-foreground/70">
                      PNG, JPG, WEBP up to 5MB
                    </span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="catActive"
                                checked={form.isActive}
                                disabled={Boolean(editing && getProductCount(editing) > 0 && form.isActive)}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                                }
                                className="w-4 h-4 rounded disabled:opacity-50"
                            />
                            <Label htmlFor="catActive">
                                Active (Hiển thị trên menu)
                                {editing && getProductCount(editing) > 0 && (
                                    <span className="block text-[11px] text-amber-600 font-normal">
                    * Không thể ẩn vì đang có {getProductCount(editing)} sản phẩm
                  </span>
                                )}
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={submitting}
                            className="rounded-xl"
                        >
                            {submitting ? "Saving..." : editing ? "Save Changes" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="rounded-2xl sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete / Hide Category</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Bạn có chắc chắn muốn ẩn/xóa danh mục này không?
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteId(null)}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            className="rounded-xl"
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}