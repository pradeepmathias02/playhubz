import logo from "@/assets/playhub-logo-pink.png";

export function BrandLogo({ className = "w-36" }: { className?: string }) {
  return <img src={logo} alt="PlayHub" width={1405} height={330} className={`block h-auto shrink-0 ${className}`} decoding="async" />;
}