import React from 'react';
import { Card, CardContent } from '@/ui';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

interface HealthCheckItem {
  label: string;
  done: boolean;
  required: boolean;
}

interface HealthCheckCardProps {
  healthCheck: {
    isComplete: boolean;
    items: HealthCheckItem[];
  };
}

export const HealthCheckCard: React.FC<HealthCheckCardProps> = ({ healthCheck }) => {
  const { isComplete, items } = healthCheck;
  const completedCount = items.filter((i) => i.done).length;

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Project Health
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isComplete
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}
        >
          {completedCount}/{items.length} Ready
        </span>
      </div>

      <CardContent className="p-4 space-y-2">
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs py-0.5">
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
                {item.required && <span className="text-destructive ml-0.5">*</span>}
              </span>
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.required ? 'bg-destructive/60' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
