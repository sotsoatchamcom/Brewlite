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
        <div className="space-y-4">
            {sizes.length > 0 && (
                <fieldset>
                    <legend className="text-sm font-semibold mb-2">Size</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sizes.map((s) => {
                            const surcharge = Number(s.surcharge || 0);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    aria-pressed={sizeId === s.id}
                                    onClick={() => onSize(s.id)}
                                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                        sizeId === s.id
                                            ? "bg-foreground text-background border-foreground shadow-xs"
                                            : "bg-background border-border hover:bg-accent"
                                    }`}
                                >
                                    {s.name}
                                    {surcharge > 0 && (
                                        <span className="block text-xs opacity-75">+{formatVND(surcharge)}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            {toppings.length > 0 && (
                <fieldset className="border-t border-border/50 pt-3">
                    <legend className="text-sm font-semibold mb-2">Topping</legend>
                    <div className="space-y-2">
                        {toppings.map((t) => {
                            const price = Number(t.price || 0);
                            return (
                                <label
                                    key={t.id}
                                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-accent has-[:checked]:border-foreground has-[:checked]:bg-accent/40"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <input
                                            type="checkbox"
                                            className="accent-black w-4 h-4 rounded cursor-pointer"
                                            checked={pickedIds.includes(t.id)}
                                            onChange={() => onToggle(t.id)}
                                        />
                                        <span className="font-medium">{t.name}</span>
                                    </span>
                                    <span className="text-muted-foreground font-medium">+{formatVND(price)}</span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
            )}
        </div>
    );
}