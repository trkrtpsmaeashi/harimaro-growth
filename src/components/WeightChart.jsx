import { useEffect, useRef } from 'react';

export default function WeightChart({ records }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const data = [...records].sort((a, b) =>
      a.recorded_on.localeCompare(b.recorded_on)
    );

    const ratio = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 900;
    const cssHeight = canvas.clientHeight || 420;

    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (data.length < 2) {
      ctx.fillStyle = '#766f68';
      ctx.font = '17px sans-serif';
      ctx.fillText('記録が2件以上になるとグラフが表示されます', 28, 58);
      return;
    }

    const weights = data.map((item) => Number(item.weight_g));
    const rawMin = Math.min(...weights);
    const rawMax = Math.max(...weights);
    const paddingValue = Math.max(10, Math.ceil((rawMax - rawMin) * 0.15));
    const min = Math.max(0, rawMin - paddingValue);
    const max = rawMax + paddingValue;

    const left = 64;
    const right = 28;
    const top = 34;
    const bottom = 58;
    const width = cssWidth - left - right;
    const height = cssHeight - top - bottom;

    ctx.lineWidth = 1;
    ctx.font = '12px sans-serif';

    for (let index = 0; index < 5; index += 1) {
      const y = top + (height * index) / 4;
      const value = Math.round(max - ((max - min) * index) / 4);

      ctx.strokeStyle = '#e9e3dc';
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();

      ctx.fillStyle = '#766f68';
      ctx.fillText(`${value}g`, 10, y + 4);
    }

    const points = data.map((item, index) => {
      const x = left + (width * index) / Math.max(data.length - 1, 1);
      const y = top + height * (1 - (item.weight_g - min) / (max - min));
      return { x, y, item };
    });

    const gradient = ctx.createLinearGradient(0, top, 0, top + height);
    gradient.addColorStop(0, 'rgba(113,139,120,.30)');
    gradient.addColorStop(1, 'rgba(113,139,120,.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, top + height);
    points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, top + height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#718b78';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();

    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });

    ctx.stroke();

    points.forEach((point, index) => {
      const hasTags = (point.item.tags || []).length > 0;

      ctx.fillStyle = hasTags ? '#9b6c52' : '#718b78';
      ctx.beginPath();
      ctx.arc(point.x, point.y, hasTags ? 6.5 : 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#766f68';
      ctx.textAlign = 'center';

      const shouldShowLabel =
        data.length <= 8 ||
        index === 0 ||
        index === data.length - 1 ||
        index % Math.ceil(data.length / 6) === 0;

      if (shouldShowLabel) {
        ctx.fillText(
          point.item.recorded_on.slice(5).replace('-', '/'),
          point.x,
          cssHeight - 22
        );
      }
    });

    ctx.textAlign = 'left';
  }, [records]);

  return <canvas ref={canvasRef} className="weight-chart-canvas" />;
}
