import { getActiveBook } from "@/lib/queries/active-book";
import { getAllTransactionsForExport } from "@/lib/queries/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Portuguese-Excel-friendly CSV: ";" separator, comma decimals, UTF-8 BOM.
function cell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const ctx = await getActiveBook();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const rows = await getAllTransactionsForExport(ctx.book.id);
  const header = [
    "data",
    "valor",
    "tipo",
    "estado",
    "categoria",
    "subcategoria",
    "comerciante",
    "nota",
    "origem",
  ];

  const lines = [header.join(";")];
  for (const r of rows) {
    const valor =
      r.amountCents == null ? "" : (r.amountCents / 100).toFixed(2).replace(".", ",");
    lines.push(
      [
        r.txDate,
        valor,
        r.type,
        r.status,
        r.category ?? "",
        r.subcategory ?? "",
        r.merchant ?? "",
        r.note ?? "",
        r.source,
      ]
        .map(cell)
        .join(";"),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="saldo-${date}.csv"`,
    },
  });
}
