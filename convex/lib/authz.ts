import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

function parseAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function isAdminUser(ctx: Ctx, userId: Id<"users">): Promise<boolean> {
  if (parseAdminUserIds().has(String(userId))) {
    return true;
  }
  const user = await ctx.db.get("users", userId);
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email);
}

export async function canModifyImage(
  ctx: Ctx,
  image: Doc<"images">,
  userId: Id<"users">,
): Promise<boolean> {
  if (image.uploadedBy === userId) return true;
  return isAdminUser(ctx, userId);
}

export function isActiveLibraryImage(image: { status?: string }): boolean {
  return image.status === "active" || image.status === undefined;
}
