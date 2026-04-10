'use client';

import { useEffect } from 'react';

export default function InAppBrowserHandler() {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isKakaotalk = userAgent.includes('kakaotalk');
    const currentUrl = window.location.href;

    if (isKakaotalk) {
      /**
       * 1. 안드로이드 (부모님 기기) 대응
       * 카카오톡 내부 브라우저를 닫고 크롬(Chrome) 앱으로 강제 이동시킵니다.
       */
      if (userAgent.includes('android')) {
        // http:// 또는 https:// 제거
        const rawUrl = currentUrl.replace(/https?:\/\//, '');
        
        // 안드로이드 인텐트 스킴: 크롬 패키지를 명시하여 실행
        const intentUrl = `intent://${rawUrl}#Intent;scheme=https;package=com.android.chrome;end`;
        
        window.location.href = intentUrl;
      } 
      
      /**
       * 2. iOS (동생 기기) 대응
       * 아이폰 카톡에서는 외부 브라우저 호출이 제한적일 수 있으나 시도합니다.
       * 만약 자동으로 안 넘어가면, '다른 브라우저로 열기' 안내를 띄우는 것이 좋습니다.
       */
      else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
        const externalUrl = `kakaotalk://web/openExternalApp?url=${encodeURIComponent(currentUrl)}`;
        
        // iOS는 정책상 즉시 이동이 막힐 수 있으므로 약간의 지연 후 실행
        setTimeout(() => {
          window.location.href = externalUrl;
        }, 200);
      }
    }
  }, []);

  return null;
}