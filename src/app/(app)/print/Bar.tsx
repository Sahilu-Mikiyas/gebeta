import { PrintButton } from "./PrintButton";

export function PrintBar({ back, hint, label }: { back: string; hint: string; label: string }) {
  return (
    <div className="print-bar">
      <a className="btn sm" href="/dashboard/print">← {back}</a>
      <span>{hint}</span>
      <PrintButton label={label} />
    </div>
  );
}
