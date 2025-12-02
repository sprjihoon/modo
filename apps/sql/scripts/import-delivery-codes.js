/**
 * 집배코드 CSV 데이터를 Supabase에 bulk insert
 * 
 * 실행 방법:
 * 1. CSV 파일을 프로젝트 루트에 복사
 * 2. 환경변수 설정: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 3. node apps/sql/scripts/import-delivery-codes.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env 파일 로드 (있는 경우)
try {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch (e) {
  // dotenv가 없어도 계속 진행
}

// 환경변수 또는 직접 설정
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSV 파일 경로 (프로젝트 내 경로)
const csvPath = path.join(__dirname, '../data/delivery-codes-all.csv');

// CSV 파일 읽기
function readCSV(filePath) {
  console.log('📖 CSV 파일 읽기:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ CSV 파일을 찾을 수 없습니다:', filePath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      data.push({
        zipcode: values[0].trim(),
        sort_code_1: values[1].trim(),
        sort_code_2: values[2].trim(),
        sort_code_3: values[3].trim(),
        sort_code_4: values[4].trim(),
        arr_cnpo_nm: values[5].trim(),
        deliv_po_nm: values[6].trim(),
        course_no: values[7].trim() || null,
      });
    }
  }
  
  return data;
}

// Supabase에 bulk insert
async function importData() {
  try {
    console.log('🚀 집배코드 데이터 import 시작...');
    
    // CSV 읽기
    const data = readCSV(csvPath);
    console.log(`✅ ${data.length}개 우편번호 읽기 완료`);
    
    // 배치 크기 (Supabase는 한 번에 최대 1000개까지)
    const batchSize = 1000;
    let imported = 0;
    let errors = 0;
    
    // 배치로 나누어 insert
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      console.log(`📦 배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} 처리 중... (${i + 1}-${Math.min(i + batchSize, data.length)})`);
      
      const { error } = await supabase
        .from('delivery_codes')
        .upsert(batch, { onConflict: 'zipcode' });
      
      if (error) {
        console.error(`❌ 배치 ${Math.floor(i / batchSize) + 1} 실패:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`✅ ${imported}개 import 완료`);
      }
      
      // API rate limit 방지 (약간의 딜레이)
      if (i + batchSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('');
    console.log('🎉 Import 완료!');
    console.log(`✅ 성공: ${imported}개`);
    console.log(`❌ 실패: ${errors}개`);
    
  } catch (error) {
    console.error('❌ Import 실패:', error);
    process.exit(1);
  }
}

// 실행
importData();

