import { RequireAuth } from "@/components/layout/require-auth";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-dvh bg-background">{children}</div>
    </RequireAuth>
  );
}
