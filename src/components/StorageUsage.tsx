import { HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StorageUsageProps {
  usedBytes: number;
  limitBytes: number;
}

export function StorageUsage({ usedBytes, limitBytes }: StorageUsageProps) {
  const usedGB = usedBytes / (1024 * 1024 * 1024);
  const limitGB = limitBytes / (1024 * 1024 * 1024);
  const percentage = Math.min((usedBytes / limitBytes) * 100, 100);
  
  const formatStorage = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAtLimit ? 'bg-destructive/10' : isNearLimit ? 'bg-yellow-500/10' : 'bg-accent'}`}>
          <HardDrive className={`w-5 h-5 ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-500' : 'text-foreground'}`} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Storage</p>
          <p className="text-xs text-muted-foreground">
            {formatStorage(usedBytes)} of {limitGB} GB used
          </p>
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
      />
      {isAtLimit && (
        <p className="text-xs text-destructive mt-2">Storage limit reached</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-500 mt-2">Storage almost full</p>
      )}
    </div>
  );
}
