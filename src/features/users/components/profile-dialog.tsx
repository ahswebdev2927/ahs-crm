"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Shield, Building2, Key, ShieldAlert } from "lucide-react"

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    name: string
    email: string
    roleName: string
    roleCode: string
    avatarUrl?: string
  }
}

export function ProfileDialog({ open, onOpenChange, user }: ProfileDialogProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-base flex items-center justify-center border border-primary/20 shrink-0">
              {initials}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {user.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Logged-in Staff Profile & Account Security Policy
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Full Name
              </span>
              <p className="font-semibold text-foreground">{user.name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email Address
              </span>
              <p className="font-semibold text-foreground truncate">{user.email}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Department
              </span>
              <p className="font-semibold text-foreground">Sales Department</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Position / Sub-Role
              </span>
              <div>
                <Badge variant="outline" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
                  {user.roleName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Security & Password Management Card */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-xs">Security & Password Management</h4>
                <p className="text-[11px] text-muted-foreground">Centralized access policy for team member credentials</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Password Changes are Managed Centrally</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-95">
                Only CRM SuperAdmins can issue or reset passwords for team members. Self-service password changing is disabled to ensure organizational security compliance. If you require a password reset, please contact your SuperAdmin.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
