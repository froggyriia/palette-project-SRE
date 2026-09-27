/**
 * One button component for the whole app, instead of each place
 * hand-rolling its own border/hover/disabled classes — so "Сгенерировать",
 * the export buttons, "Сохранить в профиль" and "Удалить" all share the
 * same rounded corners, hover/focus states, and disabled look.
 */
const VARIANTS = {
  primary:
    "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:bg-blue-800 focus-visible:ring-blue-500",
  secondary:
    "bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus-visible:ring-gray-400",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow active:bg-emerald-800 focus-visible:ring-emerald-500",
  danger:
    "text-red-600 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-400",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
