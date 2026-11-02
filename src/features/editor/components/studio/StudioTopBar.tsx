import React from 'react';
import { useNavigate } from 'react-router';
import { Button, Badge } from '@/ui';
import {
  ArrowLeft,
  Save,
  Rocket,
  Eye,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { JsonImportDialog } from './JsonImportDialog';
import { ArticleMode, ArticleStudioFormData } from '../../types/studio.types';

interface StudioTopBarProps {
  mode: ArticleMode;
  formData: ArticleStudioFormData;
  saving: boolean;
  onSaveDraft?: () => void;
  onImportJson: (data: Partial<ArticleStudioFormData>) => void;
  onSubmit: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  mode,
  formData,
  saving,
  onSaveDraft,
  onImportJson,
  onSubmit,
}) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-card/90 backdrop-blur-md border-b border-border flex items-center px-4 md:px-6 gap-3 sticky top-0 z-40 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
        title="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
          {mode === 'create' ? 'New Project' : 'Edit Project'}
        </span>
        <span className="text-muted-foreground/40 hidden sm:inline">/</span>
        <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[200px] md:max-w-[320px]">
          {formData.title || (mode === 'create' ? 'Untitled Project' : 'Untitled Article')}
        </span>
        {mode === 'edit' && formData.ver && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
            {formData.ver}
          </Badge>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* JSON Importer */}
        <JsonImportDialog onImport={onImportJson} />

        {/* Save draft button (in create mode) */}
        {mode === 'create' && onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            className="h-8 px-3 text-xs border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </Button>
        )}

        {/* Preview button */}
        {mode === 'edit' && formData.slug && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/article/${formData.slug}`)}
            className="h-8 px-3 text-xs border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            <span>Preview</span>
          </Button>
        )}

        {/* Primary Action */}
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={saving}
          className="h-8 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5 min-w-[100px] justify-center"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : mode === 'create' ? (
            <>
              <Rocket className="h-3.5 w-3.5" />
              <span>Publish</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
};
