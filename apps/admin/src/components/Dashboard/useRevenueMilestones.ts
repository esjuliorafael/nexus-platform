import React from "react";
import type { DashboardMilestoneProgress } from "../../types";

interface UseRevenueMilestonesOptions {
  isAdminUser: boolean;
  isLoading: boolean;
  milestones?: DashboardMilestoneProgress[];
  onAcknowledge: (milestoneId: string) => Promise<void>;
  resetKey?: string;
}

export const useRevenueMilestones = ({
  isAdminUser,
  isLoading,
  milestones,
  onAcknowledge,
  resetKey,
}: UseRevenueMilestonesOptions) => {
  const [activeMilestone, setActiveMilestone] =
    React.useState<DashboardMilestoneProgress | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [localAcknowledgedIds, setLocalAcknowledgedIds] = React.useState<
    string[]
  >([]);
  const hasShownMilestoneThisSession = React.useRef(false);
  const previousResetKey = React.useRef(resetKey);

  React.useEffect(() => {
    if (previousResetKey.current === resetKey) return;

    previousResetKey.current = resetKey;
    hasShownMilestoneThisSession.current = false;
    setActiveMilestone(null);
    setIsOpen(false);
    setLocalAcknowledgedIds([]);
  }, [resetKey]);

  const nextMilestone = React.useMemo(
    () =>
      milestones?.find(
        (milestone) =>
          milestone.reached &&
          !milestone.acknowledged &&
          !localAcknowledgedIds.includes(milestone.id),
      ) || null,
    [localAcknowledgedIds, milestones],
  );

  React.useEffect(() => {
    if (!isAdminUser || isLoading) {
      setActiveMilestone(null);
      setIsOpen(false);
      return;
    }

    if (
      !activeMilestone &&
      nextMilestone &&
      !hasShownMilestoneThisSession.current
    ) {
      hasShownMilestoneThisSession.current = true;
      setActiveMilestone(nextMilestone);
      setIsOpen(true);
    }
  }, [activeMilestone, isAdminUser, isLoading, nextMilestone]);

  const acknowledgeMilestone = React.useCallback(async () => {
    if (!activeMilestone) return;

    await onAcknowledge(activeMilestone.id);
    const acknowledgedIds =
      milestones
        ?.filter(
          (milestone) =>
            milestone.metric === activeMilestone.metric &&
            milestone.threshold <= activeMilestone.threshold,
        )
        .map((milestone) => milestone.id) || [];
    setLocalAcknowledgedIds((current) => [
      ...new Set([...current, ...acknowledgedIds]),
    ]);
    setIsOpen(false);
  }, [activeMilestone, milestones, onAcknowledge]);

  const handleAfterClose = React.useCallback(() => {
    setActiveMilestone(null);
  }, []);

  return {
    activeMilestone,
    isOpen,
    nextMilestone:
      activeMilestone && milestones
        ? milestones.find(
            (milestone) =>
              milestone.metric === activeMilestone.metric &&
              milestone.threshold > activeMilestone.threshold,
          ) || null
        : null,
    acknowledgeMilestone,
    handleAfterClose,
  };
};
