"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resetUserPasswordSchema, type ResetUserPasswordInput } from "../schemas/user.schema"
import { KeyRound, Eye, EyeOff, Lock } from "lucide-react"

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: {
    id: string
    name: string
    email: string
  } | null
  onConfirm: (memberId: string, input: ResetUserPasswordInput) => Promise<void>
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  member,
  onConfirm,
}: ResetPasswordDialogProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetUserPasswordInput>({
    resolver: zodResolver(resetUserPasswordSchema),
    defaultValues: {
      password: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({ password: "" })
      setShowPassword(false)
    }
  }, [open, reset])

  if (!member) return null

  const onSubmit = async (values: ResetUserPasswordInput) => {
    setIsSubmitting(true)
    try {
      await onConfirm(member.id, values)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs">
                Direct password override for {member.name} ({member.email})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-xs font-semibold block">
              New Password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 chars, 1 uppercase, 1 number"
                className="pr-10 text-xs"
                disabled={isSubmitting}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500 font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span>SuperAdmin Credential Override</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This action immediately updates the user's hashed password in the database. Share the new credentials securely with the team member.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
