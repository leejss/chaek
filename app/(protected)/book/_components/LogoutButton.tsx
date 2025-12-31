import { and, eq, isNull } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { refreshTokens } from "@/db/schema";
import {
  accessAuthCookieOptions,
  accessTokenConfig,
  refreshAuthCookieOptions,
  refreshTokenConfig,
} from "@/lib/authTokens";
import { sha256Hex } from "@/utils";

import Button from "./Button";

export default function LogoutButton() {
  const logoutAction = async () => {
    "use server";

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(refreshTokenConfig.name)?.value;

    try {
      if (typeof refreshToken === "string" && refreshToken.trim().length > 0) {
        const refreshTokenHash = await sha256Hex(refreshToken);
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(refreshTokens.tokenHash, refreshTokenHash),
              isNull(refreshTokens.revokedAt),
            ),
          );
      }
    } catch (error) {
      console.error("Logout action error:", error);
    } finally {
      cookieStore.set(accessTokenConfig.name, "", {
        ...accessAuthCookieOptions,
        maxAge: 0,
      });
      cookieStore.set(refreshTokenConfig.name, "", {
        ...refreshAuthCookieOptions,
        maxAge: 0,
      });
    }

    redirect("/login");
  };

  return (
    <form action={logoutAction} className="contents">
      <Button
        type="submit"
        variant="ghost"
        className="px-3"
        aria-label="Logout"
        title="Logout"
      >
        <div className="inline-flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </div>
      </Button>
    </form>
  );
}
