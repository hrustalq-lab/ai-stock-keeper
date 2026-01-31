import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { redis } from "~/server/lib/redis";
import { z } from "zod";

// ============================================
// Схемы валидации webhook payload
// ============================================

const WebhookItemSchema = z.object({
  sku: z.string(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
});

const WebhookPayloadSchema = z.object({
  event: z.enum([
    "goods.created",
    "goods.updated",
    "goods.deleted",
    "document.posted",
    "document.cancelled",
  ]),
  timestamp: z.string(),
  data: z.object({
    id: z.string().optional(),
    sku: z.string().optional(),
    name: z.string().optional(),
    quantity: z.number().optional(),
    warehouse: z.string().optional(),
    documentId: z.string().optional(),
    docNumber: z.string().optional(),
    type: z.string().optional(),
    items: z.array(WebhookItemSchema).optional(),
  }),
});

// ============================================
// Webhook Handler
// ============================================

/**
 * POST /api/webhooks/one-c
 * Принимает события от 1C и ставит их в очередь обработки
 */
export async function POST(req: NextRequest) {
  try {
    // Парсим и валидируем payload
    const rawPayload: unknown = await req.json();
    const parseResult = WebhookPayloadSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      console.error("[1C Webhook] Невалидный payload:", parseResult.error.errors);
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    console.log(`[1C Webhook] Получено событие: ${payload.event}`, payload.data);

    // TODO: Валидация подписи webhook (если 1C её отправляет)
    // const signature = req.headers.get("x-1c-signature");
    // if (!validateSignature(signature, rawPayload)) {
    //   return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    // }

    // Добавляем в очередь обработки
    await db.syncQueue.create({
      data: {
        jobType: payload.event,
        payload: payload.data,
        status: "pending",
      },
    });

    // Публикуем в Redis для real-time обработки
    try {
      await redis.publish("1c:webhook", JSON.stringify(payload));
    } catch (redisError) {
      console.warn("[1C Webhook] Redis publish error:", redisError);
    }

    return NextResponse.json({ ok: true, event: payload.event });
  } catch (error) {
    console.error("[1C Webhook] Ошибка обработки:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/one-c
 * Проверка работоспособности endpoint
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "1C Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
