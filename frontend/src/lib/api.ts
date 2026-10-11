export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Chuyển đổi đường dẫn ảnh tương đối từ Backend (VD: /uploads/abc.jpg)
 * thành đường dẫn đầy đủ (http://localhost:3001/uploads/abc.jpg)
 */
export function getImageUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("data:") ||
        url.startsWith("blob:")
    ) {
        return url;
    }
    return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // Kiểm tra nếu body là FormData (dùng khi upload file ảnh)
    // thì KHÔNG gắn cứng "Content-Type": "application/json" để trình duyệt tự gắn boundary
    const isFormData =
        typeof FormData !== "undefined" && options.body instanceof FormData;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        const errorMsg = Array.isArray(json.message)
            ? json.message[0]
            : json.message || json.error;
        throw new Error(errorMsg || `API Error (${res.status})`);
    }

    // Tự động lấy phần .data nếu Backend dùng TransformInterceptor bọc dữ liệu
    return (json.data !== undefined ? json.data : json) as T;
}