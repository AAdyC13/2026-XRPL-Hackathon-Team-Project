import { useLocation } from 'wouter';
import { useEffect } from 'react';

export default function Home() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // 自動重定向到儀表板
    navigate('/dashboard');
  }, [navigate]);

  return null;
}
