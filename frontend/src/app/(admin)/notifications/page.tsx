
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  PackageX,
  RotateCw,
  ShoppingBag,
  Trash2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types + API (gộp trong 1 file)
// ---------------------------------------------------------------------------
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PAGE_SIZE = 15;
const POLL_MS = 10_000;

type NotificationType =
  | "ORDER_NEW"
  | "ORDER_UPDATE"
  | "PAYMENT_FAILED"
  | "ORDER_CANCELLED"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationList {
  data: AppNotification[];
  meta: { total: number; page: number; limit: number; totalPages: number; unreadCount: number };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/notifications${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

const META: Record<NotificationType, { icon: LucideIcon; box: string }> = {
  ORDER_NEW: { icon: ShoppingBag, box: "bg-blue-50 text-blue-600" },
  ORDER_UPDATE: { icon: CheckCircle2, box: "bg-emerald-50 text-emerald-600" },
  PAYMENT_FAILED: { icon: CreditCard, box: "bg-red-50 text-red-600" },
  ORDER_CANCELLED: { icon: XCircle, box: "bg-slate-100 text-slate-600" },
  LOW_STOCK: { icon: AlertTriangle, box: "bg-amber-50 text-amber-600" },
  OUT_OF_STOCK: { icon: PackageX, box: "bg-red-50 text-red-600" },
};

// Trang mặc định khi thông báo không có href (ví dụ tạo tay, hoặc code cũ quên gán href)
const DEFAULT_HREF: Record<NotificationType, string> = {
  ORDER_NEW: "/orders/all",
  ORDER_UPDATE: "/orders/all",
  PAYMENT_FAILED: "/orders/all",
  ORDER_CANCELLED: "/orders/all",
  LOW_STOCK: "/products",
  OUT_OF_STOCK: "/products",
};

// Chuẩn hoá phản hồi từ API: chấp nhận { data, meta } hoặc mảng thuần, và loại bỏ phản hồi lỗi
function normalize(input: any, page: number): NotificationList {
  // Mở lớp bọc { data: { data: [...], meta } } nếu backend có interceptor
  const raw =
    input && !Array.isArray(input) && !input.meta && input.data && !Array.isArray(input.data) && typeof input.data === "object"
      ? input.data
      : input;
  const data: AppNotification[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : (() => {
          throw new Error(raw?.message || "Phản hồi không hợp lệ");
        })();
  const m = raw?.meta ?? {};
  return {
    data,
    meta: {
      total: m.total ?? data.length,
      page: m.page ?? page,
      limit: m.limit ?? PAGE_SIZE,
      totalPages: m.totalPages ?? 1,
      unreadCount: m.unreadCount ?? data.filter((n) => !n.isRead).length,
    },
  };
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(min)) return "";
  if (min < 1) return "Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

// ---------------------------------------------------------------------------
// Trang
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<NotificationList | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (tab === "unread") q.set("isRead", "false");
        const res = normalize(await api<unknown>(`?${q.toString()}`), page);
        if (res.data.length === 0 && page > 1) {
          setPage(page - 1); // xoá hết ở trang cuối => lùi trang
          return;
        }
        setResult(res);
      } catch {
        if (!silent) toast.error("Không thể tải thông báo");
      } finally {
        setLoading(false);
      }
    },
    [page, tab],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Tự làm mới mỗi 10 giây khi tab đang hiển thị
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) load(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function act(fn: () => Promise<unknown>, okMsg?: string) {
    try {
      await fn();
      await load(true);
      if (okMsg) toast.success(okMsg);
    } catch {
      toast.error("Thao tác thất bại, vui lòng thử lại");
    }
  }

  function openItem(n: AppNotification) {
    if (!n.isRead) act(() => api(`/${n.id}/read`, { method: "PATCH" }));
    const target = n.href?.startsWith("/") ? n.href : DEFAULT_HREF[n.type];
    if (target) router.push(target);
  }

  const items = result?.data ?? [];
  const unread = result?.meta?.unreadCount ?? 0;
  const totalPages = result?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            New orders, payment issues and stock alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} className="rounded-xl text-xs gap-2">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={unread === 0}
            onClick={() => act(() => api("/read-all", { method: "PATCH" }), "Đã đánh dấu tất cả là đã đọc")}
            className="rounded-xl text-xs gap-2"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => act(() => api("/clear-read", { method: "DELETE" }), "Đã xoá các thông báo đã đọc")}
            className="rounded-xl text-xs gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear read
          </Button>
        </div>
      </div>

      <div className="flex bg-accent/70 rounded-xl p-1.5 gap-1.5 w-fit">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-card shadow-sm text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            }`}
          >
            {t === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {loading && !result ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Đang tải thông báo...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {tab === "unread" ? "You're all caught up" : "No notifications yet"}
          </div>
        ) : (
          items.map((n) => {
            const { icon: Icon, box } = META[n.type] ?? META.ORDER_UPDATE;
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => openItem(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openItem(n);
                  }
                }}
                className={`group px-4 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                  n.isRead ? "opacity-70" : "bg-primary/[0.03]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${box}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <button
                  type="button"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    act(() => api(`/${n.id}`, { method: "DELETE" }));
                  }}
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Page {page} / {totalPages} · {result?.meta?.total ?? 0} notifications
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
