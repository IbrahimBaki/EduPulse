import React from 'react'

interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  className: string
  style?: React.CSSProperties
}

export default function UserAvatar({ name, avatarUrl, className, style }: UserAvatarProps) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={className} style={{ objectFit: 'cover', ...style }} />
  }
  return <div className={className} style={style} aria-hidden="true">{initials}</div>
}
