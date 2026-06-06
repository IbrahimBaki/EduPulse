import type { TFunction } from 'i18next'

export function translateStatus(status: string, t: TFunction): string {
  const map: Record<string, string> = {
    pending:  t('students.status.pending'),
    paid:     t('students.status.paid'),
    overdue:  t('students.status.overdue'),
    active:   t('students.status.active'),
    inactive: t('students.status.inactive'),
    male:     t('common.male'),
    female:   t('common.female'),
  }
  return map[status] ?? status
}
