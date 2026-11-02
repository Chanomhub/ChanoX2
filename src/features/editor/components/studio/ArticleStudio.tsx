import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/ui';
import { Loader2 } from 'lucide-react';
import { ArticleStudioProps } from '../../types/studio.types';
import { useArticleStudio } from '../../hooks/useArticleStudio';
import { StudioTopBar } from './StudioTopBar';
import { DraftBanner } from './DraftBanner';
import { IdentitySection } from './sections/IdentitySection';
import { ContentSection } from './sections/ContentSection';
import { MediaSection } from './sections/MediaSection';
import { DownloadsSection } from './sections/DownloadsSection';
import { OfficialStoresSection } from './sections/OfficialStoresSection';
import { DevlogSection } from './sections/DevlogSection';
import { PublishingCard } from './sidebar/PublishingCard';
import { PricingCard } from './sidebar/PricingCard';
import { SpecsCard } from './sidebar/SpecsCard';
import { TaxonomyCard } from './sidebar/TaxonomyCard';
import { HealthCheckCard } from './sidebar/HealthCheckCard';

export const ArticleStudio: React.FC<ArticleStudioProps> = (props) => {
  const { mode, contentType = 'game' } = props;

  const {
    formData,
    loading,
    saving,
    error,
    successMessage,
    showValidationErrors,
    hasSavedDraft,
    isReservingSlug,
    similarArticles,
    availableTags,
    availableCategories,
    availableEngines,
    availableDevelopers,
    healthCheck,
    updateField,
    handleTitleBlur,
    handleRestoreDraft,
    handleDiscardDraft,
    handleManualSaveDraft,
    handleImportJson,
    handleSetCoverUrl,
    handleRemoveCover,
    handleAddScreenshots,
    handleRemoveScreenshot,
    handleReorderScreenshots,
    handleAddDownload,
    handleUpdateDownload,
    handleRemoveDownload,
    handleAddOfficialStore,
    handleRemoveOfficialStore,
    handleSubmit,
  } = useArticleStudio(props);

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          Loading workspace & project data...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-primary/30">
      {/* Top Bar */}
      <StudioTopBar
        mode={mode}
        formData={formData}
        saving={saving}
        onSaveDraft={handleManualSaveDraft}
        onImportJson={handleImportJson}
        onSubmit={() => handleSubmit()}
      />

      {/* Unsaved Draft Banner (Create mode) */}
      {hasSavedDraft && mode === 'create' && !formData.title && (
        <DraftBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      )}

      {/* Main Container */}
      <main className="container mx-auto max-w-[1520px] px-4 md:px-6 py-6 md:py-8">
        {/* Global Notifications */}
        {successMessage && (
          <Alert className="mb-6 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">Success</AlertTitle>
            <AlertDescription className="text-xs mt-1">{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">Error</AlertTitle>
            <AlertDescription className="text-xs mt-1">{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="grid grid-cols-12 gap-6 lg:gap-8"
        >
          {/* LEFT/CENTER: MAIN CANVAS (8 of 12 columns on desktop) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 lg:gap-8">
            {/* 1. Identity */}
            <IdentitySection
              formData={formData}
              mode={mode}
              showValidationErrors={showValidationErrors}
              isReservingSlug={isReservingSlug}
              similarArticles={similarArticles}
              onUpdateField={updateField}
              onTitleBlur={handleTitleBlur}
            />

            {/* 2. Visuals & Media */}
            <MediaSection
              coverImage={formData.coverImage}
              screenshots={formData.otherImages || []}
              videoUrl={formData.videoUrl}
              slug={formData.slug}
              onSetCover={handleSetCoverUrl}
              onRemoveCover={handleRemoveCover}
              onAddScreenshots={handleAddScreenshots}
              onRemoveScreenshot={handleRemoveScreenshot}
              onReorderScreenshots={handleReorderScreenshots}
              onUpdateVideoUrl={(url) => updateField('videoUrl', url)}
            />

            {/* 3. Content Body (Rich Text Editor) */}
            <ContentSection
              content={formData.body}
              slug={formData.slug}
              showValidationErrors={showValidationErrors}
              onUpdate={(html) => updateField('body', html)}
            />

            {/* 4. Downloads & Files */}
            {contentType === 'game' && (
              <DownloadsSection
                downloads={formData.downloads || []}
                defaultVersion={formData.ver}
                gameSlug={formData.slug}
                onAddDownload={handleAddDownload}
                onUpdateDownload={handleUpdateDownload}
                onRemoveDownload={handleRemoveDownload}
              />
            )}

            {/* 5. Official Stores */}
            {contentType === 'game' && (
              <OfficialStoresSection
                items={formData.officialStoreItems || []}
                onAddStore={handleAddOfficialStore}
                onRemoveStore={handleRemoveOfficialStore}
              />
            )}

            {/* 6. Devlog & Patch Notes (Conditional: Edit Mode Only) */}
            {mode === 'edit' && (
              <DevlogSection
                message={formData.message}
                notes={formData.notes}
                onUpdateField={(k, v) => updateField(k, v)}
              />
            )}
          </div>

          {/* RIGHT: INSPECTOR SIDEBAR (4 of 12 columns on desktop) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Publishing Status */}
            <PublishingCard
              status={formData.status}
              favorited={formData.favorited}
              mode={mode}
              onStatusChange={(st) => updateField('status', st)}
              onFavoritedChange={(fav) => updateField('favorited', fav)}
            />

            {/* Pricing & Monetization */}
            <PricingCard
              isPaid={formData.isPaid}
              price={formData.price}
              onUpdateField={(k, v) => updateField(k, v)}
            />

            {/* Game Specs (Platforms, Engine, Developer, Version) */}
            {contentType === 'game' && (
              <SpecsCard
                formData={formData}
                availableEngines={availableEngines}
                availableDevelopers={availableDevelopers}
                showValidationErrors={showValidationErrors}
                onUpdateField={updateField}
              />
            )}

            {/* Genres & Tags */}
            <TaxonomyCard
              categories={formData.categories || []}
              tags={formData.tags || []}
              availableCategories={availableCategories}
              availableTags={availableTags}
              title={formData.title}
              description={formData.description}
              onUpdateCategories={(cats) => updateField('categories', cats)}
              onUpdateTags={(tgs) => updateField('tags', tgs)}
            />

            {/* Project Health Checklist */}
            <HealthCheckCard healthCheck={healthCheck} />
          </div>
        </form>
      </main>
    </div>
  );
};

export default ArticleStudio;
