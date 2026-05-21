import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'

export interface SchoolSettings {
  id: number
  tenant_id: number
  academy_name: string | null
  logo_path: string | null
  logo_url: string | null
  primary_color: string | null
  currency: string
  timezone: string
  language: string
  academic_year: string | null
  semester: 'first' | 'second' | 'summer' | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
}

export function useSchoolSettings() {
  return useQuery<SchoolSettings>({
    queryKey: ['school-settings'],
    queryFn: () => api.get('/school/profile').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })
}
