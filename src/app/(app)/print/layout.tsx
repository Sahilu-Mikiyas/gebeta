import "./print.css";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <main className="print-page">{children}</main>;
}
