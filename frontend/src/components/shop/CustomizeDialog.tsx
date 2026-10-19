"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OptionFields from "@/components/shop/OptionFields";
import { useCart } from "@/contexts/CartContext";
import { calcUnitPrice, formatVND, sortedSizes } from "@/lib/shop";
import type { Product, Topping } from "@/lib/types";

interface Props {
    product: Product;
    toppings: Topping[];
    onClose: () => void;
}

export default function CustomizeDialog({ product, toppings, onClose }: Props) {
    const { addItem } = useCart();
    const sizes = sortedSizes(product);
    const [sizeId, setSizeId] = useState<number | null>(sizes[0]?.id ?? null);
    const [pickedIds, setPickedIds] = useState<number[]>([]);
    const [qty, setQty] = useState(1);

    const size = sizes.find((s) => s.id === sizeId) ?? null;
    const chosen = toppings.filter((t) => pickedIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name, price: t.price }));
    const unitPrice = calcUnitPrice(product.price, size?.surcharge ?? 0, chosen);
    const toggle = (id: number) => setPickedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    const submit = () => {
        addItem({
            productId: product.id, name: product.name, imageUrl: product.imageUrl,
            sizeName: size?.name ?? null, sizeSurcharge: size?.surcharge ?? 0,
            toppings: chosen, qty, basePrice: Number(product.price), unitPrice, maxQty: product.stock,
        });
        toast.success(`Đã thêm ${product.name} vào giỏ`);
        onClose();
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="rounded-2xl sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription>{product.description || `Giá gốc ${formatVND(product.price)}`}</DialogDescription>
                </DialogHeader>

                <OptionFields sizes={sizes} sizeId={sizeId} onSize={setSizeId} toppings={toppings} pickedIds={pickedIds} onToggle={toggle} />

                <DialogFooter className="flex-row items-center gap-3 sm:justify-between">
                    <div className="flex items-center border border-border rounded-xl">
                        <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label="Giảm số lượng" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                            <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
                        <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label="Tăng số lượng" disabled={qty >= product.stock} onClick={() => setQty((q) => q + 1)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button onClick={submit} className="rounded-xl flex-1">
                        Thêm vào giỏ · {formatVND(unitPrice * qty)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
