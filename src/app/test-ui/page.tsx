"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { UserPlus, AlertTriangle, Info } from "lucide-react"

// Import custom UI components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"

// Import custom shared components
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { SearchControl } from "@/components/shared/search-control"
import { FilterBar } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingState } from "@/components/shared/loading-state"
import { ErrorState } from "@/components/shared/error-state"
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog"
import { ModalForm } from "@/components/shared/modal-form"
import { DataTable, ColumnDef } from "@/components/shared/data-table"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Zod schema for testing Form
const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  role: z.string().min(1, "Please select a role."),
  subscribe: z.boolean(),
  notifications: z.boolean(),
  notes: z.string().optional(),
})

interface DummyLead {
  id: string
  name: string
  company: string
  stage: string
  priority: string
  revenue: number
}

const dummyLeads: DummyLead[] = [
  { id: "1", name: "Sarah Jenkins", company: "Acme Corp", stage: "won", priority: "high", revenue: 12500 },
  { id: "2", name: "David Miller", company: "Globex Inc", stage: "negotiation", priority: "medium", revenue: 8400 },
  { id: "3", name: "Emily Watson", company: "Initech", stage: "qualified", priority: "low", revenue: 4500 },
  { id: "4", name: "Michael Chang", company: "Umbrella Corp", stage: "contacted", priority: "high", revenue: 15000 },
  { id: "5", name: "Jessica Taylor", company: "Hooli", stage: "lost", priority: "low", revenue: 0 },
]

export default function TestUIPage() {
  const [searchValue, setSearchValue] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [tableLoading, setTableLoading] = React.useState(false)

  // Dialog triggers
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false)
  const [isFormSheetOpen, setIsFormSheetOpen] = React.useState(false)

  // DatePicker state
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "",
      subscribe: false,
      notifications: true,
      notes: "",
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    toast.add({
      title: "Form submitted successfully!",
      description: `Created lead for ${values.fullName}`,
      type: "success",
    })
    setIsFormModalOpen(false)
    setIsFormSheetOpen(false)
    form.reset()
  }

  // Handle table search / filter simulation
  const filteredLeads = dummyLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchValue.toLowerCase())
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter
    return matchesSearch && matchesStage
  })

  // Table Column Definitions
  const columns: ColumnDef<DummyLead>[] = [
    {
      key: "name",
      header: "Contact Name",
      render: (row) => (
        <div className="font-semibold text-foreground">{row.name}</div>
      ),
    },
    { key: "company", header: "Company" },
    {
      key: "stage",
      header: "Stage",
      render: (row) => <StatusBadge status={row.stage} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => <StatusBadge status={row.priority} />,
    },
    {
      key: "revenue",
      header: "Projected Revenue",
      align: "right",
      render: (row) => (
        <span className="font-semibold tabular-nums">
          {row.revenue > 0 ? `$${row.revenue.toLocaleString()}` : "—"}
        </span>
      ),
    },
  ]

  const handleResetFilters = () => {
    setSearchValue("")
    setStageFilter("all")
  }

  return (
    <TooltipProvider>
      <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/50">
        <PageHeader
          title="CRM Design System Gallery"
          description="Interactive playground showcasing custom shared UI components, form validation engines, and data tables."
          breadcrumbs={[
            { label: "Internal CRM", href: "#" },
            { label: "UI System", href: "#" },
            { label: "Component Gallery" },
          ]}
          actions={
            <>
              <Button variant="outline" onClick={() => setIsFormSheetOpen(true)}>
                Open Sheet Form
              </Button>
              <Button onClick={() => setIsFormModalOpen(true)}>
                <UserPlus className="h-4 w-4" />
                <span>Add Record</span>
              </Button>
            </>
          }
        />

        <div className="max-w-7xl mx-auto p-6 space-y-8">
          <Tabs defaultValue="components" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-zinc-200/55 dark:bg-zinc-900/50 p-1 rounded-lg">
              <TabsTrigger value="components">Core UI</TabsTrigger>
              <TabsTrigger value="datatable">Data Table</TabsTrigger>
              <TabsTrigger value="states">Layout States</TabsTrigger>
            </TabsList>

            {/* CORE COMPONENTS TAB */}
            <TabsContent value="components" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Inputs & Fields Card */}
                <Card className="shadow-xs border-border dark:border-input/10">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Form Inputs</CardTitle>
                    <CardDescription>Base inputs and interactive elements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Standard Input
                      </label>
                      <Input placeholder="Enter username..." />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Textarea
                      </label>
                      <Textarea placeholder="Enter detailed notes..." />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">
                        Date Picker
                      </label>
                      <DatePicker date={selectedDate} setDate={setSelectedDate} />
                    </div>
                  </CardContent>
                </Card>

                {/* Selection Controls */}
                <Card className="shadow-xs border-border dark:border-input/10">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Toggles & Selection</CardTitle>
                    <CardDescription>Checkboxes, switches, and badges</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Checkbox id="terms" />
                      <label htmlFor="terms" className="text-sm font-medium text-foreground cursor-pointer select-none">
                        Accept user agreement
                      </label>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border/80 p-3 bg-muted/10 dark:border-input/10">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground">Dark mode theme</div>
                        <div className="text-xs text-muted-foreground">Toggle application theme preference</div>
                      </div>
                      <Switch />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                        CRM Status Badges
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status="active" />
                        <StatusBadge status="suspended" />
                        <StatusBadge status="won" />
                        <StatusBadge status="lost" />
                        <StatusBadge status="new" />
                        <StatusBadge status="pending" />
                        <StatusBadge status="inactive" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Overlays & Interactive */}
                <Card className="shadow-xs border-border dark:border-input/10">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Overlays & Alerts</CardTitle>
                    <CardDescription>Tooltips, confirmations, and alerts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="outline" size="sm">Hover Tooltip</Button>} />
                        <TooltipContent>
                          This is a premium floating tooltip message.
                        </TooltipContent>
                      </Tooltip>

                      <Button variant="destructive" size="sm" onClick={() => setIsConfirmOpen(true)}>
                        Trigger Alert
                      </Button>
                    </div>

                    <Alert className="bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-200 dark:border-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <AlertTitle className="font-semibold text-sm">System Update</AlertTitle>
                      <AlertDescription className="text-xs mt-1">
                        Database migration scheduled for tonight.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* DATA TABLE TAB */}
            <TabsContent value="datatable" className="space-y-4">
              <Card className="border-border dark:border-input/10 shadow-xs">
                <FilterBar showReset={searchValue !== "" || stageFilter !== "all"} onReset={handleResetFilters}>
                  <SearchControl
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Search by name or company..."
                  />

                  {/* Stage filter control using native select styled wrapper */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Stage:</span>
                    <select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-sm font-medium focus:border-ring focus:outline-hidden dark:bg-zinc-950 dark:border-input/20"
                    >
                      <option value="all">All Stages</option>
                      <option value="won">Won</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="qualified">Qualified</option>
                      <option value="contacted">Contacted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTableLoading(true)
                      setTimeout(() => setTableLoading(false), 1200)
                    }}
                    className="h-8 text-xs font-semibold"
                  >
                    Simulate Load
                  </Button>
                </FilterBar>

                <DataTable
                  columns={columns}
                  data={filteredLeads}
                  isLoading={tableLoading}
                  currentPage={currentPage}
                  totalPages={3}
                  onPageChange={setCurrentPage}
                  onRowClick={(row) => {
                    toast.add({
                      title: "Lead Row Clicked",
                      description: `${row.name} at ${row.company}`,
                      type: "info",
                    })
                  }}
                  emptyTitle="No Leads Found"
                  emptyDescription="No lead matching the criteria. Try updating your filters or search terms."
                />
              </Card>
            </TabsContent>

            {/* LAYOUT STATES TAB */}
            <TabsContent value="states" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Empty State */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Empty State Component</span>
                  <EmptyState
                    title="No follow-ups scheduled"
                    description="Keep your sales momentum going. Schedule a callback, follow-up call, or drop-in email today."
                    icon={Info}
                    actionLabel="Schedule Follow-up"
                    onAction={() => {
                      toast.add({
                        title: "Follow-up triggered",
                        description: "Initializing followup dialog launcher.",
                        type: "info",
                      })
                    }}
                  />
                </div>

                {/* Error State */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Error State Component</span>
                  <ErrorState
                    error={new Error("Database write locked or network handshake timed out.")}
                    onRetry={() => {
                      toast.add({
                        title: "Re-establishing connection...",
                        type: "loading",
                      })
                    }}
                  />
                </div>
              </div>

              {/* Skeletons */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Table Skeleton</span>
                  <div className="border border-border rounded-xl bg-background dark:border-input/10">
                    <LoadingState type="table" count={3} />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Cards Skeleton</span>
                  <div className="border border-border rounded-xl bg-background dark:border-input/10">
                    <LoadingState type="cards" count={2} />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Form Skeleton</span>
                  <div className="border border-border rounded-xl bg-background dark:border-input/10">
                    <LoadingState type="form" count={2} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Confirmation Dialog Component */}
        <ConfirmationDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Deactivate Team Member Account?"
          description="Deactivating this user will revoke access to all company leads, client schedules, and payment history. You can reactivate this account later."
          confirmLabel="Deactivate Account"
          variant="destructive"
          onConfirm={() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                toast.add({
                  title: "User deactivation success",
                  description: "Account was set to inactive status.",
                  type: "success",
                })
                resolve()
              }, 1500)
            })
          }}
        />

        {/* Modal Form Wrapper (Dialog form) */}
        <ModalForm
          type="dialog"
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          title="Add New Sales Lead"
          description="Enter lead details to assign a sales manager and initiate the sales pipeline."
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Segment</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm font-medium focus:border-ring focus:outline-hidden dark:bg-zinc-950 dark:border-input/20"
                      >
                        <option value="">Select a segment...</option>
                        <option value="enterprise">Enterprise Sales</option>
                        <option value="midmarket">Mid-Market</option>
                        <option value="smb">SMB Sales</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3.5 border-t border-border pt-4 dark:border-input/10">
                <FormField
                  control={form.control}
                  name="subscribe"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel>Send intro proposal email</FormLabel>
                        <FormDescription>Automatically email product overview PDF.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-input/10">
                <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Lead</Button>
              </div>
            </form>
          </Form>
        </ModalForm>

        {/* Modal Form Wrapper (Sheet form) */}
        <ModalForm
          type="sheet"
          open={isFormSheetOpen}
          onOpenChange={setIsFormSheetOpen}
          title="Account Settings"
          description="Update your notification settings and preference parameters."
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border/80 p-3 bg-muted/10 dark:border-input/10">
                    <div className="space-y-0.5">
                      <FormLabel>Email Notifications</FormLabel>
                      <FormDescription>Receive updates for lead conversions.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Bio Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Write a short description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2.5 pt-4">
                <Button type="submit" className="w-full">Save Account Details</Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setIsFormSheetOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </ModalForm>
      </div>
    </TooltipProvider>
  )
}
