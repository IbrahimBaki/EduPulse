import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../lib/axios'
import styles from './Settings.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeLevel {
  id: number; name: string; level: number
  description: string | null; is_active: boolean
}

interface Subject {
  id: number; name: string
  description: string | null; is_active: boolean
}

type FErr = Record<string, string>

// ─── API ──────────────────────────────────────────────────────────────────────

const glApi = {
  list:   () => api.get('/manager/grade-levels').then(r => r.data.data as GradeLevel[]),
  create: (p: { name: string; level: number; description: string }) =>
    api.post('/manager/grade-levels', p).then(r => r.data),
  update: (id: number, p: Partial<GradeLevel>) =>
    api.put(`/manager/grade-levels/${id}`, p).then(r => r.data),
  remove: (id: number) => api.delete(`/manager/grade-levels/${id}`),
}

const sbApi = {
  list:   () => api.get('/manager/subjects').then(r => r.data.data as Subject[]),
  create: (p: { name: string; description: string }) =>
    api.post('/manager/subjects', p).then(r => r.data),
  update: (id: number, p: Partial<Subject>) =>
    api.put(`/manager/subjects/${id}`, p).then(r => r.data),
  remove: (id: number) => api.delete(`/manager/subjects/${id}`),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractErrors(err: unknown): { fields: FErr; message: string | null } {
  const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
  const fields: FErr = {}
  if (e?.response?.data?.errors) {
    for (const [k, v] of Object.entries(e.response.data.errors)) fields[k] = v[0]
  }
  return { fields, message: e?.response?.data?.message ?? null }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, disabled, onChange, label }: {
  checked: boolean; disabled?: boolean; onChange: () => void; label: string
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      disabled={disabled}
      className={`${styles.toggle}${checked ? ' ' + styles.toggleOn : ''}`}
      onClick={e => { e.stopPropagation(); onChange() }}>
      <span className={styles.toggleThumb} />
    </button>
  )
}

// ─── DeleteConfirmRow ─────────────────────────────────────────────────────────

function DeleteConfirmRow({ name, onConfirm, onCancel }: {
  name: string; onConfirm: () => void; onCancel: () => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try { await onConfirm() }
    finally { setBusy(false) }
  }

  return (
    <div className={styles.deleteRow}>
      <span className={styles.deleteMsg}>
        {t('common.delete')} <strong>{name}</strong>?
      </span>
      <div className={styles.deleteRowActions}>
        <button type="button" className={styles.deleteConfirmBtn}
          onClick={confirm} disabled={busy}>
          {busy ? t('manager.settings.deleting') : t('manager.settings.delete')}
        </button>
        <button type="button" className={styles.deleteCancelBtn}
          onClick={onCancel} disabled={busy}>{t('manager.settings.cancel')}</button>
      </div>
    </div>
  )
}

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles.skRow}>
          <span className={`${styles.skeleton} ${styles.skBadge}`} />
          <div className={styles.skStack}>
            <span className={styles.skeleton} style={{ width: 130 }} />
            <span className={styles.skeleton} style={{ width: 80 }} />
          </div>
          <span className={styles.skeleton} style={{ width: 36, marginInlineStart: 'auto' }} />
        </div>
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Grade Levels Section
// ═══════════════════════════════════════════════════════════════════════════════

function AddGradeLevelRow({ onSave, onCancel }: {
  onSave: (p: { name: string; level: number; description: string }) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [name, setName]   = useState('')
  const [level, setLevel] = useState('')
  const [desc, setDesc]   = useState('')
  const [errs, setErrs]   = useState<FErr>({})
  const [msg, setMsg]     = useState<string | null>(null)
  const [busy, setBusy]   = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const validate = (): boolean => {
    const e: FErr = {}
    if (!name.trim()) e.name = 'Required'
    if (!level)       e.level = 'Required'
    else if (isNaN(Number(level)) || Number(level) < 1 || Number(level) > 20)
      e.level = '1–20'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true); setMsg(null)
    try {
      await onSave({ name: name.trim(), level: Number(level), description: desc.trim() })
    } catch (err) {
      const { fields, message } = extractErrors(err)
      if (Object.keys(fields).length) setErrs(fields)
      else setMsg(message ?? 'Could not save. Please try again.')
    } finally { setBusy(false) }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className={styles.addRow}>
      {msg && <p className={styles.rowMsg} role="alert">{msg}</p>}
      <div className={styles.addFields}>
        <div className={`${styles.addGroup} ${styles.addGroupFlex}`}>
          <input ref={nameRef} type="text" placeholder={t('manager.settings.gradeName')}
            className={`${styles.addInput}${errs.name ? ' ' + styles.inputErr : ''}`}
            value={name} onChange={e => { setName(e.target.value); setErrs(v => ({ ...v, name: '' })) }}
            onKeyDown={onKey} disabled={busy} />
          {errs.name && <span className={styles.fieldErr}>{errs.name}</span>}
        </div>
        <div className={styles.addGroup} style={{ width: 90 }}>
          <input type="number" placeholder={t('manager.settings.level')} min={1} max={20}
            className={`${styles.addInput}${errs.level ? ' ' + styles.inputErr : ''}`}
            value={level} onChange={e => { setLevel(e.target.value); setErrs(v => ({ ...v, level: '' })) }}
            onKeyDown={onKey} disabled={busy} />
          {errs.level && <span className={styles.fieldErr}>{errs.level}</span>}
        </div>
        <div className={`${styles.addGroup} ${styles.addGroupFlex} ${styles.addGroupDesc}`}>
          <input type="text" placeholder={t('manager.settings.descriptionOptional')}
            className={styles.addInput}
            value={desc} onChange={e => setDesc(e.target.value)}
            onKeyDown={onKey} disabled={busy} />
        </div>
        <div className={styles.addRowBtns}>
          <button type="button" className={styles.saveBtn} onClick={submit} disabled={busy}>
            {busy ? t('manager.settings.saving') : t('manager.settings.save')}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
            {t('manager.settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditGradeLevelRow({ item, onSave, onCancel }: {
  item: GradeLevel
  onSave: (p: Partial<GradeLevel>) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [name, setName]   = useState(item.name)
  const [level, setLevel] = useState(String(item.level))
  const [desc, setDesc]   = useState(item.description ?? '')
  const [errs, setErrs]   = useState<FErr>({})
  const [msg, setMsg]     = useState<string | null>(null)
  const [busy, setBusy]   = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const validate = (): boolean => {
    const e: FErr = {}
    if (!name.trim()) e.name = 'Required'
    if (!level)       e.level = 'Required'
    else if (Number(level) < 1 || Number(level) > 20) e.level = '1–20'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true); setMsg(null)
    try {
      await onSave({ name: name.trim(), level: Number(level), description: desc.trim() || null })
    } catch (err) {
      const { fields, message } = extractErrors(err)
      if (Object.keys(fields).length) setErrs(fields)
      else setMsg(message ?? 'Could not save. Please try again.')
    } finally { setBusy(false) }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className={styles.editRow}>
      {msg && <p className={styles.rowMsg} role="alert">{msg}</p>}
      <div className={styles.addFields}>
        <div className={`${styles.addGroup} ${styles.addGroupFlex}`}>
          <input ref={nameRef} type="text"
            className={`${styles.addInput}${errs.name ? ' ' + styles.inputErr : ''}`}
            value={name} onChange={e => { setName(e.target.value); setErrs(v => ({ ...v, name: '' })) }}
            onKeyDown={onKey} disabled={busy} />
          {errs.name && <span className={styles.fieldErr}>{errs.name}</span>}
        </div>
        <div className={styles.addGroup} style={{ width: 90 }}>
          <input type="number" min={1} max={20}
            className={`${styles.addInput}${errs.level ? ' ' + styles.inputErr : ''}`}
            value={level} onChange={e => { setLevel(e.target.value); setErrs(v => ({ ...v, level: '' })) }}
            onKeyDown={onKey} disabled={busy} />
          {errs.level && <span className={styles.fieldErr}>{errs.level}</span>}
        </div>
        <div className={`${styles.addGroup} ${styles.addGroupFlex} ${styles.addGroupDesc}`}>
          <input type="text" placeholder={t('manager.settings.descriptionOptional')}
            className={styles.addInput} value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={onKey} disabled={busy} />
        </div>
        <div className={styles.addRowBtns}>
          <button type="button" className={styles.saveBtn} onClick={submit} disabled={busy}>
            {busy ? t('manager.settings.saving') : t('manager.settings.save')}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
            {t('manager.settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function GradeLevelItem({ item, isToggling, deleteError, onEdit, onDelete, onToggle, onDismissErr }: {
  item: GradeLevel; isToggling: boolean; deleteError?: string
  onEdit: () => void; onDelete: () => void; onToggle: () => void; onDismissErr: () => void
}) {
  return (
    <div className={styles.itemWrap}>
      <div className={styles.item}>
        <div className={styles.levelBadge}>{item.level}</div>
        <div className={styles.itemMain}>
          <span className={styles.itemName}>{item.name}</span>
          {item.description && <span className={styles.itemDesc}>{item.description}</span>}
        </div>
        <div className={styles.itemActions}>
          <Toggle checked={item.is_active} disabled={isToggling}
            onChange={onToggle} label={`Toggle ${item.name} active`} />
          <button type="button" className={styles.iconBtn} onClick={onEdit}
            aria-label={`Edit ${item.name}`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M9.5 1.5l2 2L4 11H2v-2L9.5 1.5z" stroke="currentColor"
                strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDel}`}
            onClick={onDelete} aria-label={`Delete ${item.name}`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 3.5h10M4.5 3.5V2h4v1.5M5 6v4M8 6v4M2.5 3.5l1 8h6l1-8"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      {deleteError && (
        <div className={styles.deleteErr} role="alert">
          <span>{deleteError}</span>
          <button type="button" className={styles.dismissBtn}
            onClick={onDismissErr} aria-label="Dismiss">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function GradeLevelsSection() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [isAdding, setIsAdding]   = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [deleteId, setDeleteId]   = useState<number | null>(null)
  const [togglingIds, setToggling] = useState<Set<number>>(new Set())
  const [deleteErrors, setDelErrs] = useState<Record<number, string>>({})

  const invalidate = () => qc.invalidateQueries({ queryKey: ['manager-grade-levels'] })

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-grade-levels'],
    queryFn: glApi.list,
    staleTime: 5 * 60 * 1000,
  })

  const createMut = useMutation({
    mutationFn: glApi.create,
    onSuccess: () => { invalidate(); setIsAdding(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<GradeLevel> }) => glApi.update(id, patch),
    onSuccess: () => { invalidate(); setEditId(null) },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, val }: { id: number; val: boolean }) => glApi.update(id, { is_active: val }),
    onMutate: ({ id }) => setToggling(s => { const n = new Set(s); n.add(id); return n }),
    onSettled: (_, __, { id }) => {
      setToggling(s => { const n = new Set(s); n.delete(id); return n })
      invalidate()
    },
  })

  const deleteMut = useMutation({
    mutationFn: glApi.remove,
    onSuccess: (_, id) => {
      setDeleteId(null)
      setDelErrs(e => { const n = { ...e }; delete n[id]; return n })
      invalidate()
    },
    onError: (err, id) => {
      setDeleteId(null)
      const { message, fields } = extractErrors(err)
      const txt = message ?? fields['id'] ?? 'This grade level has enrolled students and cannot be deleted.'
      setDelErrs(e => ({ ...e, [id]: txt }))
    },
  })

  const openAdd = () => { setIsAdding(true); setEditId(null); setDeleteId(null) }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadLeft}>
          <h2 className={styles.sectionTitle}>{t('manager.settings.gradeLevels')}</h2>
          {!isLoading && !isError && (
            <span className={styles.countBadge}>{items.length}</span>
          )}
        </div>
        <button type="button" className={styles.sectionAddBtn}
          onClick={openAdd} disabled={isAdding}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          {t('manager.settings.add')}
        </button>
      </div>

      <div className={styles.listBody}>
        {isLoading && <SkeletonRows />}

        {isError && (
          <div className={styles.sectionError}>
            {t('manager.settings.failedLoadGradeLevels')}
            <button type="button" className={styles.retryLink} onClick={() => refetch()}>
              {t('manager.settings.tryAgain')}
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {isAdding && (
              <AddGradeLevelRow
                onSave={createMut.mutateAsync}
                onCancel={() => setIsAdding(false)}
              />
            )}

            {items.length === 0 && !isAdding && (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>{t('manager.settings.noGradeLevels')}</p>
                <p className={styles.emptyHint}>
                  {t('manager.settings.noGradeLevelsHint')}
                </p>
                <button type="button" className={styles.emptyCta} onClick={openAdd}>
                  {t('manager.settings.addFirstGradeLevel')}
                </button>
              </div>
            )}

            {items.map(item => (
              editId === item.id ? (
                <EditGradeLevelRow key={item.id} item={item}
                  onSave={(p) => updateMut.mutateAsync({ id: item.id, patch: p })}
                  onCancel={() => setEditId(null)} />
              ) : deleteId === item.id ? (
                <div key={item.id} className={styles.deleteRowWrap}>
                  <DeleteConfirmRow name={item.name}
                    onConfirm={() => deleteMut.mutateAsync(item.id)}
                    onCancel={() => setDeleteId(null)} />
                </div>
              ) : (
                <GradeLevelItem key={item.id} item={item}
                  isToggling={togglingIds.has(item.id)}
                  deleteError={deleteErrors[item.id]}
                  onEdit={() => { setEditId(item.id); setIsAdding(false); setDeleteId(null) }}
                  onDelete={() => { setDeleteId(item.id); setEditId(null) }}
                  onToggle={() => toggleMut.mutate({ id: item.id, val: !item.is_active })}
                  onDismissErr={() => setDelErrs(e => { const n = { ...e }; delete n[item.id]; return n })} />
              )
            ))}
          </>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Subjects Section
// ═══════════════════════════════════════════════════════════════════════════════

function AddSubjectRow({ onSave, onCancel }: {
  onSave: (p: { name: string; description: string }) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [errs, setErrs] = useState<FErr>({})
  const [msg, setMsg]   = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const validate = (): boolean => {
    const e: FErr = {}
    if (!name.trim()) e.name = 'Required'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true); setMsg(null)
    try {
      await onSave({ name: name.trim(), description: desc.trim() })
    } catch (err) {
      const { fields, message } = extractErrors(err)
      if (Object.keys(fields).length) setErrs(fields)
      else setMsg(message ?? 'Could not save. Please try again.')
    } finally { setBusy(false) }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className={styles.addRow}>
      {msg && <p className={styles.rowMsg} role="alert">{msg}</p>}
      <div className={styles.addFields}>
        <div className={`${styles.addGroup} ${styles.addGroupFlex}`}>
          <input ref={nameRef} type="text" placeholder={t('manager.settings.subjectName')}
            className={`${styles.addInput}${errs.name ? ' ' + styles.inputErr : ''}`}
            value={name} onChange={e => { setName(e.target.value); setErrs(v => ({ ...v, name: '' })) }}
            onKeyDown={onKey} disabled={busy} />
          {errs.name && <span className={styles.fieldErr}>{errs.name}</span>}
        </div>
        <div className={`${styles.addGroup} ${styles.addGroupFlex} ${styles.addGroupDesc}`}>
          <input type="text" placeholder={t('manager.settings.descriptionOptional')}
            className={styles.addInput} value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={onKey} disabled={busy} />
        </div>
        <div className={styles.addRowBtns}>
          <button type="button" className={styles.saveBtn} onClick={submit} disabled={busy}>
            {busy ? t('manager.settings.saving') : t('manager.settings.save')}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
            {t('manager.settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditSubjectRow({ item, onSave, onCancel }: {
  item: Subject
  onSave: (p: Partial<Subject>) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(item.name)
  const [desc, setDesc] = useState(item.description ?? '')
  const [errs, setErrs] = useState<FErr>({})
  const [msg, setMsg]   = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const validate = (): boolean => {
    const e: FErr = {}
    if (!name.trim()) e.name = 'Required'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true); setMsg(null)
    try {
      await onSave({ name: name.trim(), description: desc.trim() || null })
    } catch (err) {
      const { fields, message } = extractErrors(err)
      if (Object.keys(fields).length) setErrs(fields)
      else setMsg(message ?? 'Could not save. Please try again.')
    } finally { setBusy(false) }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className={styles.editRow}>
      {msg && <p className={styles.rowMsg} role="alert">{msg}</p>}
      <div className={styles.addFields}>
        <div className={`${styles.addGroup} ${styles.addGroupFlex}`}>
          <input ref={nameRef} type="text"
            className={`${styles.addInput}${errs.name ? ' ' + styles.inputErr : ''}`}
            value={name} onChange={e => { setName(e.target.value); setErrs(v => ({ ...v, name: '' })) }}
            onKeyDown={onKey} disabled={busy} />
          {errs.name && <span className={styles.fieldErr}>{errs.name}</span>}
        </div>
        <div className={`${styles.addGroup} ${styles.addGroupFlex} ${styles.addGroupDesc}`}>
          <input type="text" placeholder={t('manager.settings.descriptionOptional')}
            className={styles.addInput} value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={onKey} disabled={busy} />
        </div>
        <div className={styles.addRowBtns}>
          <button type="button" className={styles.saveBtn} onClick={submit} disabled={busy}>
            {busy ? t('manager.settings.saving') : t('manager.settings.save')}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
            {t('manager.settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubjectItem({ item, isToggling, deleteError, onEdit, onDelete, onToggle, onDismissErr }: {
  item: Subject; isToggling: boolean; deleteError?: string
  onEdit: () => void; onDelete: () => void; onToggle: () => void; onDismissErr: () => void
}) {
  const initial = item.name.charAt(0).toUpperCase()
  return (
    <div className={styles.itemWrap}>
      <div className={styles.item}>
        <div className={styles.subjectBadge}>{initial}</div>
        <div className={styles.itemMain}>
          <span className={styles.itemName}>{item.name}</span>
          {item.description && <span className={styles.itemDesc}>{item.description}</span>}
        </div>
        <div className={styles.itemActions}>
          <Toggle checked={item.is_active} disabled={isToggling}
            onChange={onToggle} label={`Toggle ${item.name} active`} />
          <button type="button" className={styles.iconBtn} onClick={onEdit}
            aria-label={`Edit ${item.name}`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M9.5 1.5l2 2L4 11H2v-2L9.5 1.5z" stroke="currentColor"
                strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDel}`}
            onClick={onDelete} aria-label={`Delete ${item.name}`}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 3.5h10M4.5 3.5V2h4v1.5M5 6v4M8 6v4M2.5 3.5l1 8h6l1-8"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      {deleteError && (
        <div className={styles.deleteErr} role="alert">
          <span>{deleteError}</span>
          <button type="button" className={styles.dismissBtn}
            onClick={onDismissErr} aria-label="Dismiss">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function SubjectsSection() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [isAdding, setIsAdding]    = useState(false)
  const [editId, setEditId]        = useState<number | null>(null)
  const [deleteId, setDeleteId]    = useState<number | null>(null)
  const [togglingIds, setToggling] = useState<Set<number>>(new Set())
  const [deleteErrors, setDelErrs] = useState<Record<number, string>>({})

  const invalidate = () => qc.invalidateQueries({ queryKey: ['manager-subjects'] })

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['manager-subjects'],
    queryFn: sbApi.list,
    staleTime: 5 * 60 * 1000,
  })

  const createMut = useMutation({
    mutationFn: sbApi.create,
    onSuccess: () => { invalidate(); setIsAdding(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Subject> }) => sbApi.update(id, patch),
    onSuccess: () => { invalidate(); setEditId(null) },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, val }: { id: number; val: boolean }) => sbApi.update(id, { is_active: val }),
    onMutate: ({ id }) => setToggling(s => { const n = new Set(s); n.add(id); return n }),
    onSettled: (_, __, { id }) => {
      setToggling(s => { const n = new Set(s); n.delete(id); return n })
      invalidate()
    },
  })

  const deleteMut = useMutation({
    mutationFn: sbApi.remove,
    onSuccess: (_, id) => {
      setDeleteId(null)
      setDelErrs(e => { const n = { ...e }; delete n[id]; return n })
      invalidate()
    },
    onError: (err, id) => {
      setDeleteId(null)
      const { message, fields } = extractErrors(err)
      const txt = message ?? fields['id'] ?? 'This subject has active courses and cannot be deleted.'
      setDelErrs(e => ({ ...e, [id]: txt }))
    },
  })

  const openAdd = () => { setIsAdding(true); setEditId(null); setDeleteId(null) }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionHeadLeft}>
          <h2 className={styles.sectionTitle}>{t('manager.settings.subjects')}</h2>
          {!isLoading && !isError && (
            <span className={styles.countBadge}>{items.length}</span>
          )}
        </div>
        <button type="button" className={styles.sectionAddBtn}
          onClick={openAdd} disabled={isAdding}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          {t('manager.settings.add')}
        </button>
      </div>

      <div className={styles.listBody}>
        {isLoading && <SkeletonRows />}

        {isError && (
          <div className={styles.sectionError}>
            {t('manager.settings.failedLoadSubjects')}
            <button type="button" className={styles.retryLink} onClick={() => refetch()}>
              {t('manager.settings.tryAgain')}
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {isAdding && (
              <AddSubjectRow
                onSave={createMut.mutateAsync}
                onCancel={() => setIsAdding(false)}
              />
            )}

            {items.length === 0 && !isAdding && (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>{t('manager.settings.noSubjects')}</p>
                <p className={styles.emptyHint}>
                  {t('manager.settings.noSubjectsHint')}
                </p>
                <button type="button" className={styles.emptyCta} onClick={openAdd}>
                  {t('manager.settings.addFirstSubject')}
                </button>
              </div>
            )}

            {items.map(item => (
              editId === item.id ? (
                <EditSubjectRow key={item.id} item={item}
                  onSave={(p) => updateMut.mutateAsync({ id: item.id, patch: p })}
                  onCancel={() => setEditId(null)} />
              ) : deleteId === item.id ? (
                <div key={item.id} className={styles.deleteRowWrap}>
                  <DeleteConfirmRow name={item.name}
                    onConfirm={() => deleteMut.mutateAsync(item.id)}
                    onCancel={() => setDeleteId(null)} />
                </div>
              ) : (
                <SubjectItem key={item.id} item={item}
                  isToggling={togglingIds.has(item.id)}
                  deleteError={deleteErrors[item.id]}
                  onEdit={() => { setEditId(item.id); setIsAdding(false); setDeleteId(null) }}
                  onDelete={() => { setDeleteId(item.id); setEditId(null) }}
                  onToggle={() => toggleMut.mutate({ id: item.id, val: !item.is_active })}
                  onDismissErr={() => setDelErrs(e => { const n = { ...e }; delete n[item.id]; return n })} />
              )
            ))}
          </>
        )}
      </div>
    </section>
  )
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('manager.settings.title')}</h1>
        <p className={styles.pageSubtitle}>
          {t('manager.settings.subtitle')}
        </p>
      </div>
      <div className={styles.sections}>
        <GradeLevelsSection />
        <SubjectsSection />
      </div>
    </div>
  )
}
