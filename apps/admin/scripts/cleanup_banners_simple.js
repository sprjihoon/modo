const { createClient } = require('@supabase/supabase-js');

// 환경 변수는 실행 시 전달받음
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('사용법: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup_banners_simple.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function cleanupBanners() {
  console.log('🔍 현재 배너 조회 중...');
  
  const { data: beforeData, error: beforeError } = await supabase
    .from('banners')
    .select('*')
    .order('display_order');
  
  if (beforeError) {
    console.error('❌ 배너 조회 실패:', beforeError);
    process.exit(1);
  }
  
  console.log(`📊 현재 배너 수: ${beforeData.length}개`);
  beforeData.forEach(banner => {
    const titlePreview = banner.title.substring(0, 20).replace(/\n/g, ' ');
    console.log(`  - ${titlePreview}... (order: ${banner.display_order}) - ${banner.created_at}`);
  });
  
  console.log('\n🗑️  오래된 배너 삭제 중...');
  
  const oldBannerIds = [
    'e5e01615-6146-42b8-bbe5-4395a7151e70',
    'd55e715f-b38c-4d9a-a797-51fb80897dd0',
    '231c8559-1afb-4115-9cc3-675e9b04404d'
  ];
  
  const { error: deleteError } = await supabase
    .from('banners')
    .delete()
    .in('id', oldBannerIds);
  
  if (deleteError) {
    console.error('❌ 배너 삭제 실패:', deleteError);
    process.exit(1);
  }
  
  console.log('✅ 오래된 배너 3개 삭제 완료');
  
  console.log('\n🔍 삭제 후 배너 조회 중...');
  
  const { data: afterData, error: afterError } = await supabase
    .from('banners')
    .select('*')
    .order('display_order');
  
  if (afterError) {
    console.error('❌ 배너 조회 실패:', afterError);
    process.exit(1);
  }
  
  console.log(`\n📊 최종 배너 수: ${afterData.length}개`);
  console.log('');
  afterData.forEach(banner => {
    const title = banner.title.replace(/\n/g, ' ');
    console.log(`  ${banner.display_order}. ${title} - [${banner.button_text}]`);
  });
  
  console.log('\n✅ 배너 정리 완료!');
  console.log('📱 이제 배너 관리 페이지와 Flutter 앱에서 3개의 배너만 보일 것입니다.');
}

cleanupBanners().catch(err => {
  console.error('❌ 오류 발생:', err);
  process.exit(1);
});

