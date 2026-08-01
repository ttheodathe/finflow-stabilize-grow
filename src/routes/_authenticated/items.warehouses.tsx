import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { usePermissions } from "@/hooks/usePermissions";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useWarehouseLocations } from "@/hooks/useWarehouseLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Star, Trash2, Warehouse as WarehouseIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { WarehouseLocationNode, WarehouseLocationType } from "@/types/inventory.types";

export const Route = createFileRoute("/_authenticated/items/warehouses")({
  head: () => ({ meta: [{ title: "Warehouses — Finflow Track" }] }),
  component: WarehousesPage,
});

function WarehousesPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const { can } = usePermissions(companyId);
  const canManage = can("inventory.manage");

  const { warehouses, isLoading, createWarehouse, setDefaultWarehouse, deleteWarehouse } =
    useWarehouses(companyId);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const activeWarehouseId = selectedWarehouseId ?? warehouses[0]?.id ?? "";

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", address: "", city: "", country: "" });

  async function handleCreate() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      await createWarehouse({
        companyId,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
      });
      toast.success("Warehouse created");
      setOpen(false);
      setForm({ code: "", name: "", address: "", city: "", country: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create warehouse");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Any inventory balances at this warehouse must be moved first.`))
      return;
    try {
      await deleteWarehouse(id);
      toast.success("Warehouse deleted");
      if (selectedWarehouseId === id) setSelectedWarehouseId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete warehouse");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground">
            Manage warehouses and their zone / aisle / shelf / bin locations.
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-hero">
                <Plus className="h-4 w-4" /> New warehouse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New warehouse</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Code</Label>
                    <Input
                      placeholder="e.g. NYC-01"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. New York DC"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-hero"
                  disabled={saving}
                  onClick={handleCreate}
                >
                  {saving ? "Creating…" : "Create warehouse"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
          No warehouses yet.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="grid gap-3 content-start">
            {warehouses.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWarehouseId(w.id)}
                className={`text-left rounded-xl border bg-card p-4 transition-colors ${
                  activeWarehouseId === w.id
                    ? "border-primary ring-1 ring-primary"
                    : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{w.name}</span>
                    {w.is_default && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" /> Default
                      </Badge>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      {!w.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Set as default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultWarehouse(w.id).then(() =>
                              toast.success("Default warehouse updated"),
                            );
                          }}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(w.id, w.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {w.code}
                  {w.city ? ` · ${w.city}` : ""}
                  {w.country ? `, ${w.country}` : ""}
                </div>
              </button>
            ))}
          </div>

          {activeWarehouseId && (
            <LocationTreePanel
              key={activeWarehouseId}
              companyId={companyId}
              warehouseId={activeWarehouseId}
              canManage={canManage}
            />
          )}
        </div>
      )}
    </div>
  );
}

const LOCATION_TYPE_LABEL: Record<WarehouseLocationType, string> = {
  zone: "Zone",
  aisle: "Aisle",
  shelf: "Shelf",
  bin: "Bin",
};
const NEXT_TYPE: Record<WarehouseLocationType, WarehouseLocationType | null> = {
  zone: "aisle",
  aisle: "shelf",
  shelf: "bin",
  bin: null,
};

function LocationTreePanel({
  companyId,
  warehouseId,
  canManage,
}: {
  companyId: string;
  warehouseId: string;
  canManage: boolean;
}) {
  const { tree, isLoading, createLocation, deleteLocation } = useWarehouseLocations(warehouseId);
  const [addingUnder, setAddingUnder] = useState<{
    parentId: string | null;
    type: WarehouseLocationType;
  } | null>(null);
  const [code, setCode] = useState("");

  async function handleAdd() {
    if (!addingUnder || !code.trim()) return;
    try {
      await createLocation({
        companyId,
        warehouseId,
        parentLocationId: addingUnder.parentId,
        locationType: addingUnder.type,
        code: code.trim(),
      });
      setAddingUnder(null);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add location");
    }
  }

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" /> Locations
        </h2>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAddingUnder({ parentId: null, type: "zone" });
              setCode("");
            }}
          >
            <Plus className="h-4 w-4" /> Add zone
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : tree.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No zones yet. Add a zone, then aisles, shelves, and bins underneath it.
        </p>
      ) : (
        <div className="space-y-1">
          {tree.map((node) => (
            <LocationNodeRow
              key={node.id}
              node={node}
              depth={0}
              canManage={canManage}
              onAddChild={(parentId, type) => {
                setAddingUnder({ parentId, type });
                setCode("");
              }}
              onDelete={(id) =>
                deleteLocation(id).catch((err) =>
                  toast.error(err instanceof Error ? err.message : "Failed to delete location"),
                )
              }
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(addingUnder)} onOpenChange={(o) => !o && setAddingUnder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {addingUnder ? LOCATION_TYPE_LABEL[addingUnder.type].toLowerCase() : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Code</Label>
              <Input
                autoFocus
                placeholder="e.g. A, A-1, A-1-3"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button className="w-full bg-gradient-hero" onClick={handleAdd}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationNodeRow({
  node,
  depth,
  canManage,
  onAddChild,
  onDelete,
}: {
  node: WarehouseLocationNode;
  depth: number;
  canManage: boolean;
  onAddChild: (parentId: string, type: WarehouseLocationType) => void;
  onDelete: (id: string) => void;
}) {
  const nextType = NEXT_TYPE[node.location_type];
  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs">
            {LOCATION_TYPE_LABEL[node.location_type]}
          </Badge>
          <span className="font-medium">{node.code}</span>
          {node.name && <span className="text-muted-foreground">{node.name}</span>}
        </div>
        {canManage && (
          <div className="flex gap-1">
            {nextType && (
              <Button variant="ghost" size="icon" onClick={() => onAddChild(node.id, nextType)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onDelete(node.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      {node.children.map((child) => (
        <LocationNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          canManage={canManage}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
