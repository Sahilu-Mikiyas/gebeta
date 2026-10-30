-- AlterTable
ALTER TABLE "Cafe" ADD COLUMN     "screenLang" TEXT NOT NULL DEFAULT 'both',
ADD COLUMN     "screenSeconds" INTEGER NOT NULL DEFAULT 10;
