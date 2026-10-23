import React, { useEffect, useRef } from 'react';

export interface TooltipInfo {
  title: string;
  body: string;
  x: number;
  y: number;
}

interface TooltipProps {
  info: TooltipInfo | null;
}

export const Tooltip: React.FC<TooltipProps> = ({ info }) => {
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!info || !tipRef.current) return;
    const el = tipRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = info.x + 14;
    let y = info.y + 14;

    if (x + w > window.innerWidth - 8) {
      x = info.x - w - 14;
    }
    if (y + h > window.innerHeight - 8) {
      y = info.y - h - 14;
    }

    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${Math.max(8, y)}px`;
  }, [info]);

  if (!info) return null;

  return (
    <div
      ref={tipRef}
      id="cosechas-tip"
      style={{ display: 'block' }}
      dangerouslySetInnerHTML={{
        __html: `<b>${info.title}</b><br/>${info.body}`,
      }}
    />
  );
};
