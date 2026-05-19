 interface FlagProps {
   code: string;
   size?: number;
 }
 
 export const Flag = ({
   code, size = 20 }: FlagProps) => {
   if (!code) return <span>🌐</span>;
 
   const lower = String(code || '').toLowerCase();
 
   return (
     <span
       className={`fi fi-${lower}`}
       style={{
         width: size,
         height: size * 0.75,
         display: 'inline-block',
         backgroundSize: 'cover',
         backgroundPosition: 'center',
         borderRadius: 2,
         flexShrink: 0,
         verticalAlign: 'middle',
       }}
       title={code}
     />
   );
 };
 
 export default Flag;