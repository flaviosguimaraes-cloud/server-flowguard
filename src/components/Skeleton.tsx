 export const Skeleton = ({ count = 1 }: { count?: number }) => {
   return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
       {Array.from({ length: count }).map((_, i) => (
         <div key={i} className="bg-[#1e2130] h-24 rounded-xl border border-gray-800" />
       ))}
     </div>
   );
 };