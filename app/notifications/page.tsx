import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  getNotificationPreference,
  listNotifications,
} from "@/lib/notifications/repository";
import { listReports } from "@/lib/notifications/reports";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireChatGPTUser("/notifications");
  const [notifications, preference, reports] = await Promise.all([
    listNotifications(user.email),
    getNotificationPreference(user.email),
    listReports(user.email),
  ]);
  return (
    <NotificationsClient
      initialNotifications={notifications}
      initialPreference={preference}
      initialReports={reports}
    />
  );
}
