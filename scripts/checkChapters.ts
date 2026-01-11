import { db } from "../db";
import { chapters, books } from "../db/schema";
import { count, desc, eq } from "drizzle-orm";

async function checkChapters() {
  console.log("Checking chapters table...");

  try {
    const totalChapters = await db.select({ count: count() }).from(chapters);
    const totalRow = totalChapters[0];
    console.log(`Total chapters in DB: ${totalRow?.count ?? 0}`);

    const recentChapters = await db
      .select({
        id: chapters.id,
        bookId: chapters.bookId,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        status: chapters.status,
        contentLength: chapters.content, // We'll just check length roughly
        updatedAt: chapters.updatedAt,
        bookTitle: books.title,
      })
      .from(chapters)
      .leftJoin(books, eq(chapters.bookId, books.id))
      .orderBy(desc(chapters.updatedAt))
      .limit(5);

    console.log("\nRecent 5 chapters:");
    recentChapters.forEach((c) => {
      console.log(`- Book: "${c.bookTitle}" (ID: ${c.bookId})`);
      console.log(`  Chapter ${c.chapterNumber}: "${c.title}" [${c.status}]`);
      console.log(`  Content Length: ${c.contentLength?.length || 0} chars`);
      console.log(`  Updated At: ${c.updatedAt}`);
      console.log("--- ");
    });
  } catch (error) {
    console.error("Error querying chapters:", error);
  } finally {
    process.exit(0);
  }
}

checkChapters();
