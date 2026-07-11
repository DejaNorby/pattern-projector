export default function ShapesIcon({
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
      <polygon points="12,2 17,11 7,11" />
      <rect x="2" y="13" width="9" height="9" />
      <circle cx="17.5" cy="17.5" r="4.5" />
    </svg>
  );
}
