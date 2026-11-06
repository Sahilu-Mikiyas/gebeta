"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="btn red sm" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
