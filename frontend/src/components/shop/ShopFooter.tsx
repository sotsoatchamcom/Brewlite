import type { ReactNode } from "react";
import { Clock, Coffee, Mail, MapPin, Phone } from "lucide-react";

const CONTACT = {
    address: "273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh",
    phone: "0900 000 000",
    email: "hello@brewlite.example",
    hours: "07:00 – 22:00 mỗi ngày",
};

const SOCIALS: { label: string; href: string; icon: ReactNode }[] = [
    {
        label: "Facebook", href: "https://facebook.com",
        icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    },
    {
        label: "Instagram", href: "https://instagram.com",
        icon: (<><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>),
    },
    {
        label: "YouTube", href: "https://youtube.com",
        icon: (<><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></>),
    },
];

export default function ShopFooter() {
    return (
        <footer className="bg-foreground text-white rounded-t-[2.5rem] overflow-hidden mt-16">
            <div className="max-w-6xl mx-auto px-6 pt-14 pb-12">
                <div className="grid gap-10 md:grid-cols-3 md:gap-12 items-start">
                    
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-xl bg-white text-foreground flex items-center justify-center shadow-md">
                                <Coffee className="w-5 h-5" />
                            </span>
                            <span className="text-xl font-bold tracking-tight">BrewLite</span>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                            Thưởng thức hương vị trà và cà phê tuyệt hảo mỗi ngày với trải nghiệm đặt món nhanh chóng, tiện lợi.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/40">Liên hệ</p>
                        <address className="not-italic space-y-3 text-sm font-medium text-white/80">
                            <p className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-white/50" />
                                <span className="leading-tight">{CONTACT.address}</span>
                            </p>
                            <p className="flex items-center gap-2.5">
                                <Phone className="w-4 h-4 shrink-0 text-white/50" />
                                <span>{CONTACT.phone}</span>
                            </p>
                            <p className="flex items-center gap-2.5">
                                <Mail className="w-4 h-4 shrink-0 text-white/50" />
                                <span>{CONTACT.email}</span>
                            </p>
                        </address>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Giờ hoạt động</p>
                            <p className="flex items-center gap-2.5 text-sm font-medium text-white/80">
                                <Clock className="w-4 h-4 shrink-0 text-white/50" />
                                <span>{CONTACT.hours}</span>
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Theo dõi chúng tôi</p>
                            <div className="flex items-center gap-3">
                                {SOCIALS.map((s) => (
                                    <a 
                                        key={s.label} 
                                        href={s.href} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        aria-label={s.label} 
                                        className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all"
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            {s.icon}
                                        </svg>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className="border-t border-white/10 bg-black/40">
                <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-white/50 text-center sm:text-left">
                        © {new Date().getFullYear()} BrewLite — Đồ án môn Công nghệ Phần mềm, Đại học Sài Gòn (SGU)
                    </p>
                    <p className="text-xs text-white/40">
                        Designed with Next.js &amp; Tailwind CSS
                    </p>
                </div>
            </div>
        </footer>
    );
}