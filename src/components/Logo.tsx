import React from 'react';

export default function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/LetsFixIt.png"
      alt="LetsFixIt"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        boxShadow: 'none',
        padding: '0',
        margin: '0',
      }}
    />
  );
}
