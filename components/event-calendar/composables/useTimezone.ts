import { computed, ref, type ComputedRef } from "vue"
import { format } from "date-fns"
import { TZDate, tz } from "@date-fns/tz"
import type { CalendarEvent } from "../types"
import { getLocalTimeZone } from "@internationalized/date"

export interface TimezoneInfo {
  timezone: string
  label: string
  offset: string
  isLocal?: boolean
}

function getCommonTimezones(): TimezoneInfo[] {
  const commonTimezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Pacific/Auckland",
    "UTC",
  ]

  const now = new Date()

  return commonTimezones.map(timezone => {
    // Get current offset for this timezone
    const offsetMinutes =
      -new Date().getTimezoneOffset() +
      (new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime() -
        new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) /
        (1000 * 60)

    const hours = Math.floor(Math.abs(offsetMinutes) / 60)
    const minutes = Math.abs(offsetMinutes) % 60
    const sign = offsetMinutes >= 0 ? "+" : "-"
    const offset = `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

    // Create human-readable label
    const parts = timezone.split("/")
    const city = parts[parts.length - 1]?.replace(/_/g, " ")
    const region = parts[0] === "America" ? "Americas" : parts[0]

    return {
      timezone,
      label: `${city} (${region})`,
      offset,
    }
  })
}

function getAllTimezones(): TimezoneInfo[] {
  try {
    const timezones = Intl.supportedValuesOf("timeZone")
    const now = new Date()

    return timezones
      .map(timezone => {
        try {
          // Use Intl.DateTimeFormat to get proper offset
          const offsetFormat = new Intl.DateTimeFormat("en", {
            timeZone: timezone,
            timeZoneName: "longOffset",
          })

          const offsetParts = offsetFormat.formatToParts(now)
          const offsetString = offsetParts.find(part => part.type === "timeZoneName")?.value || "GMT+00:00"

          // Create readable label
          const parts = timezone.split("/")
          const city = parts[parts.length - 1]?.replace(/_/g, " ")
          const region = parts.length > 1 ? parts[0] : "Other"

          return {
            timezone,
            label: `${city} (${region})`,
            offset: offsetString,
          }
        } catch (error) {
          // Fallback for problematic timezones
          return {
            timezone,
            label: timezone.replace(/_/g, " "),
            offset: "GMT+00:00",
          }
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch (error) {
    // Fallback to common timezones if Intl.supportedValuesOf is not available
    console.warn("Intl.supportedValuesOf not available, using fallback timezones")
    return getCommonTimezones()
  }
}

function getTimezonesWithLocal(): TimezoneInfo[] {
  const timezones = getAllTimezones() // Using method 4 above
  const localTz = getLocalTimeZone()

  return timezones.map(tz => ({
    ...tz,
    isLocal: tz.timezone === localTz,
  }))
}

export function useTimezone(userTimezone = ref<string>("")) {
  // Common timezones for the dropdown
  const commonTimezones: TimezoneInfo[] = getTimezonesWithLocal()

  // Detect user's timezone
  const detectUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
      return "UTC"
    }
  }

  // Initialize with detected timezone if not provided
  if (!userTimezone.value) {
    userTimezone.value = detectUserTimezone()
  }

  // Get current timezone info
  const currentTimezoneInfo = computed(() => {
    const tz = userTimezone.value
    const found = commonTimezones.find(t => t.timezone === tz)
    if (found) return found

    // If not in common list, create info for current timezone
    return {
      timezone: tz,
      label: tz.replace(/_/g, " "),
      offset: getTimezoneOffset(tz),
    }
  })

  // Convert date to user's timezone
  const toUserTimezone = (date: Date, timezone?: string) => {
    const targetTimezone = timezone || userTimezone.value
    try {
      return new TZDate(date, targetTimezone)
    } catch {
      return date // Fallback to original date
    }
  }

  // Convert date from user's timezone to UTC
  const fromUserTimezone = (date: Date, timezone?: string) => {
    const sourceTimezone = timezone || userTimezone.value
    try {
      // Create TZDate in the source timezone, then convert to UTC
      const tzDate = new TZDate(date, sourceTimezone)
      return new Date(tzDate.getTime())
    } catch {
      return date // Fallback to original date
    }
  }

  // Format date in specific timezone
  const formatInTimezone = (date: Date, formatStr: string, timezone?: string) => {
    const targetTimezone = timezone || userTimezone.value
    try {
      const tzDate = new TZDate(date, targetTimezone)
      return format(tzDate, formatStr)
    } catch {
      return format(date, formatStr) // Fallback to regular format
    }
  }

  // Get timezone offset string
  const getTimezoneOffset = (timezone: string) => {
    try {
      const now = new Date()
      const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
      const targetTime = new Date(utc.toLocaleString("en-US", { timeZone: timezone }))
      const diff = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60)
      const sign = diff >= 0 ? "+" : ""
      return `UTC${sign}${diff}`
    } catch {
      return "UTC+0"
    }
  }

  // Convert event to display timezone
  const convertEventToDisplayTimezone = (event: CalendarEvent) => {
    if (event.allDay) return event // All-day events don't need timezone conversion

    const eventTimezone = event.timezone || userTimezone.value

    return {
      ...event,
      startDate: toUserTimezone(event.startDate, eventTimezone),
      endDate: toUserTimezone(event.endDate, eventTimezone),
    }
  }

  // Convert event from display timezone for storage
  const convertEventFromDisplayTimezone = (event: CalendarEvent) => {
    if (event.allDay) return event // All-day events don't need timezone conversion

    const targetTimezone = event.timezone || userTimezone.value

    return {
      ...event,
      startDate: fromUserTimezone(event.startDate, targetTimezone),
      endDate: fromUserTimezone(event.endDate, targetTimezone),
    }
  }

  // Process events array with timezone conversion
  const processEventsWithTimezone = (events: ComputedRef<CalendarEvent[]>) => {
    return computed(() => {
      return events.value.map(event => convertEventToDisplayTimezone(event))
    })
  }

  // Get timezone-aware time display
  const getTimezoneAwareTimeDisplay = (date: Date, timezone?: string) => {
    const targetTimezone = timezone || userTimezone.value
    const timeStr = formatInTimezone(date, "HH:mm", targetTimezone)
    const timezoneAbbr = getTimezoneAbbreviation(targetTimezone)
    return `${timeStr} ${timezoneAbbr}`
  }

  // Get timezone abbreviation
  const getTimezoneAbbreviation = (timezone: string) => {
    try {
      const date = new Date()
      return (
        date
          .toLocaleString("en-US", {
            timeZone: timezone,
            timeZoneName: "short",
          })
          .split(" ")
          .pop() || timezone.split("/").pop()
      )
    } catch {
      return timezone.split("/").pop() || "UTC"
    }
  }

  // Validate timezone
  const isValidTimezone = (timezone: string) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
      return true
    } catch {
      return false
    }
  }

  return {
    userTimezone,
    commonTimezones,
    currentTimezoneInfo,
    detectUserTimezone,
    toUserTimezone,
    fromUserTimezone,
    formatInTimezone,
    getTimezoneOffset,
    convertEventToDisplayTimezone,
    convertEventFromDisplayTimezone,
    processEventsWithTimezone,
    getTimezoneAwareTimeDisplay,
    getTimezoneAbbreviation,
    isValidTimezone,
  }
}
