"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepFamily } from "@/components/onboarding/step-family";
import { StepSafety } from "@/components/onboarding/step-safety";
import { StepPreferences } from "@/components/onboarding/step-preferences";
import { StepOrganization } from "@/components/onboarding/step-organization";
import { StepPantry } from "@/components/onboarding/step-pantry";

const STEPS = [
  { title: "Famiglia", component: StepFamily },
  { title: "Sicurezza alimentare", component: StepSafety },
  { title: "Preferenze", component: StepPreferences },
  { title: "Organizzazione", component: StepOrganization },
  { title: "Dispensa base", component: StepPantry },
];

export default function OnboardingPage() {
  const household = useAppStore((s) => s.household);
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const router = useRouter();

  const [stepIndex, setStepIndex] = React.useState(() => Math.min(Math.max((household?.onboardingStep ?? 1) - 1, 0), 4));

  const StepComponent = STEPS[stepIndex]!.component;
  const isLast = stepIndex === STEPS.length - 1;

  const goTo = (index: number) => {
    setStepIndex(index);
    setOnboardingStep(index + 1);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-eyebrow">
            Passaggio {stepIndex + 1} di {STEPS.length}
          </p>
          <h1 className="font-display text-2xl font-semibold">{STEPS[stepIndex]!.title}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/home")}>
          Esci e continua più tardi
        </Button>
      </div>

      <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="mb-6" />

      <div className="mb-8">
        <StepComponent />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Indietro
        </Button>
        {isLast ? (
          <Button
            onClick={() => {
              completeOnboarding();
              router.push("/home");
            }}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" /> Fine
          </Button>
        ) : (
          <Button onClick={() => goTo(stepIndex + 1)}>
            Avanti <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
