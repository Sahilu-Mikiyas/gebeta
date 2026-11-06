-- AlterTable
ALTER TABLE "Cafe" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "callsOn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "coverId" TEXT,
ADD COLUMN     "facebook" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fastingMode" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "instagram" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mapUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "orderingOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "planUntil" TIMESTAMP(3),
ADD COLUMN     "screenPortrait" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tableCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telegram" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tiktok" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "wifiName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "wifiPass" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "fromMin" INTEGER,
ADD COLUMN     "showOnScreen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "toMin" INTEGER;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "addons" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "libraryPhoto" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "variants" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "table" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CafeMember" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CafeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ResetCode" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLink" (
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "table" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT NOT NULL DEFAULT '',
    "total" INTEGER NOT NULL,
    "payMethod" TEXT,
    "payRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "addons" TEXT NOT NULL DEFAULT '',
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCall" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "ServiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Special" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 127,
    "fromMin" INTEGER NOT NULL DEFAULT 0,
    "toMin" INTEGER NOT NULL DEFAULT 1440,
    "labelEn" TEXT NOT NULL DEFAULT '',
    "labelAm" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Special_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "categoryId" TEXT,
    "percent" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemView" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "table" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeLog" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "undo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenSlide" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ScreenSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "ledColor" TEXT NOT NULL DEFAULT '',
    "total" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "payMethod" TEXT NOT NULL,
    "payRef" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPayment" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "payMethod" TEXT NOT NULL,
    "payRef" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CafeMember_cafeId_userId_key" ON "CafeMember"("cafeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "ResetCode_ownerId_idx" ON "ResetCode"("ownerId");

-- CreateIndex
CREATE INDEX "Order_cafeId_createdAt_idx" ON "Order"("cafeId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceCall_cafeId_createdAt_idx" ON "ServiceCall"("cafeId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceChange_cafeId_appliedAt_idx" ON "PriceChange"("cafeId", "appliedAt");

-- CreateIndex
CREATE INDEX "ItemView_cafeId_at_idx" ON "ItemView"("cafeId", "at");

-- CreateIndex
CREATE INDEX "Feedback_cafeId_createdAt_idx" ON "Feedback"("cafeId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeLog_cafeId_createdAt_idx" ON "ChangeLog"("cafeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_telegramChatId_key" ON "Owner"("telegramChatId");

-- AddForeignKey
ALTER TABLE "CafeMember" ADD CONSTRAINT "CafeMember_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeMember" ADD CONSTRAINT "CafeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResetCode" ADD CONSTRAINT "ResetCode_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCall" ADD CONSTRAINT "ServiceCall_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Special" ADD CONSTRAINT "Special_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Special" ADD CONSTRAINT "Special_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenSlide" ADD CONSTRAINT "ScreenSlide_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPayment" ADD CONSTRAINT "PlanPayment_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

