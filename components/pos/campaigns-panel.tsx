"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Mail,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  subject: string | null;
  target_all_customers: boolean | null;
  target_vip_only: boolean | null;
  total_recipients: number | null;
  delivered_count: number | null;
  failed_count: number | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject: string | null;
  body: string | null;
  is_active: boolean;
  created_at: string;
}

interface CampaignsPanelProps {
  campaigns: Campaign[];
  templates: MessageTemplate[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Πρόχειρο",
    className: "bg-gray-100 text-gray-700",
    icon: <FileText className="size-3" />,
  },
  scheduled: {
    label: "Προγραμματισμένη",
    className: "bg-blue-100 text-blue-700",
    icon: <Clock className="size-3" />,
  },
  sending: {
    label: "Αποστολή",
    className: "bg-amber-100 text-amber-700",
    icon: <Send className="size-3" />,
  },
  sent: {
    label: "Απεσταλμένη",
    className: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="size-3" />,
  },
  failed: {
    label: "Αποτυχία",
    className: "bg-red-100 text-red-700",
    icon: <XCircle className="size-3" />,
  },
};

const CHANNEL_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  sms: {
    label: "SMS",
    className: "bg-purple-100 text-purple-700",
    icon: <MessageSquare className="size-3" />,
  },
  email: {
    label: "Email",
    className: "bg-blue-100 text-blue-700",
    icon: <Mail className="size-3" />,
  },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveTargetLabel(campaign: Campaign): string {
  if (campaign.target_all_customers) return "Όλοι οι πελάτες";
  if (campaign.target_vip_only) return "Μόνο VIP";
  return "Επιλεγμένοι πελάτες";
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const status = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const channel = CHANNEL_CONFIG[campaign.channel] ?? CHANNEL_CONFIG.sms;
  const isSent = campaign.status === "sent";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{campaign.name}</p>
              {campaign.subject && (
                <p className="truncate text-sm text-muted-foreground">
                  {campaign.subject}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${channel.className}`}
              >
                {channel.icon}
                {channel.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{resolveTargetLabel(campaign)}</span>
            {campaign.total_recipients != null && (
              <span>{campaign.total_recipients} παραλήπτες</span>
            )}
            {campaign.scheduled_at && !isSent && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatDate(campaign.scheduled_at)}
              </span>
            )}
            {isSent && campaign.sent_at && (
              <span className="flex items-center gap-1">
                <Send className="size-3" />
                {formatDate(campaign.sent_at)}
              </span>
            )}
          </div>

          {isSent &&
            (campaign.delivered_count != null ||
              campaign.failed_count != null) && (
              <div className="flex gap-3 text-xs">
                {campaign.delivered_count != null && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="size-3" />
                    {campaign.delivered_count} παραδόθηκαν
                  </span>
                )}
                {campaign.failed_count != null && campaign.failed_count > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="size-3" />
                    {campaign.failed_count} απέτυχαν
                  </span>
                )}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCard({ template }: { template: MessageTemplate }) {
  const channel = CHANNEL_CONFIG[template.channel] ?? CHANNEL_CONFIG.sms;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium">{template.name}</p>
            <div className="flex shrink-0 gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${channel.className}`}
              >
                {channel.icon}
                {channel.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  template.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {template.is_active ? "Ενεργό" : "Ανενεργό"}
              </span>
            </div>
          </div>

          {template.subject && (
            <p className="truncate text-sm text-muted-foreground">
              {template.subject}
            </p>
          )}

          {template.body && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {template.body}
            </p>
          )}

          <Badge variant="outline" className="w-fit text-xs capitalize">
            {template.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignsPanel({ campaigns, templates }: CampaignsPanelProps) {
  return (
    <Tabs defaultValue="campaigns">
      <TabsList>
        <TabsTrigger value="campaigns">Καμπάνιες</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>

      <TabsContent value="campaigns" className="mt-4 space-y-3">
        <Card>
          <CardContent className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" />Η δημιουργία καμπανιών θα είναι
            διαθέσιμη σύντομα
          </CardContent>
        </Card>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Send className="mb-4 size-10 opacity-30" />
              <p>Δεν υπάρχουν καμπάνιες ακόμα</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="templates" className="mt-4 space-y-3">
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" />
              {templates.length} templates
            </CardTitle>
          </CardHeader>
        </Card>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-4 size-10 opacity-30" />
              <p>Δεν υπάρχουν templates ακόμα</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
