import { BrandLogo } from "@/components/BrandLogo";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <BrandLogo className="w-40" />
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              A premium cinematic streaming experience.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} PlayHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
