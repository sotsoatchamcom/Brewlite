import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ảnh vector SVG cốc cà phê BrewLite dự phòng (không bao giờ bị lỗi 404)
export const DEFAULT_PRODUCT_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 24 24' fill='none' stroke='%23B45F2B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M17 8h1a4 4 0 1 1 0 8h-1'/><path d='M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z'/><line x1='6' y1='2' x2='6' y2='4'/><line x1='10' y1='2' x2='10' y2='4'/><line x1='14' y1='2' x2='14' y2='4'/></svg>";

/**
 * Chuẩn hóa URL ảnh sản phẩm & danh mục:
 * Nhận thêm tham số thứ 2 'folder' (mặc định là "products") để phân loại đúng thư mục
 */
export function getImageUrl(
    path?: string | null,
    folder: "products" | "categories" | "toppings" = "products"
): string {
  if (!path || typeof path !== "string" || path.trim() === "") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const cleanPath = path.trim();

  // 1. Giữ nguyên nếu là link ngoài (Cloudinary, Unsplash, base64)
  if (
      cleanPath.startsWith("http://") ||
      cleanPath.startsWith("https://") ||
      cleanPath.startsWith("data:")
  ) {
    return cleanPath;
  }

  // 2. Lấy host Backend và cắt bỏ tiền tố /api ở cuối (nếu có)
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const backendHost = rawApiUrl.replace(/\/api\/?$/, "");

  // Chuẩn hóa dấu gạch chéo
  const formattedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;

  // 3. Nếu đường dẫn đã có sẵn tiền tố /uploads/
  if (formattedPath.startsWith("/uploads/")) {
    return `${backendHost}${formattedPath}`;
  }

  // 4. Nếu đường dẫn đã có sẵn tên thư mục con (/categories/, /products/, /toppings/)
  if (
      formattedPath.startsWith("/products/") ||
      formattedPath.startsWith("/categories/") ||
      formattedPath.startsWith("/toppings/")
  ) {
    return `${backendHost}/uploads${formattedPath}`;
  }

  // 5. Nếu trong database chỉ lưu mỗi tên file thô (vd: "tra-trai-cay.png")
  return `${backendHost}/uploads/${folder}${formattedPath}`;
}