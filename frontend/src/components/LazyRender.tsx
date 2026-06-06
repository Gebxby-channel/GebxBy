import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type LazyRenderProps = {
    children: ReactNode;
    className?: string;
    placeholderClassName?: string;
    minHeight?: number;
    rootMargin?: string;
    eager?: boolean;
};

export default function LazyRender({
    children,
    className,
    placeholderClassName = 'border border-[#1f1f1f] bg-[#101010]',
    minHeight = 180,
    rootMargin = '700px 0px',
    eager = false,
}: LazyRenderProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [visible, setVisible] = useState(eager);

    useEffect(() => {
        if (visible || eager) return;
        const element = containerRef.current;
        if (!element || typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin, threshold: 0.01 });

        observer.observe(element);
        return () => observer.disconnect();
    }, [eager, rootMargin, visible]);

    return (
        <div ref={containerRef} className={className} style={{ minHeight }}>
            {visible ? children : (
                <div
                    className={`h-full w-full animate-pulse ${placeholderClassName}`}
                    style={{ minHeight }}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

type LazyRenderListProps<T> = {
    items: T[];
    getKey: (item: T, index: number) => string;
    renderItem: (item: T, index: number) => ReactNode;
    className?: string;
    itemClassName?: string;
    placeholderClassName?: string;
    estimateSize?: number;
    eagerCount?: number;
};

export function LazyRenderList<T>({
    items,
    getKey,
    renderItem,
    className,
    itemClassName,
    placeholderClassName,
    estimateSize = 220,
    eagerCount = 4,
}: LazyRenderListProps<T>) {
    return (
        <div className={className}>
            {items.map((item, index) => (
                <LazyRender
                    key={getKey(item, index)}
                    className={itemClassName}
                    placeholderClassName={placeholderClassName}
                    minHeight={estimateSize}
                    eager={index < eagerCount}
                >
                    {renderItem(item, index)}
                </LazyRender>
            ))}
        </div>
    );
}
