import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProductVariants,
  createProductVariant,
  deleteProductVariant,
} from "@/services/inventory/productVariants.service";
import type { ProductVariant } from "@/types/inventory.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function variantsQueryKey(parentItemId: string) {
  return ["product-variants", parentItemId] as const;
}

/** Empty attribute rows for the "add variant" mini-form, e.g. Size / Color. */
type AttributeRow = { key: string; value: string };

export function ProductVariantsDialog({
  open,
  onOpenChange,
  companyId,
  parentItemId,
  parentName,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  parentItemId: string;
  parentName: string;
  currency: string;
}) {
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading } = useQuery<ProductVariant[]>({
    queryKey: variantsQueryKey(parentItemId),
    queryFn: () => listProductVariants(parentItemId),
    enabled: open,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: variantsQueryKey(parentItemId) });

  const createMutation = useMutation({
    mutationFn: createProductVariant,
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProductVariant,
    onSuccess: invalidate,
  });

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("0");
  const [cost, setCost] = useState("0");
  const [attributes, setAttributes] = useState<AttributeRow[]>([{ key: "", value: "" }]);

  function resetForm() {
    setName("");
    setSku("");
    setPrice("0");
    setCost("0");
    setAttributes([{ key: "", value: "" }]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Variant name is required");
      return;
    }
    const variantAttributes = Object.fromEntries(
      attributes
        .filter((a) => a.key.trim() && a.value.trim())
        .map((a) => [a.key.trim(), a.value.trim()]),
    );
    try {
      await createMutation.mutateAsync({
        companyId,
        parentItemId,
        name: name.trim(),
        sku: sku.trim() || null,
        price: Number(price) || 0,
        cost: Number(cost) || 0,
        variantAttributes,
      });
      toast.success("Variant added");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create variant");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this variant?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Variant deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete variant");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Variants — {parentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No variants yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(v.variant_attributes).map(([k, val]) => (
                          <Badge key={k} variant="secondary" className="text-xs">
                            {k}: {val}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{v.sku ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
                        v.price,
                      )}
                    </TableCell>
                    <TableCell className="text-right">{v.stock_quantity}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Add a variant</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g. Red / Large"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Attributes (e.g. Size, Color)</Label>
              {attributes.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Attribute (e.g. Size)"
                    value={row.key}
                    onChange={(e) => {
                      const next = [...attributes];
                      next[i] = { ...next[i], key: e.target.value };
                      setAttributes(next);
                    }}
                  />
                  <Input
                    placeholder="Value (e.g. Large)"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...attributes];
                      next[i] = { ...next[i], value: e.target.value };
                      setAttributes(next);
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttributes([...attributes, { key: "", value: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add attribute
              </Button>
            </div>

            <Button
              className="w-full bg-gradient-hero"
              disabled={createMutation.isPending}
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Adding…" : "Add variant"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
