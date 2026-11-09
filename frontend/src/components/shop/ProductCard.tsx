"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl, DEFAULT_PRODUCT_IMAGE } from "@/components/ui/utils";
import { formatVND } from "@/lib/shop";
import type { Product } from "@/lib/types";

export default function ProductCard({
                                        product,
                                        onSelect
                                    }: {
    product: Product;
    onSelect: (p: Product) => void;
}) {
    const [imgError, setImgError] = useState(false);

    const soldOut = (product.stock ?? 0) <= 0;
    const rawImg = !imgError && product.imageUrl ? getImageUrl(product.imageUrl) : DEFAULT_PRODUCT_IMAGE;

    return (
        <div
            className={`group relative flex flex-col bg-[#FFFFFF] border border-[#E8E2D9] rounded-xl overflow-hidden shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#B45F2B]/40 ${
                soldOut ? "opacity-75" : "hover:-translate-y-0.5"
            }`}
        >
            {/* 1. KHU VỰC HÌNH ẢNH */}
            <div className="relative aspect-[4/3] bg-[#FAF7F2] flex items-center justify-center overflow-hidden border-b border-[#E8E2D9]/60">
                {rawImg && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={rawImg}
                        alt={product.name}
                        loading="lazy"
                        onError={() => setImgError(true)}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            soldOut ? "grayscale-[60%] blur-[0.5px]" : ""
                        }`}
                    />
                ) : (
                    <Coffee className="w-10 h-10 text-[#6B5E52]/40 transition-transform duration-300 group-hover:scale-110" />
                )}

                {/* Badge Hết hàng */}
                {soldOut && (
                    <div className="absolute inset-0 bg-[#2B2118]/30 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFFFFF] text-[#A12B1F] border border-[#FBE9E7] shadow-xs uppercase tracking-wider">
                            Hết hàng
                        </span>
                    </div>
                )}
            </div>

            {/* 2. NỘI DUNG MÓN */}
            <div className="p-3.5 pr-12 flex flex-col flex-1">
                {product.category?.name && (
                    <p className="text-[11px] font-semibold text-[#6B5E52] uppercase tracking-wider mb-1">
                        {product.category.name}
                    </p>
                )}

                <h3 className="font-bold text-[#2B2118] text-sm leading-snug line-clamp-2">
                    <button
                        type="button"
                        onClick={() => !soldOut && onSelect(product)}
                        className="text-left hover:text-[#B45F2B] transition-colors focus:outline-none"
                    >
                        {product.name}
                    </button>
                </h3>

                <p className="font-extrabold text-[#B45F2B] text-base mt-auto pt-2.5 tracking-tight">
                    {formatVND(product.price)}
                </p>
            </div>

            {/* 3. NÚT THÊM NHANH (+) */}
            <Button
                size="icon"
                className="absolute bottom-3 right-3 z-10 h-8 w-8 rounded-full shadow-xs bg-[#B45F2B] hover:bg-[#9A4F22] text-white transition-all duration-150 hover:scale-105 active:scale-95 disabled:bg-[#E8E2D9] disabled:text-[#6B5E52]/50 disabled:scale-100"
                aria-label={`Chọn món ${product.name}`}
                disabled={soldOut}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(product);
                }}
            >
                <Plus className="w-4 h-4 stroke-[2.5]" />
            </Button>
        </div>
    );
}