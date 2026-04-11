"use client";

import { useState } from "react";
import { usePOS } from "@/lib/pos-context";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Mail,
  Send,
  Plus,
  Users,
  Star,
  Clock,
  CalendarDays,
  Heart,
  Gift,
  UserMinus,
  Target,
  FileText,
} from "lucide-react";
import type { Campaign, CampaignChannel, MessageTemplate, NotificationType } from "@/lib/campaign-types";
import { generateId } from "@/lib/mock-data";

// Initial templates matching the seed data
const defaultTemplates: MessageTemplate[] = [
  {
    id: "tpl-1", name: "Επιβεβαίωση Κράτησης SMS", type: "reservation_confirmation",
    channel: "sms", body: "Μαύρη Θάλασσα: Η κράτησή σας για {date} στις {time} ({guests} άτομα) επιβεβαιώθηκε. Τηλ: 2310-XXX-XXX",
    isActive: true, createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-2", name: "Υπενθύμιση Κράτησης", type: "reservation_reminder",
    channel: "sms", body: "Μαύρη Θάλασσα: Υπενθύμιση για την κράτησή σας σήμερα στις {time} ({guests} άτομα). Σας περιμένουμε!",
    isActive: true, createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-3", name: "Γενέθλια", type: "birthday_greeting",
    channel: "sms", body: "Χρόνια πολλά {guest_name}! Η Μαύρη Θάλασσα σας εύχεται υγεία & χαρά. Σας περιμένουμε με μια έκπληξη!",
    isActive: true, createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-4", name: "Win-back", type: "winback",
    channel: "sms", body: "Μας λείψατε {guest_name}! Η Μαύρη Θάλασσα σας περιμένει. Κλείστε τραπέζι: 2310-XXX-XXX",
    isActive: true, createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-5", name: "Τραπέζι Έτοιμο (Waitlist)", type: "waitlist_ready",
    channel: "sms", body: "Μαύρη Θάλασσα: Το τραπέζι σας είναι έτοιμο! Παρακαλώ προσέλθετε στην υποδοχή.",
    isActive: true, createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-6", name: "Loyalty Reward", type: "loyalty_reward",
    channel: "sms", body: "Συγχαρητήρια {guest_name}! Κερδίσατε δώρο αξίας {reward_value}€ στη Μαύρη Θάλασσα!",
    isActive: true, createdAt: new Date().toISOString(),
  },
];

const TYPE_LABELS: Record<NotificationType, string> = {
  reservation_confirmation: "Επιβεβαίωση",
  reservation_reminder: "Υπενθύμιση",
  reservation_cancellation: "Ακύρωση",
  waitlist_ready: "Waitlist",
  loyalty_reward: "Loyalty",
  birthday_greeting: "Γενέθλια",
  winback: "Win-back",
  campaign: "Καμπάνια",
};

export default function CampaignsPage() {
  const { state } = usePOS();
  const { customers, getVipCustomers, getUpcomingBirthdays } = useCustomers();

  const [templates] = useState<MessageTemplate[]>(defaultTemplates);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // New campaign form
  const [campName, setCampName] = useState("");
  const [campChannel, setCampChannel] = useState<CampaignChannel>("sms");
  const [campBody, setCampBody] = useState("");
  const [campSubject, setCampSubject] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [targetVip, setTargetVip] = useState(false);
  const [targetInactiveDays, setTargetInactiveDays] = useState<number | undefined>();

  const vipCount = getVipCustomers().length;
  const birthdayCount = getUpcomingBirthdays(7).length;
  const totalCustomers = customers.length;
  const customersWithPhone = customers.filter((c) => c.phone).length;

  const calculateRecipients = (): number => {
    if (targetVip) return vipCount;
    if (targetAll) return customersWithPhone;
    return 0;
  };

  const handleCreateCampaign = () => {
    if (!campName.trim() || !campBody.trim()) return;
    const campaign: Campaign = {
      id: generateId(),
      name: campName,
      channel: campChannel,
      status: "draft",
      subject: campSubject || undefined,
      body: campBody,
      targetAllCustomers: targetAll,
      targetVipOnly: targetVip,
      targetTags: [],
      totalRecipients: calculateRecipients(),
      deliveredCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCampaigns([campaign, ...campaigns]);
    setCampName("");
    setCampBody("");
    setCampSubject("");
    setTargetAll(true);
    setTargetVip(false);
    setCreateOpen(false);
  };

  const sendCampaign = (id: string) => {
    setCampaigns(campaigns.map((c) =>
      c.id === id
        ? { ...c, status: "sent" as const, sentAt: new Date().toISOString(), deliveredCount: c.totalRecipients }
        : c,
    ));
  };

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-24 rounded-xl" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Καμπάνιες</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SMS & Email marketing στους πελάτες σας
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Νέα Καμπάνια
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{customersWithPhone}</p>
              <p className="text-xs text-muted-foreground">Πελάτες με τηλ.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Star className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vipCount}</p>
              <p className="text-xs text-muted-foreground">VIP Πελάτες</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-pink-500/10">
              <Gift className="size-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{birthdayCount}</p>
              <p className="text-xs text-muted-foreground">Γενέθλια 7 ημ.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
              <Send className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{campaigns.filter((c) => c.status === "sent").length}</p>
              <p className="text-xs text-muted-foreground">Απεσταλμένες</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Καμπάνιες</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="quick">Γρήγορη Αποστολή</TabsTrigger>
        </TabsList>

        {/* Campaigns list */}
        <TabsContent value="campaigns" className="mt-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="mb-3 size-10 text-muted-foreground" />
                <p className="text-lg font-medium">Δεν υπάρχουν καμπάνιες</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Δημιουργήστε μια καμπάνια για να ξεκινήσετε
                </p>
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Νέα Καμπάνια
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.name}</span>
                        <Badge variant={c.status === "sent" ? "default" : c.status === "draft" ? "outline" : "secondary"}>
                          {c.status === "draft" ? "Πρόχειρο" : c.status === "sent" ? "Απεστάλη" : c.status}
                        </Badge>
                        <Badge variant="outline">
                          {c.channel === "sms" ? "SMS" : c.channel === "email" ? "Email" : "SMS+Email"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{c.body}</p>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span><Target className="mr-0.5 inline size-3" />{c.totalRecipients} παραλήπτες</span>
                        {c.sentAt && <span><Clock className="mr-0.5 inline size-3" />{new Date(c.sentAt).toLocaleDateString("el-GR")}</span>}
                        {c.status === "sent" && <span><Send className="mr-0.5 inline size-3" />{c.deliveredCount} delivered</span>}
                      </div>
                    </div>
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => sendCampaign(c.id)}>
                        <Send className="mr-1 size-3" />
                        Αποστολή
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[t.type]}</Badge>
                      <Badge variant="secondary" className="text-xs">{t.channel.toUpperCase()}</Badge>
                    </div>
                    <Switch checked={t.isActive} />
                  </div>
                  <h3 className="mt-2 font-medium">{t.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Quick Send */}
        <TabsContent value="quick" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => {
              setCampName("Γενέθλια - " + new Date().toLocaleDateString("el-GR"));
              setCampBody("Χρόνια πολλά {guest_name}! Η Μαύρη Θάλασσα σας εύχεται υγεία & χαρά. Σας περιμένουμε με μια έκπληξη!");
              setTargetAll(false);
              setCreateOpen(true);
            }}>
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                <Gift className="size-8 text-pink-500" />
                <h3 className="font-semibold">Γενέθλια</h3>
                <p className="text-sm text-muted-foreground">
                  {birthdayCount} πελάτες με γενέθλια τις επόμενες 7 μέρες
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => {
              setCampName("Win-back - " + new Date().toLocaleDateString("el-GR"));
              setCampBody("Μας λείψατε {guest_name}! Η Μαύρη Θάλασσα σας περιμένει. Κλείστε τραπέζι: 2310-XXX-XXX");
              setTargetAll(false);
              setTargetInactiveDays(30);
              setCreateOpen(true);
            }}>
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                <UserMinus className="size-8 text-amber-500" />
                <h3 className="font-semibold">Win-back</h3>
                <p className="text-sm text-muted-foreground">
                  Ανενεργοί πελάτες 30+ ημέρες
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => {
              setCampName("VIP Special - " + new Date().toLocaleDateString("el-GR"));
              setCampBody("Αγαπητέ {guest_name}, ως VIP πελάτης σας προσκαλούμε σε αποκλειστικό δείπνο! Κράτηση: 2310-XXX-XXX");
              setTargetVip(true);
              setTargetAll(false);
              setCreateOpen(true);
            }}>
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                <Star className="size-8 text-amber-500" />
                <h3 className="font-semibold">VIP Special</h3>
                <p className="text-sm text-muted-foreground">
                  {vipCount} VIP πελάτες
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Νέα Καμπάνια</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Όνομα καμπάνιας</Label>
              <Input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="π.χ. Προσφορά Σαββατοκύριακου" />
            </div>
            <div>
              <Label>Κανάλι</Label>
              <Select value={campChannel} onValueChange={(v) => setCampChannel(v as CampaignChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">SMS + Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(campChannel === "email" || campChannel === "both") && (
              <div>
                <Label>Θέμα Email</Label>
                <Input value={campSubject} onChange={(e) => setCampSubject(e.target.value)} placeholder="Θέμα email..." />
              </div>
            )}
            <div>
              <Label>Μήνυμα</Label>
              <Textarea value={campBody} onChange={(e) => setCampBody(e.target.value)} rows={4}
                placeholder="Γράψτε το μήνυμα. Χρησιμοποιήστε {guest_name} για προσωποποίηση..." />
              <p className="mt-1 text-xs text-muted-foreground">
                Placeholders: {"{guest_name}"}, {"{restaurant}"}, {"{date}"}, {"{time}"}
              </p>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="flex items-center gap-1"><Target className="size-3" /> Targeting</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Όλοι οι πελάτες</span>
                <Switch checked={targetAll} onCheckedChange={(v) => { setTargetAll(v); if (v) setTargetVip(false); }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Μόνο VIP</span>
                <Switch checked={targetVip} onCheckedChange={(v) => { setTargetVip(v); if (v) setTargetAll(false); }} />
              </div>
              <p className="text-sm font-medium text-primary">
                {calculateRecipients()} παραλήπτες
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Ακύρωση</Button>
              <Button onClick={handleCreateCampaign} disabled={!campName.trim() || !campBody.trim()}>
                Δημιουργία
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
