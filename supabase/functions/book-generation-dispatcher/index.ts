// @ts-nocheck

const appUrl = Deno.env.get("APP_URL");
const jobSecret = Deno.env.get("BOOK_GENERATION_JOB_SECRET");

if (!appUrl) {
  throw new Error("APP_URL is required");
}

if (!jobSecret) {
  throw new Error("BOOK_GENERATION_JOB_SECRET is required");
}

Deno.serve(async () => {
  const response = await fetch(`${appUrl}/api/jobs/book-generation/drain`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jobSecret}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();

  return new Response(
    JSON.stringify({
      ok: response.ok,
      status: response.status,
      body: text,
    }),
    {
      status: response.ok ? 200 : response.status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});
