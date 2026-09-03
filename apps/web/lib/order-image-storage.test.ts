import { collectOrderImageUrls, orderImagePathFromUrl } from "./order-image-storage";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  orderImagePathFromUrl(
    "https://xx.supabase.co/storage/v1/object/public/order-images/repairs/a_1.jpg",
  ) === "repairs/a_1.jpg",
  "public URL",
);
assert(orderImagePathFromUrl("orders/web.jpg") === "orders/web.jpg", "bare path");
assert(orderImagePathFromUrl("https://cdn.example/x.jpg") === null, "other host");

const urls = collectOrderImageUrls({
  items: [
    {
      imagesWithPins: [
        { imageUrl: "https://xx.supabase.co/storage/v1/object/public/order-images/orders/b.jpg" },
      ],
    },
  ],
});
assert(urls.length === 1 && urls[0].includes("orders/b.jpg"), "collect draft urls");

console.log("order-image-storage.test.ts ok");
