"use client";

import React, { useState } from "react";
import { Coffee, ZoomIn, X } from "lucide-react";
import { getImageUrl } from "@/lib/api";

interface EntityThumbnailProps {
    src?: string | null;
    alt: string;
    size?: "md" | "lg" | "xl";
    fallbackIcon?: React.ReactNode;
}

export function EntityThumbnail({
                                    src,
                                    alt,
                                    size = "lg",
                                    fallbackIcon,
                                }: EntityThumbnailProps) {
    const [imgError, setImgError] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const fullUrl = getImageUrl(src);
    const hasValidImage = Boolean(fullUrl && !imgError);

    const sizeClasses = {
        md: "w-14 h-14 rounded-xl",   // 56x56px (Dùng cho Toppings)
        lg: "w-16 h-16 rounded-2xl",  // 64x64px (Dùng cho Categories)
        xl: "w-20 h-20 rounded-2xl",  // 80x80px (Dùng cho Products giống ảnh mẫu)
    }[size];

    return (
        <>
            <div
                onClick={() => hasValidImage && setPreviewOpen(true)}
                className={`group relative ${sizeClasses} bg-[#FFF8EE] border border-amber-200/60 shadow-sm flex items-center justify-center overflow-hidden shrink-0 select-none ${
                    hasValidImage ? "cursor-pointer" : ""
                }`}
            >
                {hasValidImage ? (
                    <>
                        <img
                            src={fullUrl}
                            alt={alt}
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-amber-700/70">
                        {fallbackIcon || <Coffee className="w-6 h-6 stroke-[1.75]" />}
                    </div>
                )}
            </div>

            {/* Modal phóng to ảnh khi click vào */}
            {previewOpen && hasValidImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setPreviewOpen(false)}
                >
                    <div
                        className="relative bg-card p-3 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewOpen(false)}
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-[#FFF8EE]">
                            <img
                                src={fullUrl}
                                alt={alt}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <p className="text-center font-semibold text-sm text-foreground mt-3 mb-1">
                            {alt}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}