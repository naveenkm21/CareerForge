'use client';

import { Player, type PlayerProps } from '@careerforge/viz-react';
import { recordCheckpointAction } from '@/app/(app)/learn/actions';

/** The public player; for signed-in learners, checkpoint answers also become evidence. */
export function EvidencePlayer({
  signedIn,
  ...props
}: Omit<PlayerProps, 'onCheckpointAnswered'> & { signedIn: boolean }) {
  return (
    <Player
      {...props}
      onCheckpointAnswered={
        signedIn
          ? (e) => {
              void recordCheckpointAction({
                algorithmId: e.algorithmId,
                step: e.step,
                anchor: e.anchor,
                correct: e.correct,
                given: e.given,
              });
            }
          : undefined
      }
    />
  );
}
