import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea
} from '@/ui';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Video as VideoIcon,
  Loader2,
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { getSdk } from '@/lib/sdk';
import { resolveArticleImageUrl } from '@/lib/articleImageUrl';

interface MediaSectionProps {
  coverImage: string | null | undefined;
  screenshots: string[];
  videoUrl?: string;
  slug?: string;
  onSetCover: (url: string) => void;
  onRemoveCover: () => void;
  onAddScreenshots: (urls: string[]) => void;
  onRemoveScreenshot: (index: number) => void;
  onReorderScreenshots: (startIndex: number, endIndex: number) => void;
  onUpdateVideoUrl: (url: string) => void;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  coverImage,
  screenshots = [],
  videoUrl = '',
  slug = 'temp',
  onSetCover,
  onRemoveCover,
  onAddScreenshots,
  onRemoveScreenshot,
  onReorderScreenshots,
  onUpdateVideoUrl,
}) => {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [batchUrlInput, setBatchUrlInput] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);

  const resolvedCover = resolveArticleImageUrl(coverImage);

  // Cover Image file upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const sdk = await getSdk();
      const res = await sdk.storage.upload(file, { bucket: 'images', path: 'cover', game: slug || 'temp' });
      const fullUrl = (res as any).full_url || resolveArticleImageUrl(res.url) || res.url;
      onSetCover(fullUrl);
      toast.success('Cover image uploaded');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      toast.error(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Screenshots multi-file upload
  const handleScreenshotsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingScreenshots(true);
    try {
      const sdk = await getSdk();
      const uploadPromises = Array.from(files).map((file) =>
        sdk.storage.upload(file, { bucket: 'images', path: 'gallery', game: slug || 'temp' })
      );

      const results = await Promise.all(uploadPromises);
      const urls = results
        .map((r) => (r as any).full_url || resolveArticleImageUrl(r.url) || r.url)
        .filter(Boolean);

      onAddScreenshots(urls);
      toast.success(`Uploaded ${urls.length} screenshot(s)`);
    } catch (err: any) {
      console.error('Screenshots upload error:', err);
      toast.error(err.message || 'Failed to upload screenshots');
    } finally {
      setUploadingScreenshots(false);
      if (screenshotsInputRef.current) screenshotsInputRef.current.value = '';
    }
  };

  // Batch paste external image URLs
  const handleBatchUrlSubmit = () => {
    if (!batchUrlInput.trim()) return;
    const lines = batchUrlInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('http://') || l.startsWith('https://'));

    if (lines.length > 0) {
      onAddScreenshots(lines);
      setBatchUrlInput('');
      setIsUrlModalOpen(false);
      toast.success(`Added ${lines.length} image link(s)`);
    } else {
      toast.error('No valid URLs found. Make sure each starts with http:// or https://');
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Media & Visual Assets</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {screenshots.length} Screenshots
        </span>
      </div>

      <CardContent className="p-6 md:p-8 space-y-8">
        {/* 1. Main Cover Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5">
              Primary Cover Banner <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">16:9 Aspect Ratio recommended</span>
          </div>

          <div className="relative group">
            {resolvedCover ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30">
                {/* @image-allow-native-img: Editor media thumbnail preview */}
                {/* @image-allow-unoptimized: Dynamic user-uploaded preview */}
                <img
                  src={resolvedCover}
                  alt="Cover Preview"
                  className="w-full h-full object-cover transition-transform group-hover:scale-[1.02] duration-300"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <input
                    type="file"
                    ref={coverInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="h-8 text-xs font-semibold"
                  >
                    {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                    Change Cover
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={onRemoveCover}
                    className="h-8 text-xs font-semibold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-muted/10 group"
                onClick={() => !uploadingCover && coverInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={coverInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                />
                {uploadingCover ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground">Uploading cover...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-foreground">Click to upload cover image</p>
                    <p className="text-[11px] text-muted-foreground">16:9 ratio (e.g. 1280x720) works best</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. Gameplay Screenshots Gallery */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
                Screenshot Gallery
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Upload or paste image links showing gameplay, story, and art
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={screenshotsInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleScreenshotsUpload}
                disabled={uploadingScreenshots}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUrlModalOpen(true)}
                className="h-8 text-xs border-border bg-card hover:bg-muted"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                Add via URL
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => screenshotsInputRef.current?.click()}
                disabled={uploadingScreenshots}
                className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {uploadingScreenshots ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Upload Images
              </Button>
            </div>
          </div>

          {screenshots.length === 0 ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/10 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => screenshotsInputRef.current?.click()}
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">No screenshots added yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Click to upload multiple screenshots (3–5 recommended)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {screenshots.map((url, idx) => {
                const resolved = resolveArticleImageUrl(url) || url;
                return (
                  <div
                    key={`${url}-${idx}`}
                    className="group relative aspect-video rounded-md overflow-hidden border border-border bg-muted/40 shadow-xs"
                  >
                    {/* @image-allow-native-img: Editor media thumbnail preview */}
                    {/* @image-allow-unoptimized: Dynamic user-uploaded preview */}
                    <img
                      src={resolved}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                    />

                    {/* Order Badge */}
                    <Badge
                      variant="secondary"
                      className="absolute top-1.5 left-1.5 h-4 px-1 text-[10px] bg-black/70 text-white border-none font-mono"
                    >
                      #{idx + 1}
                    </Badge>

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 text-xs"
                        disabled={idx === 0}
                        onClick={() => onReorderScreenshots(idx, idx - 1)}
                        title="Move left"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 text-xs"
                        onClick={() => onRemoveScreenshot(idx)}
                        title="Remove screenshot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 text-xs"
                        disabled={idx === screenshots.length - 1}
                        onClick={() => onReorderScreenshots(idx, idx + 1)}
                        title="Move right"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Trailer / Gameplay Video Embed */}
        <div className="space-y-2 pt-4 border-t border-border">
          <Label
            htmlFor="video-url"
            className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5"
          >
            <VideoIcon className="h-3.5 w-3.5 text-primary" />
            Trailer Video URL (YouTube, Vimeo)
          </Label>
          <Input
            id="video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => onUpdateVideoUrl(e.target.value)}
            className="h-9 text-xs font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Paste a standard YouTube or video embed link. It will show a dedicated video player on your game page.
          </p>
        </div>
      </CardContent>

      {/* External Image URLs Modal */}
      <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <LinkIcon className="h-5 w-5 text-primary" />
              Add Image URLs (Batch)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Paste direct image URLs (one per line). Supported: JPG, PNG, WebP, GIF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              rows={6}
              value={batchUrlInput}
              onChange={(e) => setBatchUrlInput(e.target.value)}
              placeholder="https://images.example.com/screenshot1.jpg&#10;https://images.example.com/screenshot2.jpg"
              className="font-mono text-xs bg-muted/20 border-input"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsUrlModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBatchUrlSubmit}
              className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Add Images
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
