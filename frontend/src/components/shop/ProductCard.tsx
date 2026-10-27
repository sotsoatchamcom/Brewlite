"use client"; 

import { useState } from "react";
import Link from "next/link";
import { Coffee, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/api";
import { formatVND } from "@/lib/shop";
import type { Product } from "@/lib/types";

export default function ProductCard({ 
    product, 
    onSelect 
}: { 
    product: Product; 
    onSelect: (p: Product) => void 
}) {
    const [imgError, setImgError] = useState(false);
    
    const soldOut = (product.stock ?? 0) <= 0;
    const img = !imgError && product.imageUrl ? getImageUrl(product.imageUrl) : null;

    return (
        <div 
            className={`group relative flex flex-col bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs transition-all duration-300 hover:shadow-md hover:border-border ${
                soldOut ? "opacity-90" : "hover:-translate-y-1"
            }`}
        >
            {/*  HÌNH ẢNH  */}
            <div className="relative aspect-[4/3] bg-accent flex items-center justify-center overflow-hidden">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={img} 
                        alt={product.name} 
                        loading="lazy" 
                        onError={() => setImgError(true)}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            soldOut ? "grayscale-[50%] blur-[0.5px]" : ""
                        }`} 
                    />
                ) : (
                    <Coffee className="w-10 h-10 text-muted-foreground/50 transition-transform duration-500 group-hover:scale-110" />
                )}
                
                {/* Hết Hàng */}
                {soldOut && (
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-foreground text-background shadow-sm uppercase tracking-wider">
                            Hết hàng
                        </span>
                    </div>
                )}
            </div>

            {/* --- NỘI DUNG --- */}
            <div className="p-4 pr-14 flex flex-col flex-1">
                {product.category?.name && (
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {product.category.name}
                    </p>
                )}
                
                <h3 className="font-semibold text-foreground text-sm leading-snug mt-0.5 line-clamp-2">
                    <Link 
                        href={`/shop/products/${product.id}`} 
                        className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                    >
                        {product.name}
                    </Link>
                </h3>
                
                <p className="font-bold text-foreground mt-auto pt-3">
                    {formatVND(product.price)}
                </p>
            </div>
            
            {/* --- NÚT THÊM NHANH --- */}
            <Button
                size="icon" 
                className="absolute bottom-3 right-3 z-20 h-9 w-9 rounded-full shadow-md bg-primary text-primary-foreground transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:scale-100"
                aria-label={`Thêm nhanh ${product.name}`} 
                disabled={soldOut} 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(product);
                }}
            >
                <Plus className="w-4 h-4" />
            </Button>
        </div>
    );
}