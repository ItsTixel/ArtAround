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

export function MoreDetailsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 6.5h16" />
      <path d="M4 12h11" />
      <path d="M4 17.5h7" />
      <circle cx="19" cy="17.5" r="3.2" />
      <path d="M19 16.1v2.8" />
      <path d="M17.6 17.5h2.8" />
    </svg>
  )
}

export function LessDetailsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h11" />
      <circle cx="19" cy="17.5" r="3.2" />
      <path d="M17.6 17.5h2.8" />
    </svg>
  )
}

export function SimplerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 17.5h3v-3H4z" strokeLinejoin="round" />
      <path d="M10.5 17.5h3v-7h-3z" strokeLinejoin="round" />
      <path d="M17 17.5h3v-11h-3z" strokeLinejoin="round" />
      <path d="M20.5 5 15 10.5" />
      <path d="M15.3 6.8 15 10.5l3.7-.3" strokeLinejoin="round" />
    </svg>
  )
}

export function ComplexIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 17.5h3v-3H4z" strokeLinejoin="round" />
      <path d="M10.5 17.5h3v-7h-3z" strokeLinejoin="round" />
      <path d="M17 17.5h3v-11h-3z" strokeLinejoin="round" />
      <path d="M15 5.5h5.5V11" strokeLinejoin="round" />
      <path d="M20.5 5.5 15 11" />
    </svg>
  )
}

export function ToiletIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="12" cy="6" r="2.2" />
      <path d="M12 8.2v4" />
      <path d="M8.5 12h7l-1.2 3.5a1 1 0 0 1-.95.7h-2.7a1 1 0 0 1-.95-.7L8.5 12Z" strokeLinejoin="round" />
      <path d="M10.5 16.2 9.8 20.5" />
      <path d="M13.5 16.2l.7 4.3" />
      <path d="M8.7 20.5h6.6" />
    </svg>
  )
}

export function SignpostIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M12 21v-9.5" />
      <path d="M12 4v3" />
      <path
        d="M6 6.5h6.5a1 1 0 0 1 .8 1.6L12 10l1.3 1.9a1 1 0 0 1-.8 1.6H6a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
      <path d="M9 21h6" />
    </svg>
  )
}

export function MuseumIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M3 9.5 12 4l9 5.5" strokeLinejoin="round" />
      <path d="M4.5 9.5V19" />
      <path d="M19.5 9.5V19" />
      <path d="M8.5 9.5V19" />
      <path d="M15.5 9.5V19" />
      <path d="M12 9.5V19" />
      <path d="M3 19h18" />
    </svg>
  )
}

export function FloorIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M4 20h4v-4.5h4V11h4V6.5h4" strokeLinejoin="round" />
    </svg>
  )
}

export function RoomIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M5 20V5.3a1 1 0 0 1 .8-1L14 3v17" strokeLinejoin="round" />
      <path d="M14 3.2 18.5 4a1 1 0 0 1 .8 1v15" strokeLinejoin="round" />
      <path d="M4 20h16" />
      <circle cx="11.3" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PersonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </svg>
  )
}

export function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M12 4v7" />
      <path d="M7 6.5a7 7 0 1 0 10 0" />
    </svg>
  )
}

export function ZoomInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m19.5 19.5-4.3-4.3" />
      <path d="M10.5 7.5v6" />
      <path d="M7.5 10.5h6" />
    </svg>
  )
}

export function ZoomOutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m19.5 19.5-4.3-4.3" />
      <path d="M7.5 10.5h6" />
    </svg>
  )
}

export function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

export function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  )
}

export function ExitIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps} {...props}>
      <path d="M10.5 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4.5" />
      <path d="M13 12h8" />
      <path d="M17.5 8.2 21.3 12l-3.8 3.8" strokeLinejoin="round" />
    </svg>
  )
}
