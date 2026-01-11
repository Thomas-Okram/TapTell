import React from "react";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost";
  }
) {
  const { className = "", variant = "primary", ...rest } = props;

  const base =
    "rounded-2xl px-6 py-4 text-lg font-semibold transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";

  const styles =
    variant === "primary"
      ? "bg-zinc-100 text-zinc-950 hover:bg-white"
      : "bg-white/8 text-zinc-200 hover:bg-white/12 border border-white/10";

  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}
