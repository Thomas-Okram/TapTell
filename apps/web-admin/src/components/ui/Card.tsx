import React from "react";
export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={"rounded-2xl border border-zinc-200 bg-white " + className}
      {...props}
    />
  );
}
