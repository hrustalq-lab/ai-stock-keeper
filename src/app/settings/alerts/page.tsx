"use client";

/**
 * Страница настройки алертов (Phase 3)
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { 
  Bell, 
  Plus, 
  Pencil, 
  Trash2, 
  TestTube, 
  Power, 
  PowerOff,
  Inbox
} from "lucide-react";

// Тип для формы создания/редактирования правила
interface AlertRuleForm {
  name: string;
  sku: string;
  warehouse: string;
  condition: "below" | "above" | "equals";
  threshold: number;
  channel: "email" | "webhook";
  recipient: string;
  cooldownMins: number;
}

const defaultForm: AlertRuleForm = {
  name: "",
  sku: "",
  warehouse: "",
  condition: "below",
  threshold: 10,
  channel: "email",
  recipient: "",
  cooldownMins: 60,
};

export default function AlertSettingsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AlertRuleForm>(defaultForm);

  const utils = api.useUtils();

  // Queries
  const { data: rules, isLoading } = api.alerts.getAll.useQuery();
  const { data: stats } = api.alerts.getStats.useQuery();

  // Mutations
  const createMutation = api.alerts.create.useMutation({
    onSuccess: () => {
      void utils.alerts.getAll.invalidate();
      setIsCreating(false);
      setForm(defaultForm);
    },
  });

  const updateMutation = api.alerts.update.useMutation({
    onSuccess: () => {
      void utils.alerts.getAll.invalidate();
      setEditingId(null);
      setForm(defaultForm);
    },
  });

  const deleteMutation = api.alerts.delete.useMutation({
    onSuccess: () => {
      void utils.alerts.getAll.invalidate();
    },
  });

  const toggleMutation = api.alerts.toggle.useMutation({
    onSuccess: () => {
      void utils.alerts.getAll.invalidate();
    },
  });

  const testMutation = api.alerts.test.useMutation();

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: form.name,
      sku: form.sku || null,
      warehouse: form.warehouse || null,
      condition: form.condition,
      threshold: form.threshold,
      channel: form.channel,
      recipient: form.recipient,
      cooldownMins: form.cooldownMins,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rule: NonNullable<typeof rules>[0]) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      sku: rule.sku ?? "",
      warehouse: rule.warehouse ?? "",
      condition: rule.condition as "below" | "above" | "equals",
      threshold: rule.threshold,
      channel: rule.channel as "email" | "webhook",
      recipient: rule.recipient,
      cooldownMins: rule.cooldownMins,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  return (
    <>
      <PageHeader
        title="Настройка алертов"
        description="Управление правилами уведомлений об остатках"
        breadcrumbs={[
          { label: "Настройки", href: "/settings" },
          { label: "Алерты" },
        ]}
        actions={
          stats && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {stats.activeRules} активных
              </Badge>
              <Badge variant="secondary">
                {stats.totalRules} всего
              </Badge>
            </div>
          )
        }
      />

      <main className="flex-1 p-3 md:p-4">
        {/* Create Button */}
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="mb-4 h-8 text-xs">
            <Plus className="mr-1.5 size-3.5" />
            Создать правило
          </Button>
        )}

        {/* Create/Edit Form - compact */}
        {isCreating && (
          <Card className="mb-4 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {editingId ? "Редактировать" : "Новое правило"}
              </CardTitle>
              <CardDescription className="text-xs">
                Настройте условия и канал уведомления
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Название */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium">Название *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Низкий остаток"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">SKU</label>
                    <Input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="Все товары"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Склад */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">Склад</label>
                    <Input
                      value={form.warehouse}
                      onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                      placeholder="Все склады"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Условие */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">Условие *</label>
                    <Select
                      value={form.condition}
                      onValueChange={(val) => setForm({ ...form, condition: val as "below" | "above" | "equals" })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="below">Ниже</SelectItem>
                        <SelectItem value="above">Выше</SelectItem>
                        <SelectItem value="equals">Равно</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Порог */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">Порог *</label>
                    <Input
                      type="number"
                      value={form.threshold}
                      onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value) || 0 })}
                      min={0}
                      required
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Канал */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">Канал *</label>
                    <Select
                      value={form.channel}
                      onValueChange={(val) => setForm({ ...form, channel: val as "email" | "webhook" })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Получатель */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      {form.channel === "email" ? "Email *" : "URL *"}
                    </label>
                    <Input
                      type={form.channel === "email" ? "email" : "url"}
                      value={form.recipient}
                      onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                      required
                      placeholder={form.channel === "email" ? "email@example.com" : "https://..."}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Cooldown */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium">Cooldown (мин)</label>
                    <Input
                      type="number"
                      value={form.cooldownMins}
                      onChange={(e) => setForm({ ...form, cooldownMins: parseInt(e.target.value) || 60 })}
                      min={0}
                      max={10080}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingId ? "Сохранить" : "Создать"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleCancel}>
                    Отмена
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Rules List - compact */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Bell className="size-4 text-primary" />
              Правила
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !rules || rules.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Inbox className="size-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Нет правил</p>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsCreating(true)}>
                  Создать первое
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${
                            rule.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        <h3 className="truncate text-sm font-medium">{rule.name}</h3>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {rule.sku ?? "Все"} • {rule.warehouse ?? "Все"} •{" "}
                        <span className="font-mono">
                          {rule.condition === "below" && "<"}
                          {rule.condition === "above" && ">"}
                          {rule.condition === "equals" && "="}
                          {rule.threshold}
                        </span>{" "}
                        → {rule.channel}
                      </p>
                    </div>

                    <div className="ml-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => testMutation.mutate({ id: rule.id })}
                        disabled={testMutation.isPending}
                        title="Тест"
                      >
                        <TestTube className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`size-7 ${rule.isActive ? "text-emerald-500" : ""}`}
                        onClick={() => toggleMutation.mutate({ id: rule.id })}
                        title={rule.isActive ? "Выкл" : "Вкл"}
                      >
                        {rule.isActive ? (
                          <Power className="size-3.5" />
                        ) : (
                          <PowerOff className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => {
                          if (confirm("Удалить?")) {
                            deleteMutation.mutate({ id: rule.id });
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
