
import { animate, type Transition, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import { DEFAULT_CHART_ENTER_TRANSITION } from "./animation";

/** Drives 0→1 enter progress using the studio motion transition (spring or tween). */
export function useMountProgress(
  enterTransition: Transition | undefined,
  delaySeconds: number,
  replayKey: number | string
) {
  const progress = useMotionValue(0);
  const transitionRef = useRef(enterTransition);
  // Déclaré avant l'effet d'animation : React exécute les effets dans l'ordre, la transition est donc à jour quand il démarre.
  useEffect(() => {
    transitionRef.current = enterTransition;
  });

  // replayKey intentionally retriggers enter when motion settings change
  // biome-ignore lint/correctness/useExhaustiveDependencies: replayKey
  useEffect(() => {
    progress.set(0);
    const controls = animate(progress, 1, {
      ...(transitionRef.current ?? DEFAULT_CHART_ENTER_TRANSITION),
      delay: delaySeconds,
    });
    return () => controls.stop();
  }, [delaySeconds, replayKey, progress]);

  return progress;
}
