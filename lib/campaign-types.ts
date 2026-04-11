// Campaign & Notification Types (i-host SMS/Email features)

export type CampaignChannel = "sms" | "email" | "both";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";
export type NotificationType =
  | "reservation_confirmation"
  | "reservation_reminder"
  | "reservation_cancellation"
  | "waitlist_ready"
  | "loyalty_reward"
  | "birthday_greeting"
  | "winback"
  | "campaign";

export interface MessageTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: CampaignChannel;
  subject?: string;
  body: string;
  isActive: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  subject?: string;
  body: string;
  // Targeting
  targetAllCustomers: boolean;
  targetVipOnly: boolean;
  targetTags: string[];
  targetInactiveDays?: number;
  targetMinVisits?: number;
  // Schedule
  scheduledAt?: string;
  sentAt?: string;
  // Stats
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  createdBy?: string;
  createdAt: string;
}
