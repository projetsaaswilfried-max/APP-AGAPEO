import { SITE_CONFIG } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-3 sm:p-6 lg:p-10">
      {children}
    </div>
  );
}
