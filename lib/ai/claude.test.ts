import { test } from "bun:test";
import dotenv from "dotenv";
import { generateTableOfContents } from "./claude";
import { ClaudeModel } from "../book/types";

dotenv.config({ path: ".env" });

test("generateTableOfContents", async () => {
  await generateTableOfContents("Generic in C", ClaudeModel.HAIKU);
});
