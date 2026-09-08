import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type AttemptRow = {
  id: string;
};


type EvaluationRow = {
  attempt_id: string;

  status:
    | 'pending'
    | 'in_review'
    | 'completed';
};


export function PendingEvaluationBadge() {
  const [
    pendingCount,
    setPendingCount
  ] =
    useState(0);


  async function loadPendingCount() {
    if (!supabase) {
      return;
    }


    const {
      data:
        attemptData,
      error:
        attemptError
    } =
      await supabase
        .from(
          'mains_attempts'
        )
        .select(
          'id'
        )
        .eq(
          'status',
          'submitted'
        )
        .eq(
          'evaluation_requested',
          true
        );


    if (attemptError) {
      console.error(
        'Unable to load submitted Mains attempts:',
        attemptError
      );

      return;
    }


    const attempts =
      (attemptData || []) as AttemptRow[];


    if (
      attempts.length ===
      0
    ) {
      setPendingCount(0);
      return;
    }


    const attemptIds =
      attempts.map(
        item =>
          item.id
      );


    const {
      data:
        evaluationData,
      error:
        evaluationError
    } =
      await supabase
        .from(
          'mains_evaluations'
        )
        .select(
          'attempt_id, status'
        )
        .in(
          'attempt_id',
          attemptIds
        );


    if (evaluationError) {
      console.error(
        'Unable to load Mains evaluation statuses:',
        evaluationError
      );

      return;
    }


    const evaluations =
      (evaluationData || []) as EvaluationRow[];


    const completedIds =
      new Set(
        evaluations
          .filter(
            item =>
              item.status ===
              'completed'
          )
          .map(
            item =>
              item.attempt_id
          )
      );


    const pending =
      attemptIds.filter(
        id =>
          !completedIds.has(
            id
          )
      ).length;


    setPendingCount(
      pending
    );
  }


  useEffect(
    () => {
      loadPendingCount();


      const timer =
        window.setInterval(
          () => {
            loadPendingCount();
          },
          60000
        );


      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    []
  );


  if (
    pendingCount <=
    0
  ) {
    return null;
  }


  return (
    <span
      title={`${pendingCount} Mains evaluation${pendingCount === 1 ? '' : 's'} need attention`}
      style={{
        display:
          'inline-flex',

        alignItems:
          'center',

        justifyContent:
          'center',

        minWidth:
          '22px',

        height:
          '22px',

        padding:
          '0 7px',

        marginLeft:
          '7px',

        borderRadius:
          '999px',

        background:
          '#ef6a5b',

        color:
          '#ffffff',

        fontSize:
          '0.72rem',

        fontWeight:
          800,

        lineHeight:
          1
      }}
    >
      {
        pendingCount >
        99
          ? '99+'
          : pendingCount
      }
    </span>
  );
}
