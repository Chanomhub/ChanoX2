import React from 'react';
import {
  Card,
  CardContent,
  Label,
  Input,
  Button
} from '@/ui';
import { Coins, CheckCircle2 } from 'lucide-react';

interface PricingCardProps {
  isPaid: boolean;
  price?: number;
  onUpdateField: (key: 'isPaid' | 'price', val: any) => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  isPaid,
  price = 0,
  onUpdateField,
}) => {
  const numericPrice = Number(price) || 0;

  // Revenue calculation
  const platformFee = numericPrice * 0.1;
  const stripeFee = numericPrice > 0 ? ((numericPrice * 0.0365 + 10) * 1.07) : 0;
  const netPayout = Math.max(0, numericPrice - platformFee - stripeFee);

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Pricing & Monetization
          </h3>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Free vs Paid Pills */}
        <div className="flex bg-muted/40 p-1 rounded-lg border border-border">
          <Button
            type="button"
            variant={!isPaid ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onUpdateField('isPaid', false)}
            className={`flex-1 text-xs font-semibold h-8 ${
              !isPaid ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Free / Donate
          </Button>
          <Button
            type="button"
            variant={isPaid ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onUpdateField('isPaid', true)}
            className={`flex-1 text-xs font-semibold h-8 ${
              isPaid ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Paid Game
          </Button>
        </div>

        {isPaid ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="price-input" className="text-xs font-semibold text-muted-foreground">
                Price (THB / Thai Baht)
              </Label>
              <div className="relative">
                <Input
                  id="price-input"
                  type="number"
                  min="0"
                  step="1"
                  value={price || ''}
                  onChange={(e) => onUpdateField('price', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 150"
                  className="pr-12 font-mono text-sm h-9"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">
                  THB
                </span>
              </div>
            </div>

            {/* Price breakdown */}
            {numericPrice > 0 && (
              <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Price:</span>
                  <span className="font-mono">{numericPrice.toFixed(2)} ฿</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee (10%):</span>
                  <span className="font-mono">-{platformFee.toFixed(2)} ฿</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment Gateway (Stripe):</span>
                  <span className="font-mono">-{stripeFee.toFixed(2)} ฿</span>
                </div>
                <div className="pt-1.5 border-t border-border flex justify-between font-bold text-emerald-500">
                  <span>Net Estimated Payout:</span>
                  <span className="font-mono">{netPayout.toFixed(2)} ฿</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Players can download and play this game free of charge.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
