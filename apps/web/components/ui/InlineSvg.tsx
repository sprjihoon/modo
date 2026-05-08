"use client";

import React, { useEffect, useState } from "react";

interface InlineSvgProps {
  src: string;
  className?: string;
  /** src 로드 실패 시 표시할 fallback 노드 */
  fallback?: React.ReactNode;
}

const svgCache = new Map<string, string>();
const failedSrcs = new Set<string>();

function normalizeSvg(raw: string): string | null {
  const match = raw.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;
  return match[0]
    .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
    .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"')
    .replace(/style="([^"]*)"/gi, (_, styleContent: string) => {
      const updated = styleContent
        .replace(/fill\s*:\s*(?!none\b)[^;"]*/gi, "fill: currentColor")
        .replace(/stroke\s*:\s*(?!none\b)[^;"]*/gi, "stroke: currentColor");
      return `style="${updated}"`;
    });
}

/**
 * SVG를 인라인으로 렌더링하는 컴포넌트.
 * img 태그 대신 SVG 내용을 직접 삽입하므로 CSS currentColor(fill/stroke)로 색상 제어가 가능합니다.
 */
export function InlineSvg({ src, className, fallback }: InlineSvgProps) {
  const cached = svgCache.get(src);
  const [svgContent, setSvgContent] = useState<string | null>(cached ?? null);
  const [error, setError] = useState(failedSrcs.has(src));

  useEffect(() => {
    if (svgCache.has(src)) {
      setSvgContent(svgCache.get(src)!);
      setError(false);
      return;
    }
    if (failedSrcs.has(src)) {
      setError(true);
      return;
    }

    let cancelled = false;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/html")) throw new Error("html response");
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const normalized = normalizeSvg(text);
        if (!normalized) {
          failedSrcs.add(src);
          setError(true);
          return;
        }
        svgCache.set(src, normalized);
        setSvgContent(normalized);
      })
      .catch(() => {
        if (!cancelled) {
          failedSrcs.add(src);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (error) return <>{fallback ?? null}</>;
  if (!svgContent) return <span className={className} />;

  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
