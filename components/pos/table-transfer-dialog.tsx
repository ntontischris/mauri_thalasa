"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableShape } from "@/components/pos/table-shape";
import { useTableLayout } from "@/hooks/use-table-layout";

interface TableTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTableId: string;
  orderId: string;
  onTransfer: (toTableId: string) => void;
}

export function TableTransferDialog({
  open,
  onOpenChange,
  currentTableId,
  onTransfer,
}: TableTransferDialogProps) {
  const { tables } = useTableLayout();

  const availableTables = tables.filter(
    (t) => t.status === "available" && t.id !== currentTableId,
  );

  const handleSelect = (toTableId: string) => {
    onTransfer(toTableId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Μεταφορά Τραπεζιού</DialogTitle>
        </DialogHeader>

        {availableTables.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν ελεύθερα τραπέζια
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-4 py-4">
            {availableTables.map((table) => (
              <div key={table.id} className="flex flex-col items-center gap-1">
                <TableShape
                  table={table}
                  onClick={() => handleSelect(table.id)}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
