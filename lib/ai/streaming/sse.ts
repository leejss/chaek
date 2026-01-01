import { SSEEvent } from "@/lib/ai/types/streaming";

export function createSSEResponse(
  events: AsyncIterable<SSEEvent>,
): Response {
  const body = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of events) {
          const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        }
      } catch (error) {
        console.error("[SSE] Stream error:", error);
        const errorData = `event: error\ndata: ${JSON.stringify({ message: "Stream interrupted" })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
