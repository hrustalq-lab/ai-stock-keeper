"use client";

/**
 * Страница настройки алертов (Phase 3)
 */

import { useState } from "react";
import { api } from "~/trpc/react";

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
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              ← Dashboard
            </a>
            <span className="text-zinc-600">/</span>
            <h1 className="text-xl font-bold text-white">⚙️ Настройка алертов</h1>
          </div>

          {stats && (
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span>
                Правил: <span className="text-white">{stats.totalRules}</span>
              </span>
              <span>
                Активных:{" "}
                <span className="text-emerald-400">{stats.activeRules}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Create Button */}
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="mb-6 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors hover:bg-violet-500"
          >
            <span>+</span>
            Создать правило
          </button>
        )}

        {/* Create/Edit Form */}
        {isCreating && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editingId ? "Редактировать правило" : "Новое правило"}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Название */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-400">
                  Название *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="Низкий остаток болтов"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  SKU (пусто = все товары)
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="SKU-001"
                />
              </div>

              {/* Склад */}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Склад (пусто = все склады)
                </label>
                <input
                  type="text"
                  value={form.warehouse}
                  onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="warehouse_main"
                />
              </div>

              {/* Условие */}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Условие *
                </label>
                <select
                  value={form.condition}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      condition: e.target.value as "below" | "above" | "equals",
                    })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="below">Ниже (меньше)</option>
                  <option value="above">Выше (больше)</option>
                  <option value="equals">Равно</option>
                </select>
              </div>

              {/* Порог */}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Пороговое значение *
                </label>
                <input
                  type="number"
                  value={form.threshold}
                  onChange={(e) =>
                    setForm({ ...form, threshold: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* Канал */}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Канал уведомления *
                </label>
                <select
                  value={form.channel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channel: e.target.value as "email" | "webhook",
                    })
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>

              {/* Получатель */}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  {form.channel === "email" ? "Email *" : "Webhook URL *"}
                </label>
                <input
                  type={form.channel === "email" ? "email" : "url"}
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder={
                    form.channel === "email"
                      ? "manager@company.com"
                      : "https://webhook.site/xxx"
                  }
                />
              </div>

              {/* Cooldown */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-400">
                  Cooldown (минуты между алертами)
                </label>
                <input
                  type="number"
                  value={form.cooldownMins}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cooldownMins: parseInt(e.target.value) || 60,
                    })
                  }
                  min={0}
                  max={10080}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {editingId ? "Сохранить" : "Создать"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Rules List */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
          <div className="border-b border-zinc-700/50 px-4 py-3">
            <h2 className="font-semibold text-white">Правила алертов</h2>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-zinc-700/50" />
              ))}
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="mt-2 text-zinc-400">Нет правил алертов</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 text-violet-400 hover:text-violet-300"
              >
                Создать первое правило →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-700/30">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between px-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          rule.isActive ? "bg-emerald-400" : "bg-zinc-500"
                        }`}
                      />
                      <h3 className="font-medium text-white">{rule.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {rule.sku ?? "Все товары"} •{" "}
                      {rule.warehouse ?? "Все склады"} •{" "}
                      <span className="font-mono">
                        {rule.condition === "below" && "<"}
                        {rule.condition === "above" && ">"}
                        {rule.condition === "equals" && "="}
                        {rule.threshold}
                      </span>{" "}
                      → {rule.channel}
                    </p>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <button
                      onClick={() => testMutation.mutate({ id: rule.id })}
                      disabled={testMutation.isPending}
                      className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                      title="Тестовое уведомление"
                    >
                      🧪
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ id: rule.id })}
                      className={`rounded px-2 py-1 text-xs transition-colors ${
                        rule.isActive
                          ? "text-emerald-400 hover:bg-emerald-500/10"
                          : "text-zinc-500 hover:bg-zinc-700"
                      }`}
                      title={rule.isActive ? "Выключить" : "Включить"}
                    >
                      {rule.isActive ? "✓" : "○"}
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Удалить правило?")) {
                          deleteMutation.mutate({ id: rule.id });
                        }
                      }}
                      className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
