import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <path d="M96 380 L180 260 L240 320 L340 180 L416 280"
        stroke="#818cf8" stroke-width="28" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`Создана иконка ${size}x${size}`);
}

await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");
console.log("Создана apple-touch-icon 180x180");
