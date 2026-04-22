export function IPA({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-serif text-[0.92em] italic text-[#8B7355] tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
