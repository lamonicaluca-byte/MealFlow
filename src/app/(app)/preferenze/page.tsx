import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepOrganization } from "@/components/onboarding/step-organization";

export default function PreferencesPage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Preferenze</h1>
        <p className="text-sm text-muted-foreground">Le stesse informazioni raccolte in fase di onboarding: modificabili in ogni momento.</p>
      </div>
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Gusti di famiglia</h2>
        <StepPreferences />
      </section>
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Organizzazione</h2>
        <StepOrganization />
      </section>
    </div>
  );
}
