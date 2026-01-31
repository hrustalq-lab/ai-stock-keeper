import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { redis } from "~/server/lib/redis";
import { validateWebhookSignature } from "~/server/lib/webhook-signature";
import { env } from "~/env";
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
    // Читаем raw body для проверки подписи
    const rawBody = await req.text();
    
    // Парсим и валидируем payload
    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }
    
    const parseResult = WebhookPayloadSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      console.error("[1C Webhook] Невалидный payload:", parseResult.error.errors);
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const payload = parseResult.data;

    // Валидация подписи HMAC-SHA256 (если секрет настроен)
    const webhookSecret = env.ONE_C_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers.get("x-1c-signature");
      const isValid = validateWebhookSignature(signature, rawBody, webhookSecret);
      
      if (!isValid) {
        console.warn("[1C Webhook] Невалидная подпись:", signature?.slice(0, 20) + "...");
        return NextResponse.json(
          { ok: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
    }
    
    console.log(`[1C Webhook] Получено событие: ${payload.event}`, payload.data);

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
