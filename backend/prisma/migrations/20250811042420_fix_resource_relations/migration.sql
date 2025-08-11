/*
  Warnings:

  - You are about to drop the column `uploadedBy` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `uploadedById` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Resource" DROP COLUMN "uploadedBy",
ADD COLUMN     "uploadedById" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Resource" ADD CONSTRAINT "Resource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
