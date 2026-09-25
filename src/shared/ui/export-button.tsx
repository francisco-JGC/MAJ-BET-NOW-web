import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

interface Props {
  onExport: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({ onExport, disabled, className }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      title="Exportar Excel"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground',
        'hover:bg-secondary transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Excel
    </button>
  );
}
