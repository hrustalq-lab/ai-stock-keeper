/**
 * tRPC Router для Alerts (Phase 3)
 * CRUD для правил алертов
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { alertService } from "~/server/services/alert-service";

// Схема валидации правила
const alertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().max(50).nullable().optional(),
  warehouse: z.string().max(50).nullable().optional(),
  condition: z.enum(["below", "above", "equals"]),
  threshold: z.number().int().min(0),
  channel: z.enum(["email", "webhook"]),
  recipient: z.string().min(1).max(255),
  isActive: z.boolean().default(true),
  cooldownMins: z.number().int().min(0).max(10080).default(60), // max 7 дней
});

export const alertsRouter = createTRPCRouter({
  /**
   * Получить все правила алертов
   */
  getAll: publicProcedure
    .input(
      z
        .object({
          activeOnly: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db.alertRule.findMany({
        where: input?.activeOnly ? { isActive: true } : {},
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Получить одно правило по ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.alertRule.findUnique({
        where: { id: input.id },
      });
    }),

  /**
   * Создать новое правило
   */
  create: publicProcedure.input(alertRuleSchema).mutation(async ({ input }) => {
    const rule = await db.alertRule.create({
      data: {
        name: input.name,
        sku: input.sku ?? null,
        warehouse: input.warehouse ?? null,
        condition: input.condition,
        threshold: input.threshold,
        channel: input.channel,
        recipient: input.recipient,
        isActive: input.isActive,
        cooldownMins: input.cooldownMins,
      },
    });

    console.log(`[Alerts] Создано правило: ${rule.name} (ID: ${rule.id})`);
    return rule;
  }),

  /**
   * Обновить правило
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: alertRuleSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const rule = await db.alertRule.update({
        where: { id: input.id },
        data: {
          ...(input.data.name !== undefined && { name: input.data.name }),
          ...(input.data.sku !== undefined && { sku: input.data.sku }),
          ...(input.data.warehouse !== undefined && {
            warehouse: input.data.warehouse,
          }),
          ...(input.data.condition !== undefined && {
            condition: input.data.condition,
          }),
          ...(input.data.threshold !== undefined && {
            threshold: input.data.threshold,
          }),
          ...(input.data.channel !== undefined && {
            channel: input.data.channel,
          }),
          ...(input.data.recipient !== undefined && {
            recipient: input.data.recipient,
          }),
          ...(input.data.isActive !== undefined && {
            isActive: input.data.isActive,
          }),
          ...(input.data.cooldownMins !== undefined && {
            cooldownMins: input.data.cooldownMins,
          }),
        },
      });

      console.log(`[Alerts] Обновлено правило: ${rule.name} (ID: ${rule.id})`);
      return rule;
    }),

  /**
   * Удалить правило
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.alertRule.delete({
        where: { id: input.id },
      });

      console.log(`[Alerts] Удалено правило ID: ${input.id}`);
      return { success: true };
    }),

  /**
   * Включить/выключить правило
   */
  toggle: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const current = await db.alertRule.findUnique({
        where: { id: input.id },
        select: { isActive: true },
      });

      if (!current) {
        throw new Error("Правило не найдено");
      }

      const rule = await db.alertRule.update({
        where: { id: input.id },
        data: { isActive: !current.isActive },
      });

      console.log(
        `[Alerts] Правило ${rule.name} теперь ${rule.isActive ? "активно" : "неактивно"}`
      );
      return rule;
    }),

  /**
   * Получить историю алертов
   */
  getHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        ruleId: z.number().optional(),
        sku: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return alertService.getHistory(input);
    }),

  /**
   * Тестовая отправка алерта
   */
  test: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await alertService.testAlert(input.id);

      if (!result.success) {
        throw new Error(result.error ?? "Ошибка отправки тестового алерта");
      }

      return {
        success: true,
        messageId: result.messageId,
      };
    }),

  /**
   * Получить статистику алертов
   */
  getStats: publicProcedure.query(async () => {
    const [totalRules, activeRules, totalSent, failedToday] = await Promise.all(
      [
        db.alertRule.count(),
        db.alertRule.count({ where: { isActive: true } }),
        db.alertHistory.count({ where: { status: "sent" } }),
        db.alertHistory.count({
          where: {
            status: "failed",
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]
    );

    return {
      totalRules,
      activeRules,
      totalSent,
      failedToday,
    };
  }),
});
