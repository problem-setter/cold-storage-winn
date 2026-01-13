import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ckugkbvbefkhniqnpnov.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdWdrYnZiZWZraG5pcW5wbm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTI2NzcsImV4cCI6MjA4MzA4ODY3N30.hadRWP4M2CXUpIWj-iyS_XRD9Uktk4WHdP6-uW2s4G8'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
