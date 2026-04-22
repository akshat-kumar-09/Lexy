"use client";

type Props = {
  line: string;
};

export function PageEssence({ line }: Props) {
  if (!line.trim()) return null;
  return (
    <div className="shrink-0 border-b border-[#EDE8E0]/80 bg-gradient-to-b from-[#F9F6F0]/90 to-[#FEFCF8] px-3 py-2.5 sm:px-5 md:px-10">
      <p className="mx-auto max-w-3xl text-center font-serif text-[12px] italic leading-relaxed text-[#8B7355] sm:text-[13px] md:text-sm">
        {line}
      </p>
    </div>
  );
}
