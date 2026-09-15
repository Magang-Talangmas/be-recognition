CREATE TABLE IF NOT EXISTS "employee_embeddings" (
    "employee_id" TEXT NOT NULL,
    "fused_embedding" DOUBLE PRECISION[] NOT NULL,
    "source_photo_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_embeddings_pkey" PRIMARY KEY ("employee_id")
);
