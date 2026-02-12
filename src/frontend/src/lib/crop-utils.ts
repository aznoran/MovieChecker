import type {CropperAreaData} from "@/components/ui/cropper";

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (err) => reject(err));
        img.setAttribute("crossOrigin", "anonymous");
        img.src = url;
    });
}

async function getCroppedImage(
    imageSrc: string,
    cropArea: CropperAreaData,
    rotation: number
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const rotRad = (rotation * Math.PI) / 180;
    const {width: imgW, height: imgH} = image;

    const sin = Math.abs(Math.sin(rotRad));
    const cos = Math.abs(Math.cos(rotRad));
    const rotW = imgW * cos + imgH * sin;
    const rotH = imgW * sin + imgH * cos;

    canvas.width = rotW;
    canvas.height = rotH;

    ctx.translate(rotW / 2, rotH / 2);
    ctx.rotate(rotRad);
    ctx.drawImage(image, -imgW / 2, -imgH / 2);

    const data = ctx.getImageData(
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height
    );

    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    ctx.putImageData(data, 0, 0);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
        }, "image/jpeg", 0.92);
    });
}

export {getCroppedImage};
