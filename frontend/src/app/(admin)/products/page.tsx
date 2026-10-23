"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Package,
    RotateCcw,
    Upload,
    Image as ImageIcon,
} from "lucide-react";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "@/lib/mockData";
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

interface ProductFormState {
    name: string;
    categoryId: number | string;
    price: number | string;
    stock: number | string;
    description: string;
    isActive: boolean;
    file: File | null;
    previewUrl: string;
}

const emptyForm: ProductFormState = {
    name: "",
    categoryId: "",
    price: 0,
    stock: 100,
    description: "",
    isActive: true,
    file: null,
    previewUrl: "",
};

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [form, setForm] = useState<ProductFormState>(emptyForm);
    const [previewError, setPreviewError] = useState(false);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Tải danh sách Sản phẩm và Danh mục cùng lúc
    async function loadData() {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.allSettled([
                // Gọi khớp với GET /admin/products của ProductsController
                apiFetch<any>("/admin/products?page=1&limit=100").catch(() =>
                    apiFetch<any>("/products?page=1&limit=100")
                ),
                apiFetch<any>("/categories/admin/all?page=1&limit=100").catch(() =>
                    apiFetch<any>("/categories?page=1&limit=100")
                ),
            ]);

            if (prodRes.status === "fulfilled") {
                const list = Array.isArray(prodRes.value)
                    ? prodRes.value
                    : Array.isArray(prodRes.value?.data)
                        ? prodRes.value.data
                        : [];
                setProducts(list);
            } else {
                setProducts(MOCK_PRODUCTS);
            }

            if (catRes.status === "fulfilled") {
                const catList = Array.isArray(catRes.value)
                    ? catRes.value
                    : Array.isArray(catRes.value?.data)
                        ? catRes.value.data
                        : [];
                setCategories(catList);
            } else {
                setCategories(MOCK_CATEGORIES);
            }
        } catch {
            setProducts(MOCK_PRODUCTS);
            setCategories(MOCK_CATEGORIES);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const filtered = products.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (p.category?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    function openCreate() {
        setEditing(null);
        setForm({
            ...emptyForm,
            categoryId: categories.length > 0 ? categories[0].id : "",
        });
        setPreviewError(false);
        setDialogOpen(true);
    }

    function openEdit(p: any) {
        setEditing(p);
        setPreviewError(false);
        setForm({
            name: p.name,
            categoryId: p.categoryId ?? "",
            price: Number(p.price),
            stock: Number(p.stock),
            description: p.description ?? "",
            isActive: p.isActive ?? true,
            file: null,
            previewUrl: getImageUrl(p.imageUrl) ?? "",
        });
        setDialogOpen(true);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] || null;
        if (selected) {
            setPreviewError(false);
            setForm((f) => ({
                ...f,
                file: selected,
                previewUrl: URL.createObjectURL(selected),
            }));
        }
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error("Tên sản phẩm không được để trống");
            return;
        }
        if (!form.categoryId) {
            toast.error("Vui lòng chọn danh mục");
            return;
        }

        setSubmitting(true);
        const numericPrice = Math.round(Number(form.price));
        const numericStock = Math.round(Number(form.stock));

        try {
            let bodyData: FormData | string;

            if (form.file) {
                const formData = new FormData();
                formData.append("name", form.name.trim());
                formData.append("categoryId", String(form.categoryId));
                formData.append("price", String(numericPrice));
                formData.append("stock", String(numericStock));
                formData.append("description", form.description.trim());
                formData.append("isActive", String(form.isActive));
                formData.append("file", form.file);
                bodyData = formData;
            } else {
                bodyData = JSON.stringify({
                    name: form.name.trim(),
                    categoryId: Number(form.categoryId),
                    price: numericPrice,
                    stock: numericStock,
                    description: form.description.trim(),
                    isActive: form.isActive,
                });
            }

            if (editing) {
                // PATCH /products/:id
                await apiFetch(`/products/${editing.id}`, {
                    method: "PATCH",
                    body: bodyData,
                });
                toast.success("Cập nhật sản phẩm thành công!");
            } else {
                // POST /products
                await apiFetch("/products", {
                    method: "POST",
                    body: bodyData,
                });
                toast.success("Thêm sản phẩm mới thành công!");
            }

            setDialogOpen(false);
            await loadData();
        } catch (err: any) {
            toast.error(err.message || "Không thể lưu sản phẩm");
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleStatus(p: any) {
        try {
            if (!p.isActive) {
                // Gọi POST /products/:id/restore khớp với Controller
                await apiFetch(`/products/${p.id}/restore`, {
                    method: "POST",
                });
                toast.success(`Đã mở bán lại "${p.name}"`);
            } else {
                // Gọi DELETE /products/:id
                await apiFetch(`/products/${p.id}`, {
                    method: "DELETE",
                });
                toast.success(`Đã tạm ẩn "${p.name}"`);
            }
            await loadData();
        } catch (err: any) {
            toast.error(err.message || "Không thể thay đổi trạng thái");
        }
    }

    async function handleDelete() {
        if (deleteId === null) return;
        try {
            await apiFetch(`/products/${deleteId}`, { method: "DELETE" });
            toast.success("Đã ẩn sản phẩm thành công");
            await loadData();
        } catch (err: any) {
            toast.error(err.message || "Không thể xóa sản phẩm này");
        } finally {
            setDeleteId(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Products</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {products.length} menu items total
                    </p>
                </div>
                <Button onClick={openCreate} className="rounded-xl gap-2">
                    <Plus className="w-4 h-4" /> Add Product
                </Button>
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products..."
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
                        <th className="w-32 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-3.5">
                            Image
                        </th>
                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Product Details
                        </th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Price
                        </th>
                        <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3.5">
                            Stock
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
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                No products found
                            </td>
                        </tr>
                    )}
                    {filtered.map((product, idx) => (
                        <tr key={product.id} className="hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-4 text-center text-xs font-semibold text-muted-foreground">
                                {idx + 1}
                            </td>
                            <td className="px-4 py-3.5">
                                <div className="flex justify-center">
                                    <EntityThumbnail
                                        src={product.imageUrl}
                                        alt={product.name}
                                        size="xl"
                                        fallbackIcon={<Package className="w-7 h-7" />}
                                    />
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-base text-foreground">
                                        {product.name}
                                    </span>
                                    <span className="text-xs font-medium text-muted-foreground mt-0.5">
                                        {product.category?.name || "No Category"}
                                    </span>
                                    {product.description && (
                                        <span className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-1 max-w-[220px]">
                                            {product.description}
                                        </span>
                                    )}

                                    {/* HIỂN THỊ DANH SÁCH SIZE & PHỤ THU */}
                                    {product.sizes && product.sizes.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {product.sizes.map((s: any) => (
                                                <span
                                                    key={s.id || s.name}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60"
                                                >
                                                    Size {s.name}
                                                    {s.surcharge > 0
                                                        ? ` (+${Number(s.surcharge).toLocaleString("vi-VN")}đ)`
                                                        : " (+0đ)"}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="font-bold text-base text-primary">
                                        {Number(product.price).toLocaleString("vi-VN")}đ
                                    </span>

                                    {/* CHI TIẾT TỔNG GIÁ TỪNG SIZE (Giá gốc + phụ thu) */}
                                    {product.sizes && product.sizes.length > 0 && (
                                        <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                            {product.sizes.map((s: any) => (
                                                <div key={s.id || s.name} className="flex items-center gap-1 justify-end">
                                                    <span className="text-muted-foreground/80 font-medium">Size {s.name}:</span>
                                                    <span className="font-semibold text-foreground">
                                                        {(Number(product.price) + Number(s.surcharge)).toLocaleString("vi-VN")}đ
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                                <span
                                    className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-full text-xs font-bold border ${
                                        product.stock > 10
                                            ? "bg-slate-100 text-slate-700 border-slate-200"
                                            : product.stock > 0
                                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                                : "bg-red-50 text-red-600 border-red-200"
                                    }`}
                                >
                                    {product.stock}
                                </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                                <button
                                    onClick={() => toggleStatus(product)}
                                    title="Click to toggle status"
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                        product.isActive
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                    }`}
                                >
                                    {product.isActive ? "Selling" : "Hidden"}
                                </button>
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {!product.isActive && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => toggleStatus(product)}
                                            title="Mở bán lại"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-lg"
                                        onClick={() => openEdit(product)}
                                        title="Chỉnh sửa"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => setDeleteId(product.id)}
                                        title="Ẩn / Xóa"
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Edit Product" : "New Product"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-2">
                        <div className="col-span-2 space-y-1.5">
                            <Label>Product Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="VD: Cà Phê Sữa Đá..."
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Category *</Label>
                            <select
                                value={form.categoryId}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                                }
                                className="w-full h-10 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                <option value="" disabled>
                                    -- Chọn danh mục --
                                </option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Price (VNĐ) *</Label>
                            <Input
                                type="number"
                                step="1000"
                                min="0"
                                value={form.price}
                                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label>Stock Quantity</Label>
                            <Input
                                type="number"
                                min="0"
                                value={form.stock}
                                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, description: e.target.value }))
                                }
                                placeholder="Mô tả thành phần, hương vị..."
                                className="rounded-xl"
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label>Product Image</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-2xl border border-amber-200/80 bg-[#FFF8EE] flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                    {form.previewUrl && !previewError ? (
                                        <img
                                            src={form.previewUrl}
                                            alt="Preview"
                                            onError={() => setPreviewError(true)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-amber-700/60" />
                                    )}
                                </div>
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                                        <Upload className="w-5 h-5" />
                                        <span className="truncate max-w-[200px]">
                                            {form.file ? form.file.name : "Click to upload product image"}
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

                        <div className="col-span-2 flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="prodActive"
                                checked={form.isActive}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                                }
                                className="w-4 h-4 rounded"
                            />
                            <Label htmlFor="prodActive">Active (Mở bán)</Label>
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
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

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="rounded-2xl sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hide / Delete Product</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Bạn có chắc chắn muốn ẩn/xóa sản phẩm này không? Sản phẩm sẽ không còn hiển thị trên menu đặt hàng của khách.
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