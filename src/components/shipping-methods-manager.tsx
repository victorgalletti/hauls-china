"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  shippingMethodSchema,
  type ShippingMethodDTO,
  type ShippingMethodInput,
} from "@/lib/shipping";
import {
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
} from "@/app/shipping-methods/actions";
import { formatCNY, formatNum } from "@/lib/format";

const EMPTY: ShippingMethodInput = {
  name: "",
  baseWeightKg: "",
  basePriceCny: "",
  extraPricePerKgCny: "",
  roundingMode: "ceil",
  minWeightKg: "0",
  maxWeightKg: "",
  etaDays: "",
  declaredIncludesFreight: false,
};

function toFormValues(m: ShippingMethodDTO): ShippingMethodInput {
  return {
    name: m.name,
    baseWeightKg: String(m.baseWeightKg),
    basePriceCny: String(m.basePriceCny),
    extraPricePerKgCny: String(m.extraPricePerKgCny),
    roundingMode: m.roundingMode,
    minWeightKg: String(m.minWeightKg),
    maxWeightKg: String(m.maxWeightKg),
    etaDays: m.etaDays ?? "",
    declaredIncludesFreight: m.declaredIncludesFreight,
  };
}

export function ShippingMethodsManager({
  methods,
}: {
  methods: ShippingMethodDTO[];
}) {
  const [editing, setEditing] = useState<ShippingMethodDTO | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Métodos de envio
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as tabelas de frete usadas na calculadora.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo método
            </Button>
          </DialogTrigger>
          {createOpen ? (
            <MethodDialog
              title="Novo método de envio"
              defaultValues={EMPTY}
              onClose={() => setCreateOpen(false)}
              onSubmit={(values) => createShippingMethod(values)}
            />
          ) : null}
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabelas cadastradas</CardTitle>
          <CardDescription>
            {methods.length} método(s). Preços em CNY.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum método cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Peso base</TableHead>
                    <TableHead className="text-right">Preço base</TableHead>
                    <TableHead className="text-right">Por kg extra</TableHead>
                    <TableHead>Arred.</TableHead>
                    <TableHead>Declarado</TableHead>
                    <TableHead className="text-right">Faixa (kg)</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNum(m.baseWeightKg)} kg
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCNY(m.basePriceCny)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCNY(m.extraPricePerKgCny)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {m.roundingMode === "ceil" ? "ceil" : "linear"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {m.declaredIncludesFreight
                            ? "produto + frete"
                            : "produto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNum(m.minWeightKg)}–{formatNum(m.maxWeightKg)}
                      </TableCell>
                      <TableCell>
                        {m.etaDays ? (
                          <Badge variant="secondary">{m.etaDays}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar"
                            onClick={() => setEditing(m)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteButton id={m.id} name={m.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog (controlled by `editing`) */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing ? (
          <MethodDialog
            title="Editar método de envio"
            defaultValues={toFormValues(editing)}
            onClose={() => setEditing(null)}
            onSubmit={(values) => updateShippingMethod(editing.id, values)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function MethodDialog({
  title,
  defaultValues,
  onSubmit,
  onClose,
}: {
  title: string;
  defaultValues: ShippingMethodInput;
  onSubmit: (
    values: ShippingMethodInput,
  ) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const form = useForm<ShippingMethodInput>({
    // The schema coerces the string fields to numbers; the cast bridges a
    // types-only version-brand mismatch between @hookform/resolvers and zod 4.4
    // (runtime validation is unaffected).
    resolver: zodResolver(
      shippingMethodSchema as never,
    ) as unknown as Resolver<ShippingMethodInput>,
    defaultValues,
  });
  const pending = form.formState.isSubmitting;

  async function submit(values: ShippingMethodInput) {
    const res = await onSubmit(values);
    if (res.ok) {
      toast.success("Método salvo");
      onClose();
    } else {
      toast.error(res.error ?? "Erro ao salvar");
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Modelo de preço em degraus: preço base até o peso base, depois por kg
          extra.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: China Post SAL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="baseWeightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso base (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="basePriceCny"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço base (CNY)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="extraPricePerKgCny"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Por kg extra (CNY)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roundingMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arredondamento</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ceil">
                        ceil (arredonda p/ cima)
                      </SelectItem>
                      <SelectItem value="linear">
                        linear (proporcional)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minWeightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso mínimo (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxWeightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso máximo (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="etaDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo estimado (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex.: 20-60 dias"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="declaredIncludesFreight"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Valor declarado inclui frete</FormLabel>
                  <FormDescription>
                    Ligado: base do valor declarado = produto + frete. Desligado:
                    apenas o produto.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    setPending(true);
    const res = await deleteShippingMethod(id);
    if (res.ok) {
      toast.success("Método excluído");
      setOpen(false);
    } else {
      toast.error(res.error ?? "Erro ao excluir");
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Excluir"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir método</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{name}</strong>? Esta ação
            não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
