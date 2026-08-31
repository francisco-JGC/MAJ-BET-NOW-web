import { useIsFetching, useIsMutating } from '@tanstack/react-query';

import { cn } from '@/shared/lib/cn';

/**
 * Slim animated bar pinned at the top of the viewport that surfaces ANY
 * ongoing TanStack Query activity — background refetches, mutations, or
 * transitions the user just kicked off. Non-interactive and low-profile
 * so it never blocks the layout; disappears the moment the queue empties.
 */
export function GlobalProgress() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className={cn(
          'h-full origin-left bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-indigo-500 bg-[length:200%_100%] transition-opacity',
          active
            ? 'opacity-100 animate-[progress-slide_1.4s_linear_infinite]'
            : 'opacity-0',
        )}
      />
    </div>
  );
}
