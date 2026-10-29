"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Coffee,
    Minus,
    Plus,
    ShoppingBag,
    Check,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import OptionFields from "@/components/shop/OptionFields";
import { useCart } from "@/contexts/CartContext";
import { apiFetch, getImageUrl } from "@/lib/api";
import { calcUnitPrice, formatVND, sortedSizes } from "@/lib/shop";
import type { Product, Topping } from "@/lib/types";

function QuantitySelector({
                              qty,
                              setQty,
                              max,
                              size = "lg",
                          }: {
    qty: number;
    setQty: React.Dispatch<React.SetStateAction<number>>;
    max: number | null;
    size?: "sm" | "lg";
}) {
    const atMax = max !== null && qty >= max;
    const btn = size === "lg" ? "h-10 w-10" : "h-9 w-9";
    const box = size === "lg" ? "p-1" : "";
    const label = size === "lg" ? "text-base w-10" : "text-sm w-7";

    return (
        <div className={`flex items-center border border-border rounded-2xl bg-card ${box}`}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`rounded-xl ${btn}`}
                aria-label="Giảm số lượng"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
                <Minus className="w-4 h-4" />
            </Button>
            <span className={`text-center font-bold ${label}`} aria-live="polite">
                {qty}
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`rounded-xl ${btn}`}
                aria-label="Tăng số lượng"
                disabled={atMax}
                onClick={() => setQty((q) => q + 1)}
            >
                <Plus className="w-4 h-4" />
            </Button>
        </div>
    );
}

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { addItem } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [error, setError] = useState("");
    const [sizeId, setSizeId] = useState<number | null>(null);
    const [pickedIds, setPickedIds] = useState<number[]>([]);
    const [qty, setQty] = useState(1);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!id) return;
        let alive = true;
        setStatus("loading");
        setError("");
        setPickedIds([]);
        setQty(1);
        setImgError(false);
        setAdded(false);

        Promise.all([
            apiFetch<Product>(`/products/${id}`),
            apiFetch<Topping[]>("/toppings?limit=100"),
            apiFetch<any>("/products?limit=8").catch(() => []),
        ])
            .then(([p, t, suggestData]) => {
                if (!alive) return;
                setProduct(p);
                setToppings(Array.isArray(t) ? t : []);
                setSizeId(sortedSizes(p)[0]?.id ?? null);

                const list = Array.isArray(suggestData) ? suggestData : (suggestData?.data || []);
                const filtered = list.filter((item: Product) => item.id !== p.id).slice(0, 4);
                setSuggestedProducts(filtered);

                setStatus("ready");
            })
            .catch((e: Error) => {
                if (!alive) return;
                setError(e.message);
                setStatus("error");
            });

        return () => {
            alive = false;
        };
    }, [id, reloadKey]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [id]);

    useEffect(() => {
        if (!product) return;
        const prev = document.title;
        document.title = `${product.name} — Menu`;
        return () => {
            document.title = prev;
        };
    }, [product]);

    // Lọc danh sách topping hợp lệ theo danh mục của sản phẩm
    const availableToppings = useMemo(() => {
        if (!product) return [];

        // 1. Ưu tiên lấy toppings do backend trả về gắn liền với category
        const categoryToppings = (product as any).category?.toppings;
        if (Array.isArray(categoryToppings)) {
            return categoryToppings;
        }

        // 2. Dự phòng theo tên danh mục chuẩn nghiệp vụ
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

    const stock = product?.stock ?? null;
    const unlimited = stock === null || stock === undefined;
    const soldOut = !unlimited && stock <= 0;
    const lowStock = !unlimited && !soldOut && stock > 0 && stock <= 5;
    const maxQty = unlimited ? null : stock;

    useEffect(() => {
        if (unlimited) return;
        setQty((q) => Math.min(Math.max(1, q), Math.max(1, stock as number)));
    }, [stock, unlimited]);

    const sizes = useMemo(() => (product ? sortedSizes(product) : []), [product]);
    const size = useMemo(() => sizes.find((s) => s.id === sizeId) ?? null, [sizes, sizeId]);
    const chosen = useMemo(
        () =>
            availableToppings
                .filter((t) => pickedIds.includes(t.id))
                .map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
        [availableToppings, pickedIds]
    );

    const basePrice = Number(product?.price ?? 0);
    const sizeSurcharge = Number(size?.surcharge ?? 0);
    const toppingsPrice = useMemo(
        () => chosen.reduce((s, t) => s + Number(t.price || 0), 0),
        [chosen]
    );
    const unitPrice = calcUnitPrice(basePrice, sizeSurcharge, chosen);
    const totalPrice = unitPrice * qty;
    const hasExtra = unitPrice !== basePrice;

    const img = !imgError && product ? getImageUrl(product.imageUrl) : null;

    const toggle = (tid: number) =>
        setPickedIds((p) => (p.includes(tid) ? p.filter((x) => x !== tid) : [...p, tid]));

    const submit = () => {
        if (!product || soldOut || adding) return;
        setAdding(true);
        try {
            addItem({
                productId: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                sizeName: size?.name ?? null,
                sizeSurcharge,
                toppings: chosen,
                qty,
                basePrice,
                unitPrice,
                maxQty: unlimited ? 999999 : (stock as number),
            });
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1200);
            toast.success(`Đã thêm ${product.name} vào giỏ`, {
                action: {
                    label: "Xem giỏ",
                    onClick: () => router.push("/shop/cart"),
                },
            });
        } catch {
            toast.error("Không thể thêm vào giỏ. Vui lòng thử lại.");
        } finally {
            setAdding(false);
        }
    };

    const back = (
        <Button
            asChild
            variant="ghost"
            className="rounded-xl gap-2 -ml-3 text-muted-foreground hover:text-foreground transition-colors"
        >
            <Link href="/shop">
                <ArrowLeft className="w-4 h-4" /> Quay lại menu
            </Link>
        </Button>
    );

    if (status === "loading") {
        return (
            <div className="container max-w-5xl py-6 mx-auto px-4">
                {back}
                <div className="mt-6 grid gap-10 md:grid-cols-2" aria-busy="true">
                    <Skeleton className="aspect-square rounded-3xl w-full" />
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4 rounded-xl" />
                        <Skeleton className="h-6 w-1/4 rounded-xl" />
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-40 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (status === "error" || !product) {
        return (
            <div className="container max-w-md py-16 mx-auto px-4 text-center">
                {back}
                <div className="mt-8 bg-card border border-border/80 rounded-3xl p-8 shadow-sm">
                    <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                        <Coffee className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold">Không tìm thấy món này</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {error || "Món có thể đã bị ẩn hoặc không còn trong menu."}
                    </p>
                    <div className="mt-6 grid gap-2">
                        <Button
                            onClick={() => setReloadKey((k) => k + 1)}
                            variant="outline"
                            className="rounded-xl w-full"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
                        </Button>
                        <Button asChild className="rounded-xl w-full shadow-sm">
                            <Link href="/shop">Khám phá thực đơn</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-5xl py-6 mx-auto px-4 pb-28 md:pb-12">
            {back}

            <div className="mt-6 grid gap-8 md:gap-12 md:grid-cols-12 items-start">

                {/* HÌNH ẢNH */}
                <div className="md:col-span-5 lg:col-span-5 md:sticky md:top-24">
                    <div className="relative aspect-square overflow-hidden rounded-3xl border border-border/80 bg-zinc-100 dark:bg-zinc-800/50 shadow-sm flex items-center justify-center group">
                        {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={img}
                                alt={product.name}
                                onError={() => setImgError(true)}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <Coffee className="w-20 h-20 text-muted-foreground/40" />
                        )}
                        {soldOut && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-xs flex items-center justify-center">
                                <span className="px-4 py-2 rounded-full text-sm font-bold bg-foreground text-background shadow-md">
                                    Tạm hết hàng
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* THÔNG TIN */}
                <div className="md:col-span-7 lg:col-span-7 space-y-6">
                    <div>
                        {product.category?.name && (
                            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
                                {product.category.name}
                            </span>
                        )}
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                            {product.name}
                        </h1>

                        <div className="flex items-baseline gap-3 mt-4" aria-live="polite">
                            <span className="text-3xl sm:text-4xl font-black text-primary drop-shadow-sm">
                                {formatVND(unitPrice)}
                            </span>
                            {hasExtra && (
                                <span className="text-sm font-medium text-muted-foreground line-through">
                                    Gốc: {formatVND(basePrice)}
                                </span>
                            )}
                        </div>

                        {lowStock && (
                            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-full">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Chỉ còn {stock} phần
                            </p>
                        )}

                        {product.description && (
                            <p className="text-sm text-muted-foreground mt-4 leading-relaxed bg-accent/30 p-4 rounded-2xl border border-border/50">
                                {product.description}
                            </p>
                        )}
                    </div>

                    {/* VÙNG TÙY CHỌN SIZE & TOPPING ĐÃ ĐƯỢC LỌC */}
                    <div className="border-t border-border/60 pt-5">
                        <div className="max-h-[45vh] overflow-y-auto pr-3 custom-scrollbar">
                            <OptionFields
                                sizes={sizes}
                                sizeId={sizeId}
                                onSize={setSizeId}
                                toppings={availableToppings}
                                pickedIds={pickedIds}
                                onToggle={toggle}
                            />
                        </div>
                    </div>

                    {/* Bảng tóm tắt giá */}
                    {(hasExtra || chosen.length > 0) && (
                        <div className="bg-accent/30 border border-border/50 rounded-2xl p-4 text-sm space-y-1.5">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Giá cơ bản</span>
                                <span>{formatVND(basePrice)}</span>
                            </div>
                            {sizeSurcharge > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Size {size?.name}</span>
                                    <span>+{formatVND(sizeSurcharge)}</span>
                                </div>
                            )}
                            {toppingsPrice > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Topping ({chosen.length})</span>
                                    <span>+{formatVND(toppingsPrice)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border/50">
                                <span>Tạm tính</span>
                                <span>{formatVND(unitPrice)}</span>
                            </div>
                        </div>
                    )}

                    {/* Nút Desktop / Tablet */}
                    <div className="border-t border-border/60 pt-6 hidden md:flex items-center gap-4 sticky bottom-0 bg-background/95 backdrop-blur-md pb-4 z-10">
                        <QuantitySelector qty={qty} setQty={setQty} max={maxQty} size="lg" />
                        <Button
                            onClick={submit}
                            disabled={soldOut || adding}
                            size="lg"
                            className="rounded-2xl flex-1 h-12 text-base font-bold shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {added ? (
                                <>
                                    <Check className="w-5 h-5 mr-2" /> Đã thêm
                                </>
                            ) : (
                                <>
                                    <ShoppingBag className="w-5 h-5 mr-2" />
                                    {soldOut ? "Hết hàng" : `Thêm vào giỏ · ${formatVND(totalPrice)}`}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* GỢI Ý MÓN KHÁC */}
            {suggestedProducts.length > 0 && (
                <div className="mt-16 pt-8 border-t border-border/60">
                    <h3 className="text-xl font-bold mb-4">Bạn có thể thích</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {suggestedProducts.map((p) => (
                            <Link href={`/shop/products/${p.id}`} key={p.id} className="group">
                                <div className="bg-card border border-border/80 rounded-2xl p-3 hover:shadow-md transition-shadow h-full flex flex-col">
                                    <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800/50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                                        {p.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={getImageUrl(p.imageUrl)}
                                                alt={p.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <Coffee className="w-8 h-8 text-muted-foreground/30" />
                                        )}
                                    </div>
                                    <p className="font-semibold text-sm truncate text-foreground">{p.name}</p>
                                    <p className="text-primary font-bold text-sm mt-auto pt-2">{formatVND(p.price)}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div
                role="region"
                aria-label="Thêm vào giỏ"
                className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg z-50 flex items-center gap-3"
            >
                <QuantitySelector qty={qty} setQty={setQty} max={maxQty} size="sm" />
                <Button
                    onClick={submit}
                    disabled={soldOut || adding}
                    className="rounded-2xl flex-1 h-11 font-bold shadow-md text-sm"
                >
                    {added ? (
                        <>
                            <Check className="w-4 h-4 mr-2" /> Đã thêm
                        </>
                    ) : (
                        <>
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            {soldOut ? "Hết hàng" : `Thêm · ${formatVND(totalPrice)}`}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}