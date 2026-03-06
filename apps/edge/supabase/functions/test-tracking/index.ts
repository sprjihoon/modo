import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    const trackingNo = '7890100201675';
    const url = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}&displayHeader=N`;
    
    console.log('🔍 Fetching:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; ModoApp/1.0)',
      },
    });
    
    console.log('📥 Response status:', response.status);
    
    const html = await response.text();
    console.log('📥 HTML length:', html.length);
    
    // 날짜 패턴 찾기
    const dateMatches = html.match(/\d{4}\.\d{2}\.\d{2}/g) || [];
    console.log('📥 Date patterns found:', dateMatches.length);
    
    // 정규식으로 이벤트 추출
    const trRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>(\d{4}\.\d{2}\.\d{2})<\/td>[\s\S]*?<td[^>]*>(\d{2}:\d{2})<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
    
    const events = [];
    let match;
    while ((match = trRegex.exec(html)) !== null) {
      events.push({
        date: match[1],
        time: match[2],
        location: match[3].replace(/<[^>]*>/g, '').trim().substring(0, 50),
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      htmlLength: html.length,
      datePatterns: dateMatches.slice(0, 10),
      events: events,
      htmlPreview: html.substring(0, 500),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
