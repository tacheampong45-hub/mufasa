import React from 'react';

export const GlassBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#0c0a10]">
      {/* Ambient gradient layer */}
      <div 
        className="absolute inset-0 opacity-80"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255, 140, 102, 0.15) 0%, rgba(255, 94, 126, 0.08) 35%, transparent 70%)',
        }}
      />

      {/* Floating Blob 1 - Warm Peach */}
      <div 
        className="absolute -top-24 -left-20 w-[450px] h-[450px] rounded-full blur-[110px] animate-blob-1 opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(255, 140, 102, 0.8) 0%, rgba(255, 120, 80, 0.3) 70%, transparent 100%)',
        }}
      />

      {/* Floating Blob 2 - Coral Rose */}
      <div 
        className="absolute top-1/3 -right-28 w-[500px] h-[500px] rounded-full blur-[120px] animate-blob-2 opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(255, 94, 126, 0.75) 0%, rgba(220, 50, 100, 0.25) 70%, transparent 100%)',
        }}
      />

      {/* Floating Blob 3 - Golden Amber & Honey */}
      <div 
        className="absolute -bottom-24 left-1/4 w-[520px] h-[520px] rounded-full blur-[130px] animate-blob-3 opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(255, 180, 70, 0.7) 0%, rgba(255, 140, 50, 0.2) 70%, transparent 100%)',
        }}
      />

      {/* Fine noise overlay for tactile liquid glass refraction */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
