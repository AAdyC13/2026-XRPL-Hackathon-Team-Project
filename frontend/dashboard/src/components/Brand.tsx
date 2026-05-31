import { cn } from '@/lib/utils';

/** GKC 代號 — Orbitron 三色垂直漸層字標，與 homepage 一致 */
export function GkcMark({ className }: { className?: string }) {
  return <span className={cn('gkc-mark', className)}>GKC</span>;
}

/** CACP 字標 — Orbitron 粗體，末字母琥珀 accent */
export function CacpWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('cacp-wordmark', className)} aria-label="CACP">
      CAC<span className="accent">P</span>
    </span>
  );
}

interface BrandLogoProps {
  /** 顯示中文副標 */
  withSubtitle?: boolean;
  className?: string;
}

/** 完整品牌標頭：CACP 字標 + 中文副標 */
export function BrandLogo({ withSubtitle = true, className }: BrandLogoProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <CacpWordmark className="text-xl" />
      {withSubtitle && (
        <span className="cacp-subtitle text-[11px]">校園AI算力租賃共享平台</span>
      )}
    </div>
  );
}
