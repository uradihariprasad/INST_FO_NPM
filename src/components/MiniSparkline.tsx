import { useMemo } from 'react';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function MiniSparkline({ data, width = 60, height = 20, color }: Props) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    });

    return `M${points.join('L')}`;
  }, [data, width, height]);

  const isUp = data.length >= 2 && data[data.length - 1] >= data[0];
  const strokeColor = color || (isUp ? '#22c55e' : '#ef4444');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
