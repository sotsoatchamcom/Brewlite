"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/shop/ProductCard";
import CustomizeDialog from "@/components/shop/CustomizeDialog";
import HeroBanner from "@/components/shop/HeroBanner";
import { apiFetch } from "@/lib/api";
import { matchesSearch } from "@/lib/shop";
import type { Category, Product, Topping } from "@/lib/types";

// Xử lý cả dạng mảng trực tiếp [...] lẫn dạng phân trang { data: [...] } từ NestJS
const asList = <T,>(x: unknown): T[] => {
    if (Array.isArray(x)) return x as T[];
    if (x && typeof x === "object" && Array.isArray((x as any).data)) {
        return (x as any).data as T[];
    }
    return [];
};

export default function ShopMenuPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [error, setError] = useState("");
    const [categoryId, setCategoryId] = useState<number | "all">("all");
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Product | null>(null);

    const load = useCallback(() => {
        setStatus("loading");
        Promise.all([
            apiFetch<any>("/categories?limit=100"),
            apiFetch<any>("/products?limit=100"),
            apiFetch<any>("/toppings?limit=100"),
        ])
            .then(([c, p, t]) => {
                setCategories(asList<Category>(c));
                setProducts(asList<Product>(p));
                setToppings(asList<Topping>(t));
                setStatus("ready");
            })
            .catch((e: Error) => {
                setError(e.message);
                setStatus("error");
            });
    }, []);

    useEffect(load, [load]);

    // Lọc theo danh mục an toàn (hỗ trợ cả p.categoryId lẫn p.category.id)
    const visible = useMemo(() => {
        return products.filter((p) => {
            const prodCatId = p.category?.id ?? (p as any).categoryId;
            const matchCat = categoryId === "all" || prodCatId === categoryId;
            return matchCat && matchesSearch(p, query);
        });
    }, [products, categoryId, query]);

    const closeDialog = useCallback(() => setSelected(null), []);

    // Lọc topping hợp lệ theo danh mục món
    const availableToppings = useMemo(() => {
        if (!selected) return [];

        const categoryToppings = (selected as any).category?.toppings;
        if (Array.isArray(categoryToppings) && categoryToppings.length > 0) {
            return categoryToppings;
        }

        const catName = (selected.category?.name || "").toLowerCase();
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
    }, [selected, toppings]);

    return (
        <div className="space-y-6">
            <HeroBanner />

            {/* Thanh tiêu đề menu & Ô tìm kiếm */}
            <div id="menu" className="scroll-mt-24 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#2B2118]">
                        Chọn đồ uống
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6B5E52] mt-0.5">
                        Chọn món, size và topping, rồi thanh toán không cần tiền mặt.
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5E52]" />
                    <Input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm đồ uống..."
                        aria-label="Tìm đồ uống"
                        className="pl-10 bg-[#FFFFFF] border-[#E8E2D9] text-[#2B2118] placeholder:text-[#6B5E52]/60 focus-visible:ring-[#B45F2B]/20 focus-visible:border-[#B45F2B] rounded-xl h-10 transition-all"
                    />
                </div>
            </div>

            {/* Danh mục (Category Tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Danh mục">
                {[{ id: "all" as const, name: "Tất cả" }, ...categories].map((c) => {
                    const isSelected = categoryId === c.id;
                    return (
                        <button
                            key={c.id}
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setCategoryId(c.id)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                isSelected
                                    ? "bg-[#B45F2B] text-white border-2 border-[#B45F2B] shadow-xs"
                                    : "bg-[#FFFFFF] border border-[#E8E2D9] text-[#6B5E52] hover:bg-[#FAF7F2] hover:text-[#2B2118] hover:border-[#B45F2B]/40"
                            }`}
                        >
                            {c.name}
                        </button>
                    );
                })}
            </div>

            {/* Danh sách thẻ sản phẩm */}
            <section className="pt-2">
                {status === "loading" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-64 rounded-xl bg-[#E8E2D9]/50" />
                        ))}
                    </div>
                )}

                {status === "error" && (
                    <div className="bg-[#FFFFFF] border border-[#FBE9E7] rounded-xl p-8 text-center space-y-3 shadow-xs">
                        <AlertCircle className="w-10 h-10 text-[#A12B1F] mx-auto" />
                        <div>
                            <p className="font-bold text-[#A12B1F]">Không tải được thực đơn</p>
                            <p className="text-xs text-[#6B5E52] mt-1 max-w-md mx-auto">
                                {error}. Vui lòng kiểm tra kết nối với Backend hoặc thử lại sau.
                            </p>
                        </div>
                        <Button
                            onClick={load}
                            variant="outline"
                            className="rounded-xl border-[#B45F2B] text-[#B45F2B] hover:bg-[#FDF1E7] gap-2 text-xs font-semibold"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" /> Thử lại
                        </Button>
                    </div>
                )}

                {status === "ready" && visible.length === 0 && (
                    <div className="bg-[#FFFFFF] border border-dashed border-[#E8E2D9] rounded-xl py-14 text-center shadow-xs">
                        <p className="text-sm font-medium text-[#6B5E52]">
                            Không tìm thấy món nước nào phù hợp.
                        </p>
                        <p className="text-xs text-[#6B5E52]/70 mt-1">
                            Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
                        </p>
                    </div>
                )}

                {status === "ready" && visible.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {visible.map((p) => (
                            <ProductCard key={p.id} product={p} onSelect={setSelected} />
                        ))}
                    </div>
                )}
            </section>

            {/* Modal tùy chỉnh kích cỡ & topping */}
            {selected && (
                <CustomizeDialog
                    key={selected.id}
                    product={selected}
                    toppings={availableToppings}
                    onClose={closeDialog}
                />
            )}
        </div>
    );
}