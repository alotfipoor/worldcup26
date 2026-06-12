import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main className={cn("w-full max-w-2xl mx-auto px-4 pt-4 pb-24 md:pb-10 md:pt-6 md:px-6", className)}>
      {children}
    </main>
  );
}
