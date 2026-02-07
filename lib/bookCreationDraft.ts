"use client";

import {
  type BookCreationDraftSnapshot,
  BookCreationDraftSnapshotSchema,
} from "@/context/types/bookCreation";

const DRAFT_KEY_PREFIX = "book-creation-draft:";

function getStorageKey(draftId: string) {
  return `${DRAFT_KEY_PREFIX}${draftId}`;
}

export function createDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readBookCreationDraft(draftId: string): BookCreationDraftSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = BookCreationDraftSnapshotSchema.safeParse(parsed);
    if (!validated.success) return null;
    return validated.data;
  } catch (error) {
    console.error("Failed to read book creation draft:", error);
    return null;
  }
}

export function writeBookCreationDraft(draftId: string, snapshot: BookCreationDraftSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(draftId), JSON.stringify(snapshot));
  } catch (error) {
    console.error("Failed to write book creation draft:", error);
  }
}

export function clearBookCreationDraft(draftId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getStorageKey(draftId));
  } catch (error) {
    console.error("Failed to clear book creation draft:", error);
  }
}
