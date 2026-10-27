"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/shop/ProductCard";
import CustomizeDialog from "@/components/shop/CustomizeDialog";
import HeroBanner from "@/components/shop/HeroBanner";
import { apiFetch } from "@/lib/api";
import { matchesSearch } from "@/lib/shop";
import type { Category, Product, Topping } from "@/lib/types";

const asList = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

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
            apiFetch<Category[]>("/categories?limit=100"),
            apiFetch<Product[]>("/products?limit=100"),
            apiFetch<Topping[]>("/toppings?limit=100"),
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

    const visible = useMemo(() => {
        return products.filter(
            (p) => (categoryId === "all" || p.category?.id === categoryId) && matchesSearch(p, query)
        );
    }, [products, categoryId, query]);

    const closeDialog = useCallback(() => setSelected(null), []);

    return (
        <>
            <HeroBanner />

            <div id="menu" className="scroll-mt-24 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Chọn đồ uống</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Chọn món, size và topping, rồi thanh toán không cần tiền mặt.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm đồ uống" aria-label="Tìm đồ uống" className="pl-10 rounded-xl h-9"
                    />
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto mt-5 pb-1" role="tablist" aria-label="Danh mục">
                {[{ id: "all" as const, name: "Tất cả" }, ...categories].map((c) => (
                    <button
                        key={c.id} role="tab" aria-selected={categoryId === c.id} onClick={() => setCategoryId(c.id)}
                        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            categoryId === c.id ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:bg-accent"
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <section className="mt-6">
                {status === "loading" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
                        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
                    </div>
                )}
                {status === "error" && (
                    <div className="bg-card border border-destructive/30 rounded-2xl p-6">
                        <p className="font-semibold text-destructive">Không tải được menu</p>
                        <p className="text-sm text-muted-foreground mt-1">{error}. Kiểm tra backend đang chạy ở cổng 3001, rồi thử lại.</p>
                        <Button onClick={load} variant="outline" className="rounded-xl mt-4">Tải lại</Button>
                    </div>
                )}
                {status === "ready" && visible.length === 0 && (
                    <p className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground">
                        Không có đồ uống nào khớp. Thử đổi danh mục hoặc từ khóa.
                    </p>
                )}
                {status === "ready" && visible.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {visible.map((p) => <ProductCard key={p.id} product={p} onSelect={setSelected} />)}
                    </div>
                )}
            </section>

            {selected && <CustomizeDialog key={selected.id} product={selected} toppings={toppings} onClose={closeDialog} />}
        </>
    );
}
