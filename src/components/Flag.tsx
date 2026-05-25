interface FlagProps {
  code: string;
  size?: number;
  className?: string;
}

export const Flag = ({ code, size = 20, className }: FlagProps) => {
  if (!code) return <span className={className}>🌐</span>;

  const lower = String(code || '').toLowerCase();

  return (
    <span
      className={`fi fi-${lower} ${className || ''}`}
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
 
 export default Flag;