'use server';

import { redirect } from 'next/navigation';
import { db } from '@/db';
import { books } from '@/db/schema';
import { getUserId } from '@/lib/auth';

export async function createBookAction(
  title: string,
  tableOfContents: string[],
  sourceText?: string,
) {
  const userId = await getUserId();

  const result = await db
    .insert(books)
    .values({
      userId,
      title,
      content: '',
      tableOfContents,
      sourceText: sourceText ?? undefined,
      status: 'draft',
    })
    .returning({ id: books.id });

  redirect(`/book/new/${result[0].id}`);
}
