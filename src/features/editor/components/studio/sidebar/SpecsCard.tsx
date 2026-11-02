import React from 'react';
import {
  Card,
  CardContent,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@/ui';
import { Gamepad2, Monitor, Smartphone, Globe, Layers, UserCheck } from 'lucide-react';
import { ArticleStudioFormData } from '../../../types/studio.types';

interface SpecsCardProps {
  formData: ArticleStudioFormData;
  availableEngines: { id: number; name: string }[];
  availableDevelopers: { id: number; name: string }[];
  showValidationErrors: boolean;
  onUpdateField: <K extends keyof ArticleStudioFormData>(key: K, val: ArticleStudioFormData[K]) => void;
}

const PLATFORMS_ALL = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Web'];

export const SpecsCard: React.FC<SpecsCardProps> = ({
  formData,
  availableEngines = [],
  availableDevelopers = [],
  showValidationErrors,
  onUpdateField,
}) => {
  const togglePlatform = (platform: string) => {
    const current = formData.platforms || [];
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    onUpdateField('platforms', next);
  };

  const getPlatformIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('win') || lower.includes('mac') || lower.includes('linux')) {
      return <Monitor className="h-3.5 w-3.5" />;
    }
    if (lower.includes('android') || lower.includes('ios')) {
      return <Smartphone className="h-3.5 w-3.5" />;
    }
    return <Globe className="h-3.5 w-3.5" />;
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Game Specifications
          </h3>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Platforms */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Supported Platforms <span className="text-destructive">*</span></span>
            <span className="text-[10px] text-muted-foreground/70 font-normal">Pick all that apply</span>
          </Label>
          <div className="grid grid-cols-3 gap-1.5">
            {PLATFORMS_ALL.map((p) => {
              const isSelected = formData.platforms?.some(
                (pVal) => (typeof pVal === 'string' ? pVal : (pVal as any)?.name)?.toLowerCase() === p.toLowerCase()
              );
              return (
                <Button
                  key={p}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center justify-center gap-1.5 h-9 px-2 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary shadow-sm hover:bg-primary/20'
                      : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {getPlatformIcon(p)}
                  <span className="truncate">{p}</span>
                </Button>
              );
            })}
          </div>
          {showValidationErrors && (!formData.platforms || formData.platforms.length === 0) && (
            <p className="text-[10px] text-destructive font-medium">Please select at least one platform.</p>
          )}
        </div>

        {/* Creator / Studio Name */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <Label htmlFor="creator-input" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            Creator / Studio <span className="text-destructive">*</span>
          </Label>
          <Input
            id="creator-input"
            value={formData.creator || ''}
            onChange={(e) => onUpdateField('creator', e.target.value)}
            placeholder="e.g. PixelWorks or Solo Dev"
            className={`h-9 text-xs ${showValidationErrors && !formData.creator ? 'border-destructive ring-1 ring-destructive' : ''}`}
          />
        </div>

        {/* Link to Verified Developer */}
        {availableDevelopers.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Verified Developer Link (Optional)
            </Label>
            <Select
              value={formData.creatorUserId ? String(formData.creatorUserId) : 'none'}
              onValueChange={(val) =>
                onUpdateField('creatorUserId', val === 'none' ? null : Number(val))
              }
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="-- None --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {availableDevelopers.map((dev) => (
                  <SelectItem key={dev.id} value={String(dev.id)}>
                    {dev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Engine */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Game Engine
          </Label>
          <Select
            value={typeof formData.engine === 'string' ? formData.engine : ((formData.engine as any)?.name || 'none')}
            onValueChange={(val) => onUpdateField('engine', val === 'none' ? null : val)}
          >
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Select engine..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Select Engine --</SelectItem>
              {availableEngines.map((eng) => (
                <SelectItem key={eng.id} value={eng.name}>
                  {eng.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Version & Code */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Version</Label>
            <Input
              value={formData.ver || ''}
              onChange={(e) => onUpdateField('ver', e.target.value)}
              placeholder="v1.0"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Seq. Code</Label>
            <Input
              value={formData.sequentialCode || ''}
              onChange={(e) => onUpdateField('sequentialCode', e.target.value)}
              placeholder="HJ-001"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
