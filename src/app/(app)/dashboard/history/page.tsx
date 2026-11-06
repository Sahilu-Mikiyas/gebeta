import { requireCafe } from "@/lib/access";
import { recentChanges } from "./actions";
import { History } from "./History";

export const metadata = { title: "History · Gebeta" };

export default async function HistoryPage() {
  await requireCafe("manager");
  const rows = await recentChanges();
  return <History rows={rows.map((r) => ({ id: r.id, who: r.userName, action: r.action, summary: r.summary, at: r.createdAt.toISOString(), undone: !!r.undoneAt, canUndo: !!r.undo }))} />;
}
