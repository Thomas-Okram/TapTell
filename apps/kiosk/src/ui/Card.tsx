import React from "react";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-white/[0.06] p-6",
        "shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]",
        "backdrop-blur-xl",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
