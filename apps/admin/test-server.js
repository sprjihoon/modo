// 간단한 테스트 서버
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>모두의수선 - 테스트</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #2563EB; }
        .status { color: #10B981; }
        code {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🧵 모두의수선 Admin</h1>
        <p class="status">✅ 서버가 정상 작동 중입니다!</p>
        <hr>
        <h2>프로젝트 정보</h2>
        <ul>
          <li>프로젝트: 모두의수선 (MODU'S REPAIR)</li>
          <li>Admin 웹: Next.js 14</li>
          <li>포트: 3000</li>
          <li>상태: 테스트 서버</li>
        </ul>
        <hr>
        <h2>다음 단계</h2>
        <ol>
          <li><code>.env.local</code> 파일에 Supabase 키 입력</li>
          <li><code>npm run dev</code> 실행</li>
          <li>Next.js 앱 확인</li>
        </ol>
        <hr>
        <p>📚 문서: <code>WEEK1_SETUP.md</code> 참고</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(3000, () => {
  console.log('✅ 테스트 서버 시작!');
  console.log('📍 http://localhost:3000');
  console.log('');
  console.log('종료: Ctrl + C');
});

