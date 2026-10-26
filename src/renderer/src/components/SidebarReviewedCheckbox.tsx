export function SidebarReviewedCheckbox(props: {
  label: string;
  checked: boolean;
  partial?: boolean;
  disabled?: boolean;
  tall?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex ${props.tall ? "h-9" : "h-7"} w-8 shrink-0 items-center justify-center`}
      title="Reviewed"
    >
      <input
        type="checkbox"
        aria-label={`Reviewed: ${props.label}`}
        aria-checked={props.partial ? "mixed" : props.checked}
        checked={props.checked}
        disabled={props.disabled}
        ref={(input) => {
          if (input) input.indeterminate = !!props.partial;
        }}
        style={props.partial ? { accentColor: "var(--color-neutral-500)" } : undefined}
        onChange={(event) => props.onChange(event.target.checked)}
      />
    </label>
  );
}
