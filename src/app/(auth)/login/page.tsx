"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, X } from "lucide-react"

const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [showForgotPasswordNotice, setShowForgotPasswordNotice] = React.useState<boolean>(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await login(values.email, values.password)
      router.push("/dashboard")
    } catch (error: any) {
      setErrorMsg(error.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4 select-none">
      <div className="w-full max-w-[400px] animate-in fade-in duration-300">

        {/* Main Custom Login Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

          {/* Card body content */}
          <div className="p-8 space-y-6">

            {/* Top Brand Badge */}
            <div className="flex justify-center">
              <div className="rounded-lg bg-neutral-950 px-4 py-1.5 border border-neutral-800">
                <span className="text-sm font-extrabold tracking-wider text-neutral-100 uppercase">
                  AHS CRM
                </span>
              </div>
            </div>

            {/* Headers */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Sign In
              </h2>
              <p className="text-neutral-400 text-sm">
                Enter your credentials to access the sales platform
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <Alert variant="destructive" className="bg-red-950/40 border-red-900/50 text-red-200 py-3 rounded-lg animate-in shake duration-200">
                <AlertDescription className="text-xs font-semibold">{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Forgot Password Notice Alert */}
            {showForgotPasswordNotice && (
              <div className="bg-blue-950/40 border border-blue-800/60 text-blue-200 p-3.5 rounded-lg text-xs animate-in fade-in slide-in-from-top-2 duration-200 relative flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-blue-100">Forgot Password?</p>
                  <p className="text-blue-300/90 leading-relaxed font-medium">
                    Contact Admin To change the password. Password management is handled centrally by Admin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordNotice(false)}
                  className="text-blue-400 hover:text-blue-200 transition-colors p-0.5"
                  aria-label="Close notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-200 block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@ahs-crm.com"
                  disabled={isSubmitting}
                  className="w-full bg-neutral-800/40 border border-neutral-800 text-neutral-100 placeholder-neutral-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                  {...register("email")}
                />
                {errors.email && (
                  <span className="text-xs text-red-400 block mt-1">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-neutral-200 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordNotice(true)}
                    className="text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none focus:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full bg-neutral-800/40 border border-neutral-800 text-neutral-100 placeholder-neutral-650 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400 transition-all duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                  {...register("password")}
                />
                {errors.password && (
                  <span className="text-xs text-red-400 block mt-1">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-950 font-bold py-3 rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-neutral-950"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Integrated Solid Lighter Gray Footer */}
          <div className="bg-neutral-800 border-t border-neutral-800/60 px-6 py-5 text-center">
            <p className="text-xs text-neutral-400 font-medium tracking-wide leading-relaxed">
              Internal authorized access only. Unauthorized activities are logged.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
