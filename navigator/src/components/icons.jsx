const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

export function MapIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" strokeLinejoin="round" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  )
}

export function OperaIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="4" y="3.5" width="16" height="14" rx="1" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="m5 15 4-4 3 3 3-3.5L20 15" />
      <path d="M9 21h6" />
    </svg>
  )
}

export function CommandsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  )
}

export function QrIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="0.5" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="0.5" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="0.5" />
      <path d="M14.5 14.5h3v3h-3z" />
      <path d="M20.5 14.5v3" />
      <path d="M14.5 20.5h3" />
      <path d="M20.5 20.5h.01" />
    </svg>
  )
}

export function PreviousIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M6 6v12" />
      <path d="M8 12l9.5-5.7a1 1 0 0 1 1.5.9v9.6a1 1 0 0 1-1.5.9L8 12Z" strokeLinejoin="round" />
    </svg>
  )
}

export function NextIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M18 6v12" />
      <path d="M16 12 6.5 6.3a1 1 0 0 0-1.5.9v9.6a1 1 0 0 0 1.5.9L16 12Z" strokeLinejoin="round" />
    </svg>
  )
}

export function PlayIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path
        d="M8 5.5v13a1 1 0 0 0 1.5.87l10-6.5a1 1 0 0 0 0-1.74l-10-6.5A1 1 0 0 0 8 5.5Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

export function VolumeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" strokeLinejoin="round" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  )
}

export function VolumeMutedIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" strokeLinejoin="round" />
      <path d="M15.5 9.5 20 14" />
      <path d="M20 9.5 15.5 14" />
    </svg>
  )
}

export function PauseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MicrophoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v3" />
      <path d="M9 20h6" />
    </svg>
  )
}
