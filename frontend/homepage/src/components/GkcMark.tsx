type GkcMarkProps = {
  className?: string;
};

export default function GkcMark({ className }: GkcMarkProps) {
  return (
    <span className={className ? `gkc-mark ${className}` : "gkc-mark"}>GKC</span>
  );
}
