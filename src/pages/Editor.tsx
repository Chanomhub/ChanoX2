import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArticleStudio } from '@/features/editor';
import { useAuth } from '@/contexts/AuthContext';

interface EditorPageProps {
  mode: 'create' | 'edit';
}

export default function EditorPage({ mode }: EditorPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <ArticleStudio mode={mode} slug={slug} contentType="game" />
    </div>
  );
}
