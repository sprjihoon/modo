"use client";

import React, { useEffect, useState } from "react";

interface InlineSvgProps {
  src: string;
  className?: string;
  /** src 로드 실패 시 표시할 fallback 노드 */
  fallback?: React.ReactNode;
}

/**
 * SVG를 인라인으로 렌더링하는 컴포넌트.
 * img 태그 대신 SVG 내용을 직접 삽입하므로 CSS currentColor(fill/stroke)로 색상 제어가 가능합니다.
 */
export function InlineSvg({ src, className, fallback }: InlineSvgProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setSvgContent(null);
    setError(false);

    let cancelled = false;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        // <svg ...> 태그만 추출
        const match = text.match(/<svg[\s\S]*<\/svg>/i);
        if (!match) {
          setError(true);
          return;
        }
        // fill/stroke 속성(attribute 및 inline style)을 currentColor로 교체하여 CSS 색상 제어 가능하게 함
        const normalized = match[0]
          .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
          .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"')
          .replace(/style="([^"]*)"/gi, (_, styleContent: string) => {
            const updated = styleContent
              .replace(/fill\s*:\s*(?!none\b)[^;"]*/gi, "fill: currentColor")
              .replace(/stroke\s*:\s*(?!none\b)[^;"]*/gi, "stroke: currentColor");
            return `style="${updated}"`;
          });
        setSvgContent(normalized);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) return <>{fallback ?? null}</>;
  if (!svgContent) return null;

  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
