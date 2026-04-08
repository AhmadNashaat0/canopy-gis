import { db } from "@gis-app/db";
import { user } from "@gis-app/db/schema/auth";
import { env } from "@gis-app/env/server";
import { eq } from "drizzle-orm";
import { auth } from "@gis-app/auth";

async function main() {
  console.log("🌱 Starting seed...");

  const adminEmail = env.ADMIN_EMAIL;
  const userEmail = env.USER_EMAIL;
  const password = env.EMAIL_PASSWORD;

  // Check if admin exists
  if (adminEmail && password) {
    const existingAdmin = await db.select().from(user).where(eq(user.email, adminEmail));
    if (existingAdmin?.length > 0) {
      console.log("Admin user already exists.");
    } else {
      console.log("Creating admin user...");
      const admin = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password,
          name: "Admin User",
          isActive: true,
        },
      });

      if (admin) {
        console.log("Admin created. Updating role...");
        // Update role to admin
        await db.update(user).set({ role: "admin" }).where(eq(user.email, adminEmail));
      }
    }
  } else {
    console.log("No admin user found. Skipping...");
  }

  // Check if normal user exists
  if (userEmail && password) {
    const existingUser = await db.select().from(user).where(eq(user.email, userEmail));
    if (existingUser?.length > 0) {
      console.log("Normal user already exists.");
    } else {
      console.log("Creating normal user...");
      await auth.api.signUpEmail({
        body: {
          email: userEmail,
          password,
          name: "Normal User",
          isActive: true,
        },
      });
    }
  } else {
    console.log("No normal user found. Skipping...");
  }

  console.log("✅ Seed completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
