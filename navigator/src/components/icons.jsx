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

export function AutoplayIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" stroke="none" {...props}>
      <path
        fillRule="evenodd"
        d="M5.23331,0.493645 C6.8801,-0.113331 8.6808,-0.161915 10.3579,0.355379 C11.4019,0.6773972 12.361984,1.20757325 13.1838415,1.90671757 L13.4526,2.14597 L14.2929,1.30564 C14.8955087,0.703065739 15.9071843,1.0850774 15.994017,1.89911843 L16,2.01275 L16,6.00002 L12.0127,6.00002 C11.1605348,6.00002 10.7153321,5.01450817 11.2294893,4.37749065 L11.3056,4.29291 L12.0372,3.56137 C11.389,2.97184 10.6156,2.52782 9.76845,2.26653 C8.5106,1.87856 7.16008,1.915 5.92498,2.37023 C4.68989,2.82547 3.63877,3.67423 2.93361,4.78573 C2.22844,5.89723 1.90836,7.20978 2.02268,8.52112 C2.13701,9.83246 2.6794,11.0698 3.56627,12.0425 C4.45315,13.0152 5.63528,13.6693 6.93052,13.9039 C8.22576,14.1385 9.56221,13.9407 10.7339,13.3409 C11.9057,12.7412 12.8476,11.7727 13.4147,10.5848 C13.6526,10.0864 14.2495,9.8752 14.748,10.1131 C15.2464,10.351 15.4575,10.948 15.2196,11.4464 C14.4635,13.0302 13.2076,14.3215 11.6453,15.1213 C10.0829,15.921 8.30101,16.1847 6.57402,15.8719 C4.84704,15.559 3.27086,14.687 2.08836,13.39 C0.905861,12.0931 0.182675,10.4433 0.0302394,8.69483 C-0.122195,6.94637 0.304581,5.1963 1.2448,3.7143 C2.18503,2.2323 3.58652,1.10062 5.23331,0.493645 Z M6,5.46077 C6,5.09472714 6.37499031,4.86235811 6.69509872,5.0000726 L6.7678,5.03853 L10.7714,7.57776 C11.0528545,7.75626909 11.0784413,8.14585256 10.8481603,8.36273881 L10.7714,8.42224 L6.7678,10.9615 C6.45867857,11.1575214 6.06160816,10.965274 6.00646097,10.6211914 L6,10.5392 L6,5.46077 Z"
      />
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
