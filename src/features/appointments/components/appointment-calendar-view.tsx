"use client";

import * as React from "react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MapPin, User, Clock, Phone, Calendar as CalendarIcon } from "lucide-react";
import type { CalendarEvent } from "../types/appointment.types";
import type { CalendarSubView } from "./appointment-filters";

interface AppointmentCalendarViewProps {
  events: CalendarEvent[];
  subView: CalendarSubView;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function AppointmentCalendarView({
  events,
  subView,
  onSelectEvent,
}: AppointmentCalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());

  const handlePrev = () => {
    if (subView === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (subView === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };

  const handleNext = () => {
    if (subView === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (subView === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-card border border-border dark:border-input/10 rounded-lg p-4 shadow-2xs">
      {/* Calendar Header / Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-medium">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-base font-semibold text-foreground ml-2">
            {subView === "month" && format(currentDate, "MMMM yyyy")}
            {subView === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
            {subView === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
            {subView === "agenda" && "Upcoming Schedule Agenda"}
          </h2>
        </div>
      </div>

      {/* View Renderers */}
      {subView === "month" && (
        <MonthView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />
      )}
      {subView === "week" && (
        <WeekView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />
      )}
      {subView === "day" && (
        <DayView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />
      )}
      {subView === "agenda" && <AgendaView events={events} onSelectEvent={onSelectEvent} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// Month View Component
// ----------------------------------------------------------------------
function MonthView({
  currentDate,
  events,
  onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full">
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2 mb-1">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 auto-rows-fr gap-1 bg-muted/20 p-1 rounded-md border border-border/40 min-h-[500px]">
        {days.map((day, idx) => {
          const dayEvents = events.filter((ev) => isSameDay(ev.startTime, day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);

          return (
            <div
              key={idx}
              className={`min-h-[90px] p-1.5 rounded bg-card border border-border/40 flex flex-col transition-colors ${
                !isCurrentMonth ? "opacity-40 bg-muted/10" : ""
              } ${isTodayDate ? "ring-2 ring-primary/80 bg-primary/5" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    isTodayDate
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 rounded">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Events list preview */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-none">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className={`w-full text-left text-[10px] p-1 rounded font-medium truncate flex items-center gap-1 transition-all ${
                      event.eventType === "appointment"
                        ? "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 hover:bg-blue-200"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        event.eventType === "appointment" ? "bg-blue-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="truncate">{event.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[9px] text-muted-foreground font-medium pl-1">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Week View Component
// ----------------------------------------------------------------------
function WeekView({
  currentDate,
  events,
  onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 min-h-[450px]">
      {days.map((day, idx) => {
        const dayEvents = events.filter((ev) => isSameDay(ev.startTime, day));
        const isTodayDate = isToday(day);

        return (
          <div
            key={idx}
            className={`border border-border/60 rounded-md p-2 bg-card flex flex-col ${
              isTodayDate ? "ring-2 ring-primary/80 bg-primary/5" : ""
            }`}
          >
            <div className="text-center pb-2 mb-2 border-b border-border/40">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                {format(day, "EEE")}
              </p>
              <p className={`text-sm font-bold mt-0.5 ${isTodayDate ? "text-primary" : "text-foreground"}`}>
                {format(day, "MMM d")}
              </p>
            </div>

            <div className="flex-1 space-y-1.5">
              {dayEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 text-center italic py-4">No events</p>
              ) : (
                dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className={`p-1.5 rounded border text-xs cursor-pointer transition-all hover:shadow-2xs ${
                      event.eventType === "appointment"
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200"
                        : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[11px] truncate">{event.title}</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 border-current uppercase font-medium"
                      >
                        {event.eventType}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {format(event.startTime, "h:mm a")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// Day View Component
// ----------------------------------------------------------------------
function DayView({
  currentDate,
  events,
  onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const dayEvents = events.filter((ev) => isSameDay(ev.startTime, currentDate));

  return (
    <div className="space-y-3 min-h-[400px]">
      {dayEvents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-md bg-muted/10">
          <CalendarIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No events scheduled for this day</p>
        </div>
      ) : (
        dayEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className="p-3 rounded-lg border border-border/80 bg-card hover:bg-muted/30 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    event.eventType === "appointment"
                      ? "bg-blue-500 text-white"
                      : "bg-amber-500 text-white"
                  }
                >
                  {event.eventType === "appointment" ? "Appointment" : "Follow-up"}
                </Badge>
                <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(event.startTime, "h:mm a")} - {format(event.endTime, "h:mm a")}
              </p>
              {event.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  {event.location}
                </p>
              )}
            </div>

            <div className="text-right text-xs">
              <div className="font-medium text-foreground">{event.assignedToName}</div>
              <div className="text-muted-foreground text-[11px] capitalize">{event.status}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Agenda View Component
// ----------------------------------------------------------------------
function AgendaView({
  events,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-md bg-muted/10">
        <CalendarIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No upcoming agenda events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div
          key={event.id}
          onClick={() => onSelectEvent(event)}
          className="p-3.5 rounded-lg border border-border/80 bg-card hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg text-xs font-bold flex flex-col items-center justify-center min-w-[55px] ${
                event.eventType === "appointment"
                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300"
              }`}
            >
              <span className="uppercase text-[9px] font-semibold">{format(event.startTime, "MMM")}</span>
              <span className="text-base leading-none">{format(event.startTime, "d")}</span>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(event.startTime, "h:mm a")}
                </span>
                {event.leadName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {event.leadName}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-xs">
              {event.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
