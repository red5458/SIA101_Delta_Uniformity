import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      aria-hidden="true"
      width={96}
      height={96}
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}
