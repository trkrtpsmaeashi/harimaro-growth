import { useEffect, useRef } from 'react';

export default function WeightChart({ records }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const data = [...records].sort((a, b) =>
      a.recorded_on.localeCompare(b.recorded_on)
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (data.length < 2) {
      ctx.fillStyle = '#766f68';
      ctx.font = '17px sans-serif';
      ctx.fillText('記録が2件以上になるとグラフが表示されます', 36, 58);
      return;
    }

    const weights = data.map((item) => item.weight_g);
    const min = Math.min(...weights) - 10;
    const max = Math.max(...weights) + 10;
    const left = 68;
    const right = 28;
    const top = 32;
    const bottom = 52;
    const width = canvas.width - left - right;
    const height = canvas.height - top - bottom;

    ctx.strokeStyle = '#e9e3dc';
    ctx.fillStyle = '#766f68';
    ctx.font = '13px sans-serif';

    for (let index = 0; index < 5; index += 1) {
      const y = top + (height * index) / 4;
      const value = Math.round(max - ((max - min) * index) / 4);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
      ctx.fillText(`${value}g`, 15, y + 4);
    }

    ctx.strokeStyle = '#718b78';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    data.forEach((item, index) => {
      const x = left + (width * index) / Math.max(data.length - 1, 1);
      const y = top + height * (1 - (item.weight_g - min) / (max - min));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    data.forEach((item, index) => {
      const x = left + (width * index) / Math.max(data.length - 1, 1);
      const y = top + height * (1 - (item.weight_g - min) / (max - min));
      ctx.fillStyle = '#718b78';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#766f68';
      ctx.fillText(item.recorded_on.slice(5).replace('-', '/'), x - 18, canvas.height - 18);
    });
  }, [records]);

  return <canvas ref={canvasRef} width="900" height="380" />;
}
