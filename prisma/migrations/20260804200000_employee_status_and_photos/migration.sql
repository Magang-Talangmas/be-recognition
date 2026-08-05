-- Convert photos TEXT[] -> JSONB (array of string URL Cloudinary)
ALTER TABLE "employees" ALTER COLUMN "photos" DROP DEFAULT;
ALTER TABLE "employees" ALTER COLUMN "photos" TYPE JSONB USING COALESCE(to_jsonb(photos), '[]'::jsonb);
ALTER TABLE "employees" ALTER COLUMN "photos" SET DEFAULT '[]'::jsonb;

-- Replace isActive boolean dengan status text ("Active" | "Inactive")
ALTER TABLE "employees" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Active';
UPDATE "employees" SET "status" = CASE WHEN "isActive" THEN 'Active' ELSE 'Inactive' END;
ALTER TABLE "employees" DROP COLUMN "isActive";