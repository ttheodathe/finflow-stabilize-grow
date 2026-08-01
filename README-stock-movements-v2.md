# Inventory Intelligence Platform — Slice 2: Stock Movements v2 + Accounting

Builds directly on slice 1 (core data model). Apply slice 1 first if you
haven't already.

Verified: `npx tsc --noEmit` shows the same 39 pre-existing baseline errors
as `main` (zero new ones), `npx eslint` clean on every new/changed file,
and `vite build` succeeds.

## Files in this delivery
```
supabase/migrations/20260801090000_stock_movements_v2_accounting.sql   <- the migration
src/types/inventory.types.ts                                           <- extended (StockMovement, Receive/Transfer/AdjustStockInput)
src/services/inventory/stockMovements.service.ts                       <- new
src/hooks/useStockMovements.ts                                         <- new
src/hooks/useAccounts.ts                                                <- new (read-only account picker)
src/routes/_authenticated/items.stock-movements.tsx                    <- rebuilt (was invoice-only feed)
src/components/receive-po-dialog.tsx                                   <- new
src/routes/_authenticated/purchases.orders.tsx                         <- modified (added "Receive stock" button + dialog)
src/integrations/supabase/types.ts                                     <- hand-patched again; re-run your project's `supabase gen types` once both migrations are live to get the authoritative version
src/routeTree.gen.ts                                                    <- auto-regenerated, don't hand-edit
```

## What this slice does
`inventory_balances` becomes the single source of truth for stock. One
Postgres function, `record_stock_movement()`, is the only thing allowed to
write to it — everything else (receiving, dispatch, transfers, adjustments,
and the pre-existing invoice-payment flow) goes through it, so balances can
never drift from the movement ledger. `items.stock_quantity` flips from
being the write path (slice 1's bridging design) to a rollup kept in sync
by trigger.

| Function | Does | Accounting |
|---|---|---|
| `receive_stock()` | Goods receipt, optionally against a PO line (updates `purchase_order_items.received_quantity`) | Debit Inventory / credit your chosen offset account (e.g. Accounts Payable) |
| `dispatch_stock()` | Stock leaving a warehouse | Debit COGS / credit Inventory — **internal only**, called by the rewritten invoice trigger |
| `transfer_stock()` | Move stock between two warehouses | None — pure relocation |
| `adjust_stock()` | Cycle counts, damage, loss, found stock, corrections | Optional, against a caller-chosen offset account |

**Sales now post real COGS automatically.** `apply_invoice_stock()` — the
existing trigger that fires on invoice payment — was rewritten to call
`dispatch_stock()` instead of writing `items.stock_quantity` directly. Same
trigger signature, so nothing else had to change to pick this up.

## A security tightening worth knowing about
Partway through, I caught that the low-level primitives
(`record_stock_movement`, `post_inventory_journal_entry`, `dispatch_stock`)
were initially grantable directly to `authenticated`, which would have let
any company member post movements/journal entries under someone else's
`user_id`. I locked those down to internal-only — only `receive_stock`,
`transfer_stock`, and `adjust_stock` are callable from the client, and each
pins `auth.uid()` itself rather than trusting a caller-supplied user id.

## UI notes
- **Purchase Orders** already had a button labeled "Receive" — it turned out
  to only flip a billing-status flag (`status: 'received'`) before
  converting to a bill, with no actual stock movement. I left it as-is and
  added a separate **"Receive stock"** button next to it that opens a real
  receiving dialog (choose warehouse + offset account, quantity per line,
  tracks partial receipts). You may want to rename one of the two labels to
  avoid confusion — flagging it rather than silently renaming existing UI.
- **Stock movements** page is now a full ledger (adds a Warehouse column)
  with **Transfer** and **Adjust** actions.

## Not built yet (still open from the original 20-phase brief)
Barcode/QR (Phase 6), batch/serial/expiry tracking (Phases 8–9), AI
forecasting (Phase 10), OCR-to-receiving auto-matching (Phase 12), and the
broader analytics/reports suite (Phases 14–15).
