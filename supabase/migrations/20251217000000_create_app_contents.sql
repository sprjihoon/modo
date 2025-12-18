create table if not exists app_contents (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  content text,
  images jsonb default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table app_contents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'app_contents' and policyname = 'Allow public read access'
  ) then
    create policy "Allow public read access" on app_contents
      for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'app_contents' and policyname = 'Allow admin full access'
  ) then
    create policy "Allow admin full access" on app_contents
      for all using (
        exists (
          select 1 from users
          where auth_id = auth.uid()
          and email like '%@admin.modusrepair.com'
        )
      );
  end if;
end $$;

-- Trigger for updated_at
drop trigger if exists update_app_contents_updated_at on app_contents;
create trigger update_app_contents_updated_at
  before update on app_contents
  for each row
  execute function update_updated_at_column();

-- Insert initial data
insert into app_contents (key, title, content) values
  ('price_list', '가격표', '가격표 내용이 여기에 표시됩니다.'),
  ('easy_guide', '쉬운가이드', '쉬운가이드 내용이 여기에 표시됩니다.'),
  ('terms_of_service', '이용약관', E'모두의수선 서비스 이용약관\n시행일: 2024년 11월 1일\n\n제1조 (목적)\n본 약관은 모두의수선(이하 "회사")이 제공하는 의류 수선 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (용어의 정의)\n1. "서비스"란 회사가 제공하는 비대면 의류 수선 중개 플랫폼을 의미합니다.\n2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.\n3. "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속 이용할 수 있는 자를 말합니다.\n\n제3조 (약관의 게시 및 변경)\n1. 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.\n2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.\n3. 변경된 약관은 서비스 화면에 공지하며, 공지 후 7일이 경과한 시점부터 효력이 발생합니다.\n\n제4조 (회원가입)\n1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.\n2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:\n   - 등록 내용에 허위, 기재누락, 오기가 있는 경우\n   - 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우\n\n제5조 (서비스의 제공)\n1. 회사는 다음과 같은 서비스를 제공합니다:\n   - 의류 수선 신청 및 접수\n   - 수거 및 배송 서비스\n   - 수선 진행 상황 조회\n   - 결제 및 영수증 발급\n2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.\n3. 회사는 시스템 점검, 보수, 교체 등 부득이한 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.\n\n제6조 (개인정보보호)\n회사는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 이용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.\n\n제7조 (책임의 한계)\n1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.\n2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.\n3. 회사는 이용자가 게재한 정보의 신뢰도, 정확성 등 내용에 관해서는 책임을 지지 않습니다.\n\n제8조 (분쟁해결)\n1. 회사는 이용자로부터 제출되는 불만사항 및 의견을 최우선적으로 처리합니다.\n2. 회사와 이용자 간 발생한 분쟁은 전자거래기본법 제28조 및 동 시행령 제15조에 의하여 설치된 전자거래분쟁조정위원회의 조정에 따를 수 있습니다.'),
  ('privacy_policy', '개인정보처리방침', E'모두의수선 개인정보처리방침\n시행일: 2024년 11월 1일\n\n제1조 (개인정보의 처리 목적)\n회사는 다음의 목적을 위하여 개인정보를 처리합니다:\n1. 회원 가입 및 관리\n2. 수선 서비스 제공\n3. 수거 및 배송 서비스 제공\n4. 결제 처리 및 정산\n5. 고객 문의 응대 및 불만 처리\n6. 마케팅 및 광고 활용 (선택)\n\n제2조 (처리하는 개인정보의 항목)\n회사는 다음의 개인정보 항목을 처리하고 있습니다:\n\n필수항목:\n- 이름, 이메일, 전화번호\n- 수거/배송 주소\n- 결제 정보 (카드번호 등)\n\n선택항목:\n- 프로필 사진\n- 마케팅 수신 동의\n\n제3조 (개인정보의 처리 및 보유 기간)\n1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.\n2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:\n   - 회원 정보: 회원 탈퇴 시까지\n   - 주문 정보: 5년 (전자상거래법)\n   - 결제 정보: 5년 (전자상거래법)\n\n제4조 (개인정보의 제3자 제공)\n회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:\n1. 배송을 위한 택배업체 정보 제공\n2. 결제를 위한 결제대행업체 정보 제공\n3. 법령에 의하여 제공이 요구되는 경우\n\n제5조 (개인정보의 파기)\n1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.\n2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:\n   - 전자적 파일: 복구 불가능한 방법으로 영구 삭제\n   - 종이 문서: 분쇄 또는 소각\n\n제6조 (정보주체의 권리·의무)\n1. 이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있습니다.\n2. 이용자는 언제든지 회원 탈퇴를 요청할 수 있으며, 회사는 지체 없이 회원 탈퇴를 처리합니다.\n3. 이용자는 개인정보의 정확성을 유지할 책임이 있으며, 부정확한 정보 입력으로 발생하는 문제의 책임은 이용자에게 있습니다.\n\n제7조 (개인정보 보호책임자)\n회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.\n\n개인정보 보호책임자:\n- 성명: 홍길동\n- 이메일: privacy@modusrepair.com\n- 전화번호: 1588-1234\n\n본 방침은 2024년 11월 1일부터 적용됩니다.')
  on conflict (key) do nothing;

