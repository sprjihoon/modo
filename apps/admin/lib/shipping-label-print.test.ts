import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p, files);
    } else if (/\.(ts|tsx)$/.test(extname(name)) && !name.endsWith(".test.ts")) {
      files.push(p);
    }
  }
  return files;
}

const adminRoot = join(__dirname, "..");
const sheetPath = join(adminRoot, "components/ops/shipping-label-sheet.tsx");
const editorPath = join(adminRoot, "app/ops/label-editor/page.tsx");
const layoutApi = "/api/admin/settings/label-layout";

const sheet = readFileSync(sheetPath, "utf8");
assert(
  sheet.includes("customLayout && customLayout.length > 0 ? customLayout : createDefaultLayout()"),
  "ShippingLabelSheet는 저장 레이아웃이 있으면 쓰고, 없으면 기본 양식으로 떨어진다"
);
assert(sheet.includes('fieldKey: "delivery_request"'), "기본 양식에 배송요청사항 필드가 있어야 한다");
assert(
  sheet.includes('delivery_request: (data) => (data.deliveryMessage || "").trim()'),
  "송장 문구 매퍼가 deliveryMessage를 배송요청사항으로 찍어야 한다"
);

const editor = readFileSync(editorPath, "utf8");
assert(editor.includes('fieldKey: "delivery_request"'), "에디터 필드 목록에 배송요청사항이 있어야 한다");
assert(editor.includes("공용현관 비번"), "에디터 배송요청사항 예시값이 있어야 한다");
assert(
  editor.includes('el.fieldKey === "delivery_request"'),
  "저장된 양식에 배송요청사항이 없으면 에디터가 붙여야 한다"
);

const editorFieldKeys = [...editor.matchAll(/fieldKey:\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
const uniqueEditorKeys = [...new Set(editorFieldKeys)];
assert(uniqueEditorKeys.length >= 15, "에디터 필드 키가 있어야 한다");
assert(uniqueEditorKeys.includes("delivery_request"), "에디터 unique 키에 delivery_request가 있어야 한다");

const mapperBlock = sheet.slice(sheet.indexOf("const mapping"), sheet.indexOf("const mapper"));
for (const key of uniqueEditorKeys) {
  assert(
    mapperBlock.includes(`${key}:`),
    `출력 매퍼가 에디터 필드 '${key}'를 처리해야 한다`
  );
}

const callSiteFiles = walk(adminRoot).filter((p) => {
  if (p === sheetPath) return false;
  const src = readFileSync(p, "utf8");
  return src.includes("<ShippingLabelSheet");
});

assert(callSiteFiles.length >= 3, "출고송장 출력 경로가 3곳 이상이어야 한다");

const expected = [
  join(adminRoot, "app/ops/reprint/page.tsx"),
  join(adminRoot, "app/ops/inbound/page.tsx"),
  join(adminRoot, "components/orders/label-print-dialog.tsx"),
];
for (const p of expected) {
  assert(
    callSiteFiles.includes(p),
    `출고송장 출력 경로에 ${p.replace(adminRoot, "apps/admin")} 가 있어야 한다`
  );
}

for (const p of callSiteFiles) {
  const src = readFileSync(p, "utf8");
  const rel = p.replace(adminRoot, "apps/admin");
  assert(src.includes(layoutApi), `${rel}가 저장된 레이아웃 API를 호출해야 한다`);
  assert(src.includes("customLayout="), `${rel}가 ShippingLabelSheet에 customLayout을 넘겨야 한다`);
  assert(
    !src.includes("<ShippingLabelSheet") || src.includes("customLayout={labelLayout"),
    `${rel}가 불러온 labelLayout을 customLayout으로 전달해야 한다`
  );
  assert(
    src.includes("resolveOutboundLabelRecipient"),
    `${rel}가 출고송장 받는분을 orders.delivery_* 기준으로 결정해야 한다`
  );
  assert(
    src.includes("deliveryMessage"),
    `${rel}가 출고송장에 배송요청사항(deliveryMessage)을 넘겨야 한다`
  );
  assert(
    src.includes("resolveDeliveryRequestMessage"),
    `${rel}가 배송요청사항을 resolveDeliveryRequestMessage로 정규화해야 한다`
  );
}

function resolveLayout<T>(custom: T[] | null | undefined, fallback: T[]): T[] {
  return custom && custom.length > 0 ? custom : fallback;
}

const saved = [{ fieldKey: "receiver_name", x: 1 }];
const fallback = [{ fieldKey: "default" }];
assert(resolveLayout(saved, fallback) === saved, "저장 레이아웃이 있으면 저장본 사용");
assert(resolveLayout(null, fallback) === fallback, "null이면 기본 양식");
assert(resolveLayout(undefined, fallback) === fallback, "undefined면 기본 양식");
assert(resolveLayout([], fallback) === fallback, "빈 배열이면 기본 양식");

console.log(`shipping-label-print.test.ts passed (${callSiteFiles.length} print paths)`);
