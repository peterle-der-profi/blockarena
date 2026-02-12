'use client';

import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareCardModalProps {
  arenaId: number;
  score: number;
  total: number;
  streak: number;
  predictions: boolean[];
  rank?: number;
  onClose: () => void;
}

export function ShareCardModal({ arenaId, score, total, streak, predictions, rank, onClose }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 600;
    canvas.height = 400;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0a0a0f');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    // Border glow
    ctx.strokeStyle = '#bf00ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#bf00ff';
    ctx.shadowBlur = 20;
    ctx.strokeRect(10, 10, 580, 380);
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ BLOCKARENA', 300, 55);

    // Arena info
    ctx.fillStyle = '#a0a0b0';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`Arena #${arenaId}`, 300, 85);

    // Score
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 48px Orbitron, monospace';
    ctx.fillText(`${score}/${total}`, 300, 150);
    ctx.shadowBlur = 0;

    // Streak
    if (streak > 0) {
      ctx.fillStyle = '#ff6600';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(`🔥 ${streak}x Streak`, 300, 190);
    }

    // Rank
    if (rank) {
      ctx.fillStyle = '#00d4ff';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText(`Rank #${rank}`, 300, 220);
    }

    // Prediction grid
    const gridStartX = 300 - (Math.min(predictions.length, 15) * 20) / 2;
    const gridStartY = 250;
    const rows = Math.ceil(predictions.length / 15);

    for (let i = 0; i < predictions.length; i++) {
      const row = Math.floor(i / 15);
      const col = i % 15;
      const x = gridStartX + col * 20;
      const y = gridStartY + row * 20;

      ctx.fillStyle = predictions[i] ? '#39ff14' : '#ff1744';
      ctx.shadowColor = predictions[i] ? '#39ff14' : '#ff1744';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.roundRect(x, y, 16, 16, 3);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Footer
    ctx.fillStyle = '#555';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('blockarena.gg', 300, 380);

    return canvas.toDataURL('image/png');
  }, [arenaId, score, total, streak, predictions, rank]);

  const getShareText = () => {
    const grid = predictions.map(p => p ? '🟩' : '🟥').join('');
    return `BlockArena 🏟️ Arena #${arenaId}\nScore: ${score}/${total} ${streak > 0 ? `🔥 ${streak}x Streak` : ''}\n${grid}`;
  };

  const handleDownload = () => {
    const url = generateImage();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockarena-${arenaId}.png`;
    a.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getShareText()).catch(() => {});
  };

  const handleShare = async (platform: string) => {
    const text = encodeURIComponent(getShareText());
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      telegram: `https://t.me/share/url?text=${text}`,
      whatsapp: `https://wa.me/?text=${text}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 max-w-lg w-full border border-purple-500/20"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="font-display text-xl font-bold text-center mb-4 neon-text-gold">SHARE YOUR RESULT</h3>

          <canvas ref={canvasRef} className="w-full rounded-lg mb-4 hidden" />

          {/* Preview */}
          <div className="bg-[var(--bg-primary)] rounded-xl p-4 mb-4 text-center">
            <div className="font-display text-sm text-gray-400 mb-1">Arena #{arenaId}</div>
            <div className="font-display text-3xl font-black neon-text-gold mb-2">{score}/{total}</div>
            {streak > 0 && <div className="text-orange-400 font-bold mb-2">🔥 {streak}x Streak</div>}
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {predictions.map((p, i) => (
                <div key={i} className={`w-5 h-5 rounded-sm ${p ? 'bg-green-500 shadow-[0_0_5px_rgba(57,255,20,0.5)]' : 'bg-red-500 shadow-[0_0_5px_rgba(255,23,68,0.5)]'}`} />
              ))}
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => handleShare('twitter')} className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-all active:scale-95">𝕏 Twitter</button>
            <button onClick={() => handleShare('telegram')} className="py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 font-bold text-sm transition-all active:scale-95">✈️ Telegram</button>
            <button onClick={() => handleShare('whatsapp')} className="py-2.5 rounded-lg bg-green-600 hover:bg-green-500 font-bold text-sm transition-all active:scale-95">💬 WhatsApp</button>
            <button onClick={handleCopy} className="py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 font-bold text-sm transition-all active:scale-95">📋 Copy Text</button>
          </div>
          <button onClick={handleDownload} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-sm transition-all active:scale-95">📥 Download Image</button>
          <button onClick={onClose} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-white">Close</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
