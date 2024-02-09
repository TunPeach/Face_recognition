const fs = require("fs");
const sharp = require("sharp");
const path = require("path");

// Define the directory where images will be saved
const imagesDir = path.join(
  "C:\\Coding\\project\\Face recognition\\main2\\labels",
  "images"
);

// Ensure the directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Base64 images array
const base64Images = [];

// Function to decode Base64 and save as an image
function saveBase64Image(base64Data, outputPath) {
  const matches = base64Data.match(/^data:(.+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    console.error("Invalid Base64 image data");
    return;
  }

  const imageData = Buffer.from(matches[2], "base64");
  sharp(imageData)
    .toFile(outputPath)
    .then(() => console.log(`Image saved to ${outputPath}`))
    .catch((err) => console.error("Error saving image:", err));
}

// Iterate over the Base64 images array and save each image
base64Images.forEach((base64Img, index) => {
  const filename = `${index + 1}.png`; // Naming files as 1.png, 2.png, etc.
  const outputPath = path.join(imagesDir, filename);
  saveBase64Image(base64Img, outputPath);
});
