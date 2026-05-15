export const Skeleton = ({ count = 1, className }: { count?: number; className?: string }) => {
  return (
    <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse"}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-card h-24 rounded-xl border border-border" />
      ))}
    </div>
  );
};