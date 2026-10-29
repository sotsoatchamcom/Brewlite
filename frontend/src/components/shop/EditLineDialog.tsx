"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import OptionFields from "@/components/shop/OptionFields";
import { useCart } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import { calcUnitPrice, formatVND, sortedSizes, type CartItem } from "@/lib/shop";
import type { Product, Topping } from "@/lib/types";

/* Sửa size/topping trong giỏ. */
export default function EditLineDialog({ item, onClose }: { item: CartItem; onClose: () => void }) {
    const { updateLine } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [error, setError] = useState("");
    const [sizeId, setSizeId] = useState<number | null>(null);
    const [pickedIds, setPickedIds] = useState<number[]>(item.toppings.map((t) => t.id));
    const [count, setCount] = useState(item.qty);

    useEffect(() => {
        Promise.all([
            apiFetch<Product>(`/products/${item.productId}`),
            apiFetch<Topping[]>("/toppings?limit=100")
        ])
            .then(([p, t]) => {
                setProduct(p);
                setToppings(Array.isArray(t) ? t : []);
                setSizeId(sortedSizes(p).find((s) => s.name === item.sizeName)?.id ?? null);
            })
            .catch((e: Error) => setError(e.message));
    }, [item.productId, item.sizeName]);

    // Lọc topping hợp lệ theo danh mục của sản phẩm
    const availableToppings = useMemo(() => {
        if (!product) return [];

        const categoryToppings = (product as any).category?.toppings;
        if (Array.isArray(categoryToppings)) {
            return categoryToppings;
        }

        const catName = (product.category?.name || "").toLowerCase();
        if (catName.includes("cà phê") || catName.includes("coffee")) {
            return [];
        }
        if (catName.includes("trái cây") || catName.includes("fruit")) {
            return toppings.filter((t) => {
                const name = t.name.toLowerCase();
                return name.includes("trái cây") || name.includes("trắng");
            });
        }

        return toppings;
    }, [product, toppings]);

    const sizes = product ? sortedSizes(product) : [];
    const size = sizes.find((s) => s.id === sizeId) ?? null;

    // Chỉ tính tiền các topping hợp lệ với danh mục
    const chosen = useMemo(
        () =>
            availableToppings
                .filter((t) => pickedIds.includes(t.id))
                .map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
        [availableToppings, pickedIds]
    );

    const unitPrice = calcUnitPrice(Number(item.basePrice), Number(size?.surcharge ?? 0), chosen);
    const toggle = (id: number) => setPickedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    const save = () => {
        updateLine(item.key, count, {
            sizeName: size?.name ?? null,
            sizeSurcharge: Number(size?.surcharge ?? 0),
            toppings: chosen
        });
        toast.success("Đã cập nhật giỏ hàng");
        onClose();
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="rounded-2xl sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tùy chỉnh {item.name}</DialogTitle>
                    <DialogDescription>Đổi size hoặc topping cho ly trong giỏ.</DialogDescription>
                </DialogHeader>

                {!product && !error && <Skeleton className="h-40 rounded-xl" aria-busy="true" />}
                {error && <p className="text-sm text-destructive">Không tải được tùy chọn: {error}</p>}

                {product && (
                    <>
                        <OptionFields
                            sizes={sizes}
                            sizeId={sizeId}
                            onSize={setSizeId}
                            toppings={availableToppings}
                            pickedIds={pickedIds}
                            onToggle={toggle}
                        />

                        {item.qty > 1 && (
                            <div className="flex items-center justify-between rounded-xl bg-accent/50 px-3 py-2 text-sm mt-3">
                                <span>Áp dụng cho</span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-lg h-8 w-8"
                                        aria-label="Giảm số ly áp dụng"
                                        disabled={count <= 1}
                                        onClick={() => setCount((c) => Math.max(1, c - 1))}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="w-14 text-center font-semibold" aria-live="polite">
                                        {count} / {item.qty} ly
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-lg h-8 w-8"
                                        aria-label="Tăng số ly áp dụng"
                                        disabled={count >= item.qty}
                                        onClick={() => setCount((c) => Math.min(item.qty, c + 1))}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <DialogFooter className="flex-row gap-3 sm:justify-between mt-4">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>Hủy</Button>
                    <Button className="rounded-xl flex-1" disabled={!product} onClick={save}>
                        Lưu · {formatVND(unitPrice)} / ly
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}