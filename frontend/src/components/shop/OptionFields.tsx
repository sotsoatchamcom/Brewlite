"use client";

import { formatVND } from "@/lib/shop";
import type { ProductSize, Topping } from "@/lib/types";

interface Props {
    sizes: ProductSize[];
    sizeId: number | null;
    onSize: (id: number) => void;
    toppings: Topping[];
    pickedIds: number[];
    onToggle: (id: number) => void;
}

/** Chọn size + topping */
export default function OptionFields({ sizes, sizeId, onSize, toppings, pickedIds, onToggle }: Props) {
    return (
        <>
            {sizes.length > 0 && (
                <fieldset>
                    <legend className="text-sm font-semibold mb-2">Size</legend>
                    <div className="grid grid-cols-3 gap-2">
                        {sizes.map((s) => (
                            <button
                                key={s.id} type="button" aria-pressed={sizeId === s.id} onClick={() => onSize(s.id)}
                                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                    sizeId === s.id ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-accent"
                                }`}
                            >
                                {s.name}
                                {s.surcharge > 0 && <span className="block text-xs opacity-70">+{formatVND(s.surcharge)}</span>}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            {toppings.length > 0 && (
                <fieldset>
                    <legend className="text-sm font-semibold mb-2">Topping</legend>
                    <div className="space-y-2">
                        {toppings.map((t) => (
                            <label key={t.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-accent has-[:checked]:border-foreground">
                                <span className="flex items-center gap-2">
                                    <input type="checkbox" className="accent-black w-4 h-4" checked={pickedIds.includes(t.id)} onChange={() => onToggle(t.id)} />
                                    {t.name}
                                </span>
                                <span className="text-muted-foreground">+{formatVND(t.price)}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}
        </>
    );
}
