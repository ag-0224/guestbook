import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim()

const isPlaceholder = 
  !supabaseUrl || 
  supabaseUrl === '발급받은 URL' || 
  !supabaseAnonKey

if (isPlaceholder) {
  console.warn(
    'Supabase URL or Publishable Key is missing. Please update your .env.local file with actual credentials.'
  )
}

export const supabase = createClient(
  isPlaceholder ? 'https://placeholder-project.supabase.co' : supabaseUrl,
  isPlaceholder ? 'placeholder-anon-key' : supabaseAnonKey
)
