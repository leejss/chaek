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

import Button from "@/components/Button";

import { cn } from "@/utils";

interface LogoutButtonProps {
  className?: string;
  iconOnly?: boolean;
}

export default function LogoutButton({
  className,
  iconOnly,
}: LogoutButtonProps) {
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
        className={cn(
          "text-foreground hover:bg-neutral-100 rounded-full",
          iconOnly
            ? "p-2 h-auto w-auto"
            : "w-full justify-start px-4 py-3 text-xl font-normal h-auto",
          className,
        )}
        aria-label="Logout"
        title="Logout"
      >
        <div
          className={cn(
            "inline-flex items-center",
            iconOnly ? "gap-0" : "gap-4",
          )}
        >
          <LogOut className={cn(iconOnly ? "w-6 h-6" : "w-7 h-7")} />
          {!iconOnly && <span>Logout</span>}
        </div>
      </Button>
    </form>
  );
}
