"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Phone,
  Mail,
  Users,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityCommunicationType } from "../types/activity.types";

export interface ActivityQuickLoggerProps {
  leadId?: string;
  customerId?: string;
  onActivityLogged?: () => void;
  className?: string;
}

const CHANNELS: {
  type: ActivityCommunicationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSubject: string;
  placeholder: string;
  outcomes?: { value: string; label: string }[];
}[] = [
  {
    type: "note",
    label: "Note",
    icon: FileText,
    defaultSubject: "Internal Note",
    placeholder: "Add internal notes, client updates, or key points...",
  },
  {
    type: "call",
    label: "Call",
    icon: Phone,
    defaultSubject: "Phone Call",
    placeholder: "Summarize call discussion, client requirements, or next steps...",
    outcomes: [
      { value: "connected", label: "Connected / Spoke with Client" },
      { value: "left_message", label: "Left Voicemail / Message" },
      { value: "no_answer", label: "No Answer" },
      { value: "busy", label: "Busy / Callback Requested" },
      { value: "wrong_number", label: "Wrong Number" },
    ],
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    defaultSubject: "Email Sent",
    placeholder: "Record email content or email exchange summary...",
    outcomes: [
      { value: "sent", label: "Sent" },
      { value: "delivered", label: "Delivered" },
      { value: "replied", label: "Client Replied" },
    ],
  },
  {
    type: "meeting",
    label: "Meeting",
    icon: Users,
    defaultSubject: "Client Meeting",
    placeholder: "Record meeting minutes, attendees, and key decisions...",
    outcomes: [
      { value: "held", label: "Meeting Held" },
      { value: "rescheduled", label: "Rescheduled" },
      { value: "cancelled", label: "Cancelled" },
      { value: "no_show", label: "Client No-show" },
    ],
  },
  {
    type: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    defaultSubject: "WhatsApp Message",
    placeholder: "Document WhatsApp discussion, shared details, or media references...",
    outcomes: [
      { value: "sent", label: "Sent" },
      { value: "delivered", label: "Delivered" },
      { value: "replied", label: "Client Replied" },
    ],
  },
];

export function ActivityQuickLogger({
  leadId,
  customerId,
  onActivityLogged,
  className,
}: ActivityQuickLoggerProps) {
  const [selectedType, setSelectedType] = React.useState<ActivityCommunicationType>("note");
  const [subject, setSubject] = React.useState<string>("Internal Note");
  const [description, setDescription] = React.useState<string>("");
  const [outcome, setOutcome] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const currentChannel = CHANNELS.find((c) => c.type === selectedType) || CHANNELS[0];

  // When switching channel tabs, update default subject and reset outcome
  const handleTypeChange = (newType: ActivityCommunicationType) => {
    setSelectedType(newType);
    const channel = CHANNELS.find((c) => c.type === newType);
    if (channel) {
      setSubject(channel.defaultSubject);
      setOutcome(channel.outcomes?.[0]?.value || "");
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("Please enter notes or description for this activity.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        leadId: leadId || undefined,
        customerId: customerId || undefined,
        type: selectedType,
        subject: subject.trim() || currentChannel.defaultSubject,
        description: description.trim(),
        outcome: outcome || undefined,
      };

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to log activity.");
      }

      // Reset form
      setDescription("");
      setSubject(currentChannel.defaultSubject);
      setSuccessMessage(`${currentChannel.label} logged successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);

      if (onActivityLogged) {
        onActivityLogged();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("bg-card border border-border rounded-xl shadow-xs overflow-hidden", className)}>
      {/* Channel Switcher Tabs */}
      <div className="flex items-center gap-1 p-2 bg-muted/40 border-b border-border overflow-x-auto no-scrollbar">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const isActive = selectedType === channel.type;
          return (
            <button
              key={channel.type}
              type="button"
              onClick={() => handleTypeChange(channel.type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer",
                isActive
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  isActive
                    ? channel.type === "call"
                      ? "text-amber-500"
                      : channel.type === "whatsapp"
                      ? "text-emerald-500"
                      : channel.type === "meeting"
                      ? "text-indigo-500"
                      : channel.type === "email"
                      ? "text-sky-500"
                      : "text-primary"
                    : "text-muted-foreground"
                )}
              />
              <span>{channel.label}</span>
            </button>
          );
        })}
      </div>

      {/* Logger Form */}
      <form onSubmit={handleSubmit} className="p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Subject
            </label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Discovery call recap"
              className="h-8 text-xs bg-background"
              maxLength={200}
            />
          </div>

          {currentChannel.outcomes && currentChannel.outcomes.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Outcome
              </label>
              <Select value={outcome} onValueChange={(val) => setOutcome(val ?? "")}>
                <SelectTrigger className="h-8 text-xs bg-background w-full">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {currentChannel.outcomes.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Details & Discussion Points
          </label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={currentChannel.placeholder}
            className="text-xs bg-background resize-y min-h-[75px]"
            maxLength={5000}
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-lg border border-destructive/20">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            Press <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded border border-border">Submit</kbd> to record in timeline
          </span>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !description.trim()}
            className="h-8 text-xs font-semibold px-4 cursor-pointer gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Logging...</span>
              </>
            ) : (
              <>
                <span>Log {currentChannel.label}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
