export default function LayoutIcon({
  ariaLabel,
  className,
}: {
  ariaLabel: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24px"
      viewBox="0 0 24 24"
      width="24px"
      fill="currentColor"
      aria-label={ariaLabel}
      className={className}
    >
      <rect x="2" y="4" width="9" height="9" transform="rotate(-8 6.5 8.5)" />
      <rect x="12" y="11" width="9" height="9" transform="rotate(10 16.5 15.5)" />
    </svg>
  );
}
