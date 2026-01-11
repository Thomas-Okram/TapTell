import React from "react";

export function Table({
  className = "",
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto rounded-xl border border-zinc-200">
      <table className={"w-full text-sm " + className} {...props} />
    </div>
  );
}
