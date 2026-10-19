import { Coffee } from "lucide-react";
import { getImageUrl } from "@/lib/api";
import { formatVND } from "@/lib/shop";
import type { Product } from "@/lib/types";

export default function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
    const soldOut = product.stock <= 0;
    const img = getImageUrl(product.imageUrl);
    return (
        <button
            onClick={() => onSelect(product)}
            disabled={soldOut}
            className="group text-left bg-card border border-border rounded-2xl overflow-hidden shadow-xs transition-shadow hover:shadow-md disabled:opacity-60 disabled:hover:shadow-xs"
        >
            <div className="relative aspect-[4/3] bg-accent flex items-center justify-center overflow-hidden">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <Coffee className="w-10 h-10 text-muted-foreground/50" />
                )}
                {soldOut && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-foreground text-background">
                        Hết hàng
                    </span>
                )}
            </div>
            <div className="p-4">
                {product.category?.name && <p className="text-xs text-muted-foreground">{product.category.name}</p>}
                <h3 className="font-semibold text-foreground leading-snug mt-0.5">{product.name}</h3>
                <p className="font-bold text-foreground mt-2">{formatVND(product.price)}</p>
            </div>
        </button>
    );
}
