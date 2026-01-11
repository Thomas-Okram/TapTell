import React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={[
        "w-full rounded-2xl px-5 py-4 text-2xl font-semibold tracking-wide",
        "bg-white/5 text-zinc-100 placeholder:text-zinc-400",
        "border border-white/10",
        "outline-none",
        "focus:border-white/20 focus:ring-2 focus:ring-white/10",
        "shadow-inner shadow-black/30",
        className,
      ].join(" ")}
      {...props}
    />
  );
});
