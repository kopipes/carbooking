/*
  Warnings:

  - Added the required column `email` to the `MeetingParticipant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `MeetingParticipant` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MeetingParticipant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meetingBookingId" INTEGER NOT NULL,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingParticipant_meetingBookingId_fkey" FOREIGN KEY ("meetingBookingId") REFERENCES "MeetingBooking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MeetingParticipant" ("createdAt", "id", "meetingBookingId", "userId") SELECT "createdAt", "id", "meetingBookingId", "userId" FROM "MeetingParticipant";
DROP TABLE "MeetingParticipant";
ALTER TABLE "new_MeetingParticipant" RENAME TO "MeetingParticipant";
CREATE UNIQUE INDEX "MeetingParticipant_meetingBookingId_email_key" ON "MeetingParticipant"("meetingBookingId", "email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
