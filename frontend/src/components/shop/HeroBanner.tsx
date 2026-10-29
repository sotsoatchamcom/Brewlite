"use client";

import { Button } from "@/components/ui/button";


export default function HeroBanner() {
  const scrollToMenu = () =>
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section className="relative mx-auto -mt-6 mb-8 h-[360px] w-full max-w-6xl overflow-hidden rounded-3xl bg-[#e7d9d0] md:h-[420px] lg:h-[460px]">
      <div className="pointer-events-none absolute inset-0 px-6">
        <p className="absolute right-6 top-6 hidden text-xs font-bold uppercase tracking-wider text-foreground/80 sm:block">
          Original tea &amp; coffee
        </p>
      </div>

      <div className="relative z-10 px-6 pt-10 text-center md:pt-14">
        <h2 className="text-5xl font-black uppercase leading-[0.85] tracking-tighter text-foreground md:text-7xl">
          Tea &amp;<br />Coffee
        </h2>
        <p className="mt-3 text-sm font-medium tracking-wide text-foreground/80 md:text-base">
          Take a cup of coffee every day
        </p>
        <Button 
          onClick={scrollToMenu} 
          className="mt-5 rounded-full px-7 py-2.5 font-semibold transition-transform hover:scale-105 active:scale-95"
        >
          Xem Menu
        </Button>
      </div>


      <img
        src="/glass.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 w-[88%] max-w-[560px] -translate-x-1/2 translate-y-[48%] select-none drop-shadow-2xl"
      />
    </section>
  );
}