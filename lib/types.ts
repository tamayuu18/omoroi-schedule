export interface Staff {
  id: string
  name: string
  email: string
  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expiry: string | null
  google_calendar_id: string
  is_active: boolean
  created_at: string
}

export interface BookingPage {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  buffer_minutes: number
  max_days_ahead: number
  available_start_hour: number
  available_end_hour: number
  available_days: number[]
  is_active: boolean
  created_at: string
  staff?: Staff[]
}

export interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  booking_page_id: string
  staff_id: string
  contact_id: string | null
  candidate_name: string
  candidate_email: string
  candidate_phone: string | null
  candidate_note: string | null
  start_time: string
  end_time: string
  google_event_id: string | null
  google_meet_link: string | null
  status: string
  created_at: string
  staff?: Staff
  booking_page?: BookingPage
  contact?: Contact
}

export interface TimeSlot {
  time: string
  staffId: string
  staffName: string
}

export interface CreateBookingInput {
  pageId: string
  slotTime: string
  staffId: string
  name: string
  email: string
  phone?: string
  note?: string
}
