import React, { useEffect, useState, useMemo } from 'react';

const PIG = '\u{1F437}'; // 🐷
/** 前景密集层 */
const COUNT_FORE = 240;
/** 后景略小略慢，增加纵深与「铺满」感 */
const COUNT_BACK = 140;
const CLEAR_MS = 24000;

type PigSpec = {
    key: string;
    leftPct: number;
    delayS: number;
    durationS: number;
    fontPx: number;
    driftPx: number;
    spinTurns: number;
    layer: 'back' | 'front';
    /** 越高越早出现在视野内，叠满纵向空间 */
    startTopVh: number;
};

export function PigRainOverlay() {
    const [sessionId, setSessionId] = useState<number | null>(null);

    useEffect(() => {
        const onPigsail = () => setSessionId(Date.now());
        window.addEventListener('pigsail-rain', onPigsail);
        return () => window.removeEventListener('pigsail-rain', onPigsail);
    }, []);

    useEffect(() => {
        if (sessionId === null) return;
        const t = window.setTimeout(() => setSessionId(null), CLEAR_MS);
        return () => window.clearTimeout(t);
    }, [sessionId]);

    const pigs: PigSpec[] = useMemo(() => {
        if (sessionId === null) return [];
        const mk = (n: number, layer: 'back' | 'front', offset: number): PigSpec[] =>
            Array.from({ length: n }, (_, i) => {
                const idx = offset + i;
                const isBack = layer === 'back';
                return {
                    key: `${sessionId}-${layer}-${idx}`,
                    leftPct: Math.random() * 100,
                    // 拉长起跳时间，形成持续「暴雨」而不是一波结束
                    delayS: Math.random() * 6.5,
                    durationS: isBack
                        ? 5 + Math.random() * 7
                        : 3.2 + Math.random() * 6.5,
                    fontPx: isBack
                        ? 12 + Math.random() * 22
                        : 18 + Math.random() * 36,
                    driftPx: (Math.random() - 0.5) * (isBack ? 90 : 160),
                    spinTurns: 0.4 + Math.random() * 2.4,
                    layer,
                    startTopVh: -(8 + Math.random() * 55),
                };
            });
        return [...mk(COUNT_BACK, 'back', 0), ...mk(COUNT_FORE, 'front', COUNT_BACK)];
    }, [sessionId]);

    if (sessionId === null || pigs.length === 0) return null;

    return (
        <div
            className="pigsail-rain-root"
            aria-hidden
        >
            {pigs.map((p) => (
                <span
                    key={p.key}
                    className={
                        p.layer === 'back'
                            ? 'pigsail-rain-emoji pigsail-rain-emoji--back'
                            : 'pigsail-rain-emoji pigsail-rain-emoji--front'
                    }
                    style={{
                        left: `${p.leftPct}%`,
                        top: `${p.startTopVh}vh`,
                        animationDuration: `${p.durationS}s`,
                        animationDelay: `${p.delayS}s`,
                        fontSize: p.fontPx,
                        '--pigsail-drift': `${p.driftPx}px`,
                        '--pigsail-spin': `${p.spinTurns}turn`,
                    } as React.CSSProperties}
                >
                    {PIG}
                </span>
            ))}
        </div>
    );
}
