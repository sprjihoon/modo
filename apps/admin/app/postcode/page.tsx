"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          address: string;
          addressType: string;
          jibunAddress: string;
          roadAddress: string;
        }) => void;
        width?: string;
        height?: string;
      }) => { embed: (el: HTMLElement) => void };
    };
  }
}

export default function PostcodePage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => {
      const el = document.getElementById("postcode-wrap");
      if (!el || !window.daum?.Postcode) return;
      new window.daum.Postcode({
        oncomplete: (data) => {
          const addr = data.addressType === "R" ? data.roadAddress : data.jibunAddress;
          const message = { type: "ADDRESS_SELECTED", zipcode: data.zonecode, address: addr };
          if (window.opener) {
            window.opener.postMessage(message, "*");
            window.close();
          } else {
            window.parent.postMessage(message, "*");
          }
        },
        width: "100%",
        height: "100%",
      }).embed(el);
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div
      id="postcode-wrap"
      style={{ width: "100%", height: "100dvh", overflow: "hidden" }}
    />
  );
}
