import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Switch
} from '@/ui';
import {
  Download,
  Upload,
  Link as LinkIcon,
  Loader2,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSdk } from '@/lib/sdk';
import { DownloadItem } from '../../../types/studio.types';

const COMMON_PROVIDERS: Record<string, string> = {
  'drive.google.com': 'Google Drive',
  'mega.nz': 'Mega',
  'mediafire.com': 'MediaFire',
  'pixeldrain.com': 'Pixeldrain',
  'workupload.com': 'Workupload',
  'gofile.io': 'Gofile',
  'steamcommunity.com': 'Steam',
  'store.steampowered.com': 'Steam',
  'itch.io': 'itch.io',
  'patreon.com': 'Patreon',
};

const PLATFORMS_SHORT = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Web'];

interface DownloadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItem?: DownloadItem | null;
  defaultVersion?: string;
  gameSlug?: string;
  onSave: (item: Omit<DownloadItem, 'tempId'>) => void;
}

export const DownloadFileDialog: React.FC<DownloadFileDialogProps> = ({
  open,
  onOpenChange,
  initialItem,
  defaultVersion = '',
  gameSlug = 'game',
  onSave,
}) => {
  const [tab, setTab] = useState<'external' | 'upload'>('external');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [forVersion, setForVersion] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [submitNote, setSubmitNote] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Direct file upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    originalname?: string;
    mimetype?: string;
    size?: number;
    extension?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initialItem) {
        setUrl(initialItem.url || '');
        setName(initialItem.name || '');
        setForVersion(initialItem.forVersion || defaultVersion || '');
        setPlatforms(initialItem.platforms || []);
        setSubmitNote(initialItem.submitNote || initialItem.note || '');
        setIsActive(initialItem.isActive !== false);
        setTab(initialItem.type === 'DIRECT_UPLOAD' || initialItem.url.startsWith('public/') || initialItem.url.startsWith('premium/') ? 'upload' : 'external');
        if (initialItem.fileSizeBytes) {
          setUploadedFileInfo({
            originalname: initialItem.name,
            mimetype: initialItem.mimeType,
            size: initialItem.fileSizeBytes,
            extension: initialItem.extension,
          });
        } else {
          setUploadedFileInfo(null);
        }
      } else {
        setUrl('');
        setName('');
        setForVersion(defaultVersion);
        setPlatforms(['Windows']);
        setSubmitNote('');
        setIsActive(true);
        setTab('external');
        setUploadedFileInfo(null);
      }
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [open, initialItem, defaultVersion]);

  // Auto-detect link name from URL
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (!name && newUrl) {
      try {
        const parsed = new URL(newUrl.startsWith('http') ? newUrl : `https://${newUrl}`);
        const matched = Object.entries(COMMON_PROVIDERS).find(([domain]) =>
          parsed.hostname.includes(domain)
        );
        if (matched) {
          setName(`${matched[1]} Mirror`);
        } else {
          const parts = parsed.hostname.split('.');
          const mainPart = parts.length > 2 ? parts[parts.length - 2] : parts[0];
          setName(`${mainPart.charAt(0).toUpperCase() + mainPart.slice(1)} Mirror`);
        }
      } catch {
        // Invalid URL yet
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const sdk = await getSdk();
      setUploadProgress(40);

      const res = await sdk.storage.uploadMultipart(file, {
        bucket: 'storage',
        path: 'public',
        game: gameSlug || 'temp',
        onProgress: (percent) => setUploadProgress(percent),
      });

      setUploadProgress(100);

      if (res && res.url) {
        setUrl(res.url);
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        setUploadedFileInfo({
          originalname: file.name,
          mimetype: file.type,
          size: file.size,
          extension: ext,
        });
        if (!name) {
          setName(file.name);
        }
        toast.success('File uploaded to storage successfully!');
      } else {
        throw new Error('Upload succeeded but no URL was returned');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleSave = () => {
    if (!url.trim()) {
      toast.error('Please provide a valid download URL or upload a file');
      return;
    }

    const trimmedName = name.trim() || 'Direct Download';

    onSave({
      name: trimmedName,
      url: url.trim(),
      isActive,
      forVersion: forVersion.trim(),
      platforms,
      submitNote: submitNote.trim(),
      type: tab === 'upload' ? 'DIRECT_UPLOAD' : 'EXTERNAL_MIRROR',
      mimeType: uploadedFileInfo?.mimetype,
      extension: uploadedFileInfo?.extension,
      fileSizeBytes: uploadedFileInfo?.size,
      fileSize: uploadedFileInfo?.size
        ? `${(uploadedFileInfo.size / (1024 * 1024)).toFixed(1)} MB`
        : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5 text-primary" />
            {initialItem ? 'Edit Download Link' : 'Add Download Link'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Provide an external mirror link (Google Drive, Mega, etc.) or upload a file directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          {/* Tab Selector */}
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
            <Button
              type="button"
              variant={tab === 'external' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTab('external')}
              className={`flex-1 text-xs font-semibold h-8 ${tab === 'external' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              External Mirror Link
            </Button>
            <Button
              type="button"
              variant={tab === 'upload' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTab('upload')}
              className={`flex-1 text-xs font-semibold h-8 ${tab === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Direct File Upload
            </Button>
          </div>

          {/* TAB 1: EXTERNAL MIRROR */}
          {tab === 'external' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dl-url" className="text-xs font-semibold text-muted-foreground">
                  Mirror URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dl-url"
                  placeholder="https://mega.nz/... or https://drive.google.com/..."
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                {Object.values(COMMON_PROVIDERS).slice(0, 5).map((provider) => (
                  <Button
                    key={provider}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 py-0 border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setName(`${provider} Mirror`)}
                  >
                    {provider}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT UPLOAD */}
          {tab === 'upload' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />

              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20 hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      Uploading to Chanomhub Storage ({uploadProgress}%)
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden max-w-xs mx-auto">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : uploadedFileInfo ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-foreground">
                      {uploadedFileInfo.originalname}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {uploadedFileInfo.size ? `${(uploadedFileInfo.size / (1024 * 1024)).toFixed(1)} MB` : ''} — Ready to attach
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground/60 mx-auto group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-foreground">Click to select game archive</p>
                    <p className="text-[11px] text-muted-foreground">
                      Supports .zip, .rar, .7z, .apk, .tar.gz (Multipart upload)
                    </p>
                  </div>
                )}
              </div>

              {url && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted/40 text-[11px] font-mono text-muted-foreground truncate border border-border">
                  <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{url}</span>
                </div>
              )}
            </div>
          )}

          {/* COMMON FIELDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label htmlFor="dl-name" className="text-xs font-semibold text-muted-foreground">
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dl-name"
                placeholder="e.g. Google Drive Mirror or v1.0.2 Windows"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dl-ver" className="text-xs font-semibold text-muted-foreground">
                For Version
              </Label>
              <Input
                id="dl-ver"
                placeholder="e.g. v1.0 or Final"
                value={forVersion}
                onChange={(e) => setForVersion(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Target Platforms */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Compatible Platforms
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS_SHORT.map((p) => {
                const isSelected = platforms.includes(p);
                return (
                  <Button
                    key={p}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePlatform(p)}
                    className={`h-7 px-2.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Note / Password / Extract Info */}
          <div className="space-y-1.5">
            <Label htmlFor="dl-note" className="text-xs font-semibold text-muted-foreground">
              Password / Extraction Notes (Optional)
            </Label>
            <Input
              id="dl-note"
              placeholder="e.g. Password: chanomhub or Extract with 7-Zip"
              value={submitNote}
              onChange={(e) => setSubmitNote(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div>
              <p className="text-xs font-semibold text-foreground">Link is Active</p>
              <p className="text-[11px] text-muted-foreground">Visible to users on game page</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            {initialItem ? 'Save Changes' : 'Attach Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
