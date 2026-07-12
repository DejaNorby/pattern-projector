export default function MarqueeSelectIcon({
  ariaLabel,
}: {
  ariaLabel: string;
}) {
  return (
    <svg
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="1"
        strokeDasharray="3 3"
      />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
    </svg>
  );
}
