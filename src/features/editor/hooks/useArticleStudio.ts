import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { getSdk } from '@/lib/sdk';
import { resolveArticleImageUrl } from '@/lib/articleImageUrl';
import { engines as defaultEngines, platforms as defaultPlatforms } from '@/lib/gameData';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArticleStudioFormData,
  ArticleStudioProps,
  DownloadItem,
  OfficialStoreItem,
} from '../types/studio.types';

const DRAFT_STORAGE_KEY = 'chanox2_game_upload_draft';
const API_URL = import.meta.env.VITE_API_URL || 'https://api.chanomhub.com';

export function useArticleStudio({
  mode,
  slug = '',
  initialData,
  contentType = 'game',
  availableTags: initialTags,
  availableCategories: initialCategories,
  availablePlatforms: initialPlatforms,
  availableEngines: initialEngines,
  onSuccess,
}: ArticleStudioProps) {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<ArticleStudioFormData>({
    id: (initialData as any)?.id || null,
    title: initialData?.title || '',
    slug: mode === 'edit' ? slug : (initialData?.slug || ''),
    description: initialData?.description || '',
    body: initialData?.body || '',
    creator: typeof initialData?.creator === 'string' ? initialData.creator : (initialData?.creator?.name || ''),
    creatorUserId: initialData?.creatorUserId || null,
    ver: initialData?.ver || '',
    sequentialCode: initialData?.sequentialCode || '',
    engine: typeof initialData?.engine === 'string' ? initialData.engine : (initialData?.engine?.name || null),
    tags: Array.isArray(initialData?.tags)
      ? initialData.tags.map((t: any) => (typeof t === 'string' ? t : t?.tag?.name || t?.name || '')).filter(Boolean)
      : [],
    categories: Array.isArray(initialData?.categories)
      ? initialData.categories.map((c: any) => (typeof c === 'string' ? c : c?.category?.name || c?.name || '')).filter(Boolean)
      : [],
    platforms: Array.isArray(initialData?.platforms)
      ? initialData.platforms.map((p: any) => (typeof p === 'string' ? p : p?.platform?.name || p?.name || '')).filter(Boolean)
      : (contentType === 'game' ? ['Windows'] : []),
    status: initialData?.status || 'DRAFT',
    favorited: initialData?.favorited || false,
    favoritesCount: initialData?.favoritesCount || 0,
    coverImage: initialData?.coverImage || null,
    coverImageId: null,
    mainImage: initialData?.mainImage || null,
    backgroundImage: initialData?.backgroundImage || null,
    otherImages: initialData?.otherImages || [],
    videoUrl: initialData?.videoUrl || '',
    message: initialData?.message || '',
    notes: initialData?.notes || '',
    downloads: [],
    officialStoreItems: [],
    updatedAt: initialData?.updatedAt,
  });

  const [availableTags, setAvailableTags] = useState<string[]>(initialTags || []);
  const [availableCategories, setAvailableCategories] = useState<string[]>(initialCategories || []);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>(
    initialPlatforms || defaultPlatforms
  );
  const [availableEngines, setAvailableEngines] = useState<{ id: number; name: string }[]>(
    initialEngines || defaultEngines.map((name, idx) => ({ id: idx + 1, name }))
  );
  const [availableDevelopers, setAvailableDevelopers] = useState<{ id: number; name: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);
  const [isReservingSlug, setIsReservingSlug] = useState<boolean>(false);
  const [similarArticles, setSimilarArticles] = useState<
    { id: number; title: string; slug: string; ver: string | null }[]
  >([]);

  // Advisory check for duplicate titles
  useEffect(() => {
    if (mode !== 'create') return;
    const title = (formData.title || '').trim();
    if (title.length < 3) {
      setSimilarArticles([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const sdk = await getSdk();
        const res = await sdk.articles.getAllPaginated({ limit: 5, filter: { q: title } });
        setSimilarArticles(res.items || []);
      } catch {
        // advisory check failed — stay silent
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.title, mode]);

  const initialDraftCheckDone = useRef(false);
  const originalStatusRef = useRef<string | null>(null);

  // 1. Initial Data Fetching & Taxonomy Setup
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setLoading(true);

        const currentToken = token || (await getSdk()).config.token || localStorage.getItem('token');
        if (!currentToken && !isAuthenticated) {
          toast.error('Authentication required. Redirecting to login...');
          navigate(`/login`);
          return;
        }

        const sdk = await getSdk();
        if (currentToken && !sdk.config.token) {
          sdk.config.token = currentToken;
        }

        // Fetch Taxonomies concurrently if not already provided
        const promises: Promise<any>[] = [];
        if (!initialTags) promises.push(sdk.articles.getTags().catch(() => []));
        if (!initialCategories) promises.push(sdk.articles.getCategories().catch(() => []));
        if (!initialPlatforms) promises.push(sdk.articles.getPlatforms().catch(() => defaultPlatforms));
        if (!initialEngines) promises.push(sdk.articles.getEngines().catch(() => []));
        promises.push(sdk.developer.listVerifiedDevelopers().catch(() => []));

        const results = await Promise.all(promises);
        let cursor = 0;
        if (!initialTags && isMounted) setAvailableTags(results[cursor++] || []);
        if (!initialCategories && isMounted) setAvailableCategories(results[cursor++] || []);
        if (!initialPlatforms && isMounted) setAvailablePlatforms(results[cursor++] || defaultPlatforms);
        if (!initialEngines && isMounted) {
          const rawEngines = results[cursor++];
          if (Array.isArray(rawEngines) && rawEngines.length > 0) {
            setAvailableEngines(rawEngines.map((e: any) => ({ id: Number(e.id || 0), name: e.name || String(e) })));
          }
        }
        if (isMounted) {
          setAvailableDevelopers(results[cursor++] || []);
        }

        // 2. If in Edit Mode, fetch article details
        if (mode === 'edit' && slug) {
          const response = await fetch(
            `${API_URL}/api/articles/${slug}`,
            {
              headers: {
                Authorization: currentToken ? `Bearer ${currentToken}` : '',
              },
            }
          );

          if (response.status === 401) {
            toast.error('Authentication required. Redirecting...');
            navigate(`/login`);
            return;
          }

          if (!response.ok) throw new Error('Failed to load article data');
          const resData = await response.json();
          const article = resData.data?.article || resData.article || resData;

          if (article && isMounted) {
            // Map downloads
            const mappedDownloads: DownloadItem[] = (article.downloads || []).map((dl: any) => ({
              id: dl.id,
              tempId: `dl-${dl.id || Math.random().toString(36).slice(2, 8)}`,
              name: dl.name || '',
              url: dl.url || '',
              isActive: dl.isActive !== false,
              forVersion: dl.forVersion || '',
              fileSize: dl.fileSize || '',
              fileSizeBytes: dl.fileSizeBytes,
              mimeType: dl.mimeType,
              extension: dl.extension,
              submitNote: dl.submitNote || dl.note || '',
              syncStatus: 'synced',
            }));

            // Map official purchase sources
            const mappedOfficialStores: OfficialStoreItem[] = (
              article.officialDownloadSources ||
              article.authorizedPurchaseSources ||
              []
            ).map((src: any) => ({
              id: src.id,
              tempId: `official-${src.id || Math.random().toString(36).slice(2, 8)}`,
              name: src.name || '',
              url: src.url || '',
              submitNote: src.submitNote || '',
              status: src.status || 'PENDING',
              syncStatus: 'synced',
            }));

            const rawImages = article.images || article.otherImages || [];
            const otherImages = Array.isArray(rawImages)
              ? rawImages.map((img: any) => {
                  const url = typeof img === 'string' ? img : img.url;
                  return resolveArticleImageUrl(url) || url;
                })
              : [];

            const normalizedTags = Array.isArray(article.tags)
              ? article.tags.map((t: any) => (typeof t === 'string' ? t : t?.tag?.name || t?.name || '')).filter(Boolean)
              : [];

            const normalizedCategories = Array.isArray(article.categories)
              ? article.categories.map((c: any) => (typeof c === 'string' ? c : c?.category?.name || c?.name || '')).filter(Boolean)
              : [];

            const normalizedPlatforms = Array.isArray(article.platforms)
              ? article.platforms.map((p: any) => (typeof p === 'string' ? p : p?.platform?.name || p?.name || '')).filter(Boolean)
              : [];

            const normalizedEngine = typeof article.engine === 'string'
              ? article.engine
              : (article.engine?.name || null);

            const normalizedCreator = typeof article.creator === 'string'
              ? article.creator
              : (article.creators?.[0]?.creator?.name || article.creators?.[0]?.name || article.creator?.name || article.developer || '');

            setFormData({
              id: article.id,
              title: article.title || '',
              slug: article.slug || slug,
              description: article.description || '',
              body: article.body || '',
              creator: normalizedCreator,
              creatorUserId: article.creatorUserId || null,
              ver: article.ver || article.version || '',
              sequentialCode: article.sequentialCode || '',
              engine: normalizedEngine,
              tags: normalizedTags,
              categories: normalizedCategories,
              platforms: normalizedPlatforms,
              status: article.status || 'DRAFT',
              favorited: article.favorited || false,
              favoritesCount: article.favoritesCount || 0,
              coverImage: resolveArticleImageUrl(article.coverImage) || article.coverImage || null,
              mainImage: resolveArticleImageUrl(article.mainImage) || article.mainImage || null,
              backgroundImage: resolveArticleImageUrl(article.backgroundImage) || article.backgroundImage || null,
              otherImages,
              videoUrl: article.videoUrl || '',
              message: article.message || '',
              notes: article.notes || '',
              downloads: mappedDownloads,
              officialStoreItems: mappedOfficialStores,
              updatedAt: article.updatedAt || article.createdAt,
            });

            originalStatusRef.current = article.status || 'DRAFT';
          }
        }
      } catch (err: any) {
        console.error('Studio initialization error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize editor');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [mode, slug, token, isAuthenticated, navigate, initialTags, initialCategories, initialPlatforms, initialEngines]);

  // 3. Draft management for Create mode
  useEffect(() => {
    if (mode === 'create' && !initialDraftCheckDone.current && typeof window !== 'undefined') {
      initialDraftCheckDone.current = true;
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.title || parsed.description || parsed.body)) {
            setHasSavedDraft(true);
          }
        }
      } catch (e) {
        console.error('Failed to read draft from localStorage:', e);
      }
    }
  }, [mode]);

  // Auto-save draft changes to localStorage in create mode
  useEffect(() => {
    if (mode === 'create' && typeof window !== 'undefined') {
      if (formData.title || formData.description || formData.body || formData.coverImage) {
        const timer = setTimeout(() => {
          try {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
          } catch (e) {
            console.error('Failed to auto-save draft:', e);
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [formData, mode]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
        }));
        setHasSavedDraft(false);
        toast.success('Previous draft restored successfully!');
      }
    } catch {
      toast.error('Failed to restore draft.');
    }
  }, []);

  const handleDiscardDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasSavedDraft(false);
      toast.info('Saved draft discarded.');
    } catch {}
  }, []);

  const handleManualSaveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      toast.success('Draft saved to local storage!');
    } catch {
      toast.error('Failed to save draft.');
    }
  }, [formData]);

  // 4. Update Field Helper
  const updateField = useCallback(
    <K extends keyof ArticleStudioFormData>(field: K, value: ArticleStudioFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (showValidationErrors && value) {
        setShowValidationErrors(false);
      }
    },
    [showValidationErrors]
  );

  // 5. Slug auto-reservation on Title Blur
  const handleTitleBlur = useCallback(async () => {
    if (mode === 'create' && formData.title && !formData.slug) {
      setIsReservingSlug(true);
      try {
        const sdk = await getSdk();
        const data = await sdk.articles.reserveSlug(formData.title);
        if (data && data.slug) {
          setFormData((prev) => ({ ...prev, slug: data.slug }));
        }
      } catch (err) {
        console.error('Failed to reserve slug via SDK', err);
      } finally {
        setIsReservingSlug(false);
      }
    }
  }, [mode, formData.title, formData.slug]);

  // 6. JSON Import
  const handleImportJson = useCallback((imported: Partial<ArticleStudioFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...imported,
      downloads: imported.downloads
        ? imported.downloads.map((d, idx) => ({
            ...d,
            tempId: d.tempId || `dl-imported-${Date.now()}-${idx}`,
            isActive: d.isActive !== false,
            syncStatus: 'new' as const,
          }))
        : prev.downloads,
      officialStoreItems: imported.officialStoreItems
        ? imported.officialStoreItems.map((s, idx) => ({
            ...s,
            tempId: s.tempId || `official-imported-${Date.now()}-${idx}`,
            syncStatus: 'new' as const,
          }))
        : prev.officialStoreItems,
    }));
    toast.success('Data imported successfully!');
  }, []);

  // 7. Cover Image Management
  const handleSetCoverUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const resolved = resolveArticleImageUrl(trimmed) || trimmed;
    setFormData((prev) => ({
      ...prev,
      coverImage: resolved,
    }));
    toast.success('Cover image updated');
  }, []);

  const handleRemoveCover = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      coverImage: null,
      coverImageId: null,
    }));
    toast.info('Cover image removed');
  }, []);

  // 8. Screenshot Gallery Management
  const handleAddScreenshots = useCallback((urls: string[]) => {
    if (!urls || urls.length === 0) return;
    const cleaned = urls.map((u) => resolveArticleImageUrl(u.trim()) || u.trim()).filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      otherImages: Array.from(new Set([...(prev.otherImages || []), ...cleaned])),
    }));
    toast.success(`Added ${cleaned.length} screenshot(s)`);
  }, []);

  const handleRemoveScreenshot = useCallback((index: number) => {
    setFormData((prev) => {
      const nextImages = [...(prev.otherImages || [])];
      nextImages.splice(index, 1);
      return { ...prev, otherImages: nextImages };
    });
  }, []);

  const handleReorderScreenshots = useCallback((startIndex: number, endIndex: number) => {
    setFormData((prev) => {
      const nextImages = [...(prev.otherImages || [])];
      const [removed] = nextImages.splice(startIndex, 1);
      nextImages.splice(endIndex, 0, removed);
      return { ...prev, otherImages: nextImages };
    });
  }, []);

  // 9. Downloads Management
  const handleAddDownload = useCallback(
    async (item: Omit<DownloadItem, 'tempId'>) => {
      const tempId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: DownloadItem = {
        ...item,
        tempId,
        syncStatus: formData.id ? 'saving' : 'new',
      };

      setFormData((prev) => ({
        ...prev,
        downloads: [...prev.downloads, newItem],
      }));

      if (formData.id) {
        try {
          const sdk = await getSdk();
          const created = await sdk.downloads.create({
            articleId: Number(formData.id),
            name: newItem.name,
            url: newItem.url || 'https://example.com',
            forVersion: newItem.forVersion,
            mimeType: newItem.mimeType,
            extension: newItem.extension,
            fileSizeBytes: newItem.fileSizeBytes,
          });

          if (created && created.id) {
            setFormData((prev) => ({
              ...prev,
              downloads: prev.downloads.map((d) =>
                d.tempId === tempId ? { ...d, id: created.id, syncStatus: 'synced' } : d
              ),
            }));
            toast.success('Download link created');
          }
        } catch (err: any) {
          console.error('Failed to create download:', err);
          setFormData((prev) => ({
            ...prev,
            downloads: prev.downloads.map((d) =>
              d.tempId === tempId ? { ...d, syncStatus: 'error' } : d
            ),
          }));
          toast.error(err.message || 'Failed to sync download to server');
        }
      } else {
        toast.success('Download added to project');
      }
    },
    [formData.id]
  );

  const handleUpdateDownload = useCallback(
    async (tempId: string, updates: Partial<DownloadItem>) => {
      setFormData((prev) => ({
        ...prev,
        downloads: prev.downloads.map((d) =>
          d.tempId === tempId ? { ...d, ...updates, syncStatus: formData.id ? 'saving' : 'new' } : d
        ),
      }));

      const target = formData.downloads.find((d) => d.tempId === tempId);
      if (formData.id && target && target.id) {
        try {
          const sdk = await getSdk();
          await sdk.downloads.update(target.id, {
            name: updates.name ?? target.name,
            url: updates.url ?? target.url,
            isActive: updates.isActive ?? target.isActive,
            forVersion: updates.forVersion ?? target.forVersion,
            mimeType: updates.mimeType ?? target.mimeType,
            extension: updates.extension ?? target.extension,
            fileSizeBytes: updates.fileSizeBytes ?? target.fileSizeBytes,
          });

          setFormData((prev) => ({
            ...prev,
            downloads: prev.downloads.map((d) =>
              d.tempId === tempId ? { ...d, syncStatus: 'synced' } : d
            ),
          }));
        } catch (err) {
          console.error('Failed to update download:', err);
          setFormData((prev) => ({
            ...prev,
            downloads: prev.downloads.map((d) =>
              d.tempId === tempId ? { ...d, syncStatus: 'error' } : d
            ),
          }));
        }
      }
    },
    [formData.id, formData.downloads]
  );

  const handleRemoveDownload = useCallback(
    async (tempId: string) => {
      const target = formData.downloads.find((d) => d.tempId === tempId);
      setFormData((prev) => ({
        ...prev,
        downloads: prev.downloads.filter((d) => d.tempId !== tempId),
      }));

      if (formData.id && target && target.id) {
        try {
          const sdk = await getSdk();
          await sdk.downloads.delete(target.id);
          toast.success('Download removed');
        } catch (err) {
          console.error('Failed to delete download:', err);
          toast.error('Failed to delete download from server');
        }
      }
    },
    [formData.id, formData.downloads]
  );

  // 10. Official Store Links Management
  const handleAddOfficialStore = useCallback(
    async (store: Omit<OfficialStoreItem, 'tempId'>) => {
      const tempId = `official-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: OfficialStoreItem = {
        ...store,
        tempId,
        syncStatus: formData.id ? 'saving' : 'new',
      };

      setFormData((prev) => ({
        ...prev,
        officialStoreItems: [...prev.officialStoreItems, newItem],
      }));

      if (formData.id) {
        try {
          const sdk = await getSdk();
          const currentToken = token || sdk.config.token || localStorage.getItem('token');
          const response = await fetch(
            `${API_URL}/api/official-download-sources`,
            {
              method: 'POST',
              headers: {
                Authorization: currentToken ? `Bearer ${currentToken}` : '',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                articleId: Number(formData.id),
                name: newItem.name.trim(),
                url: newItem.url.trim(),
                submitNote: newItem.submitNote || 'Added via Studio',
              }),
            }
          );
          if (response.ok) {
            const resData = await response.json();
            const created = resData.officialDownloadSource;
            setFormData((prev) => ({
              ...prev,
              officialStoreItems: prev.officialStoreItems.map((s) =>
                s.tempId === tempId
                  ? { ...s, id: created?.id, status: created?.status || 'PENDING', syncStatus: 'synced' }
                  : s
              ),
            }));
            toast.success('Official store link submitted');
          }
        } catch (err) {
          console.error('Failed to save official source:', err);
        }
      } else {
        toast.success('Store link added');
      }
    },
    [formData.id, token]
  );

  const handleRemoveOfficialStore = useCallback(
    async (tempId: string) => {
      const target = formData.officialStoreItems.find((s) => s.tempId === tempId);
      setFormData((prev) => ({
        ...prev,
        officialStoreItems: prev.officialStoreItems.filter((s) => s.tempId !== tempId),
      }));

      if (formData.id && target && target.id) {
        try {
          const sdk = await getSdk();
          const currentToken = token || sdk.config.token || localStorage.getItem('token');
          await fetch(
            `${API_URL}/api/official-download-sources/${target.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: currentToken ? `Bearer ${currentToken}` : '',
              },
            }
          );
          toast.success('Store link removed');
        } catch (err) {
          console.error('Failed to remove official source:', err);
        }
      }
    },
    [formData.id, formData.officialStoreItems, token]
  );

  // 11. Health Check & Validation
  const healthCheck = useMemo(() => {
    const isGame = contentType === 'game';
    const items = [
      { label: 'Title & Slug', done: Boolean(formData.title && formData.slug), required: true },
      { label: 'Short Description', done: Boolean(formData.description?.trim()), required: true },
      { label: 'Content Body', done: Boolean(formData.body && formData.body !== '<p></p>'), required: true },
      { label: 'Creator Name', done: Boolean(formData.creator?.trim()), required: true },
      { label: 'Cover Image', done: Boolean(formData.coverImage), required: isGame },
      {
        label: 'Platform Selected',
        done: isGame ? Boolean(formData.platforms && formData.platforms.length > 0) : true,
        required: isGame,
      },
      {
        label: 'Downloads / Files',
        done: isGame ? Boolean(formData.downloads && formData.downloads.length > 0) : true,
        required: isGame,
      },
      {
        label: 'Tags & Genre',
        done: Boolean((formData.tags?.length || 0) + (formData.categories?.length || 0) > 0),
        required: false,
      },
      {
        label: 'Screenshots Gallery',
        done: Boolean(formData.otherImages && formData.otherImages.length >= 3),
        required: false,
      },
    ];

    const requiredItems = items.filter((i) => i.required);
    const isComplete = requiredItems.every((i) => i.done);

    return { isComplete, items };
  }, [formData, contentType]);

  // 12. Main Submission Handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      const missing: string[] = [];
      if (!formData.title?.trim()) missing.push('Title');
      if (!formData.description?.trim()) missing.push('Short Description');
      if (!formData.body || formData.body === '<p></p>') missing.push('Content Body');
      if (!formData.creator?.trim()) missing.push('Creator');
      if (contentType === 'game' && (!formData.platforms || formData.platforms.length === 0)) {
        missing.push('Platforms');
      }

      if (missing.length > 0) {
        setShowValidationErrors(true);
        setError(`Please fill in all required fields: ${missing.join(', ')}`);
        toast.error(`Please complete: ${missing.join(', ')}`);
        return;
      }

      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const sdk = await getSdk();
        const currentToken = token || sdk.config.token || localStorage.getItem('token');
        if (currentToken && !sdk.config.token) {
          sdk.config.token = currentToken;
        }

        const articlePayload: Record<string, any> = {
          title: formData.title,
          slug: formData.slug || undefined,
          description: formData.description,
          body: formData.body,
          creator: formData.creator,
          creatorUserId: formData.creatorUserId || null,
          ver: formData.ver,
          sequentialCode: formData.sequentialCode,
          engine: formData.engine,
          tags: formData.tags,
          categories: formData.categories,
          platforms: formData.platforms,
          language: 'en',
          ...(mode === 'edit' && formData.status !== originalStatusRef.current
            ? { status: formData.status }
            : mode === 'create'
              ? { status: formData.status }
              : {}),
          favorited: formData.favorited,
          coverImage: formData.coverImage,
          mainImage: formData.mainImage || formData.coverImage,
          backgroundImage: formData.backgroundImage,
          otherImages: formData.otherImages,
          videoUrl: formData.videoUrl,
          ...(mode === 'edit' && { message: formData.message }),
          ...(mode === 'edit' && { notes: formData.notes }),
        };

        // Remove undefined fields
        Object.keys(articlePayload).forEach(
          (key) => articlePayload[key] === undefined && delete articlePayload[key]
        );

        if (mode === 'create') {
          // 1. Create Article
          const res = await sdk.articles.create(articlePayload as any);
          const newArticleId = res.id || (res as any).article?.id;
          const finalSlug = res.slug || formData.slug;

          // 2. Attach pending Downloads
          if (newArticleId && formData.downloads.length > 0) {
            for (const dl of formData.downloads) {
              let dlUrl = dl.url?.trim() || '';
              if (
                !dlUrl.startsWith('http://') &&
                !dlUrl.startsWith('https://') &&
                !dlUrl.startsWith('public/') &&
                !dlUrl.startsWith('premium/')
              ) {
                dlUrl = 'https://' + dlUrl;
              }
              try {
                await fetch(
                  `${API_URL}/api/downloads`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: currentToken ? `Bearer ${currentToken}` : '',
                    },
                    body: JSON.stringify({
                      articleId: newArticleId,
                      name: dl.name,
                      url: dlUrl,
                      type: dl.type || 'EXTERNAL_MIRROR',
                      isActive: dl.isActive !== false,
                      forVersion: dl.forVersion || formData.ver,
                      note: dl.submitNote || dl.note,
                      mimeType: dl.mimeType,
                      extension: dl.extension,
                      fileSizeBytes: dl.fileSizeBytes,
                    }),
                  }
                );
              } catch (e) {
                console.error('Error attaching download:', e);
              }
            }
          }

          // 3. Attach pending Official Stores
          if (newArticleId && formData.officialStoreItems.length > 0) {
            for (const src of formData.officialStoreItems) {
              let srcUrl = src.url?.trim() || '';
              if (!srcUrl.startsWith('http://') && !srcUrl.startsWith('https://')) {
                srcUrl = 'https://' + srcUrl;
              }
              try {
                await fetch(
                  `${API_URL}/api/official-download-sources`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: currentToken ? `Bearer ${currentToken}` : '',
                    },
                    body: JSON.stringify({
                      articleId: newArticleId,
                      name: src.name,
                      url: srcUrl,
                      submitNote: src.submitNote || 'Added via Studio',
                    }),
                  }
                );
              } catch (e) {
                console.error('Error attaching official source:', e);
              }
            }
          }

          // Clear local draft
          try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          } catch {}

          toast.success('Project published successfully!');
          if (onSuccess) {
            onSuccess(finalSlug);
          } else {
            navigate(`/article/${finalSlug}`);
          }
        } else {
          // Edit mode: PUT update
          const response = await fetch(
            `${API_URL}/api/articles/${slug}`,
            {
              method: 'PUT',
              headers: {
                Authorization: currentToken ? `Bearer ${currentToken}` : '',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ article: articlePayload }),
            }
          );

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (response.status === 403) {
              toast.error('You do not have permission to edit this article.');
              return;
            }
            throw new Error(errData.message || `Update failed with status ${response.status}`);
          }

          toast.success('Changes saved successfully!');
          setSuccessMessage('Article updated successfully!');
          if (onSuccess) {
            onSuccess(slug);
          } else {
            navigate(`/article/${slug}`);
          }
        }
      } catch (err: any) {
        console.error('Studio submit error:', err);
        setError(err.message || 'An error occurred during submission.');
        toast.error(err.message || 'Failed to save project.');
      } finally {
        setSaving(false);
      }
    },
    [formData, contentType, mode, slug, navigate, onSuccess, token]
  );

  return {
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
    availablePlatforms,
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
  };
}
