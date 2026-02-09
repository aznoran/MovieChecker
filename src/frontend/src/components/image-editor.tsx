"use client";

import {useState, useCallback} from "react";
import Cropper, {Area} from "react-easy-crop";
import {useLocale} from "@/context/locale-context";
import {toast} from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Crop, RotateCw, ZoomIn} from "lucide-react";

interface ImageEditorProps {
    imageSrc: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (croppedFile: File) => void;
    aspectRatio?: number;
}

async function getCroppedImage(
    imageSrc: string,
    cropArea: Area,
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

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (err) => reject(err));
        img.setAttribute("crossOrigin", "anonymous");
        img.src = url;
    });
}

export function ImageEditor({
    imageSrc,
    open,
    onOpenChange,
    onConfirm,
    aspectRatio = 2 / 3,
}: ImageEditorProps) {
    const {t} = useLocale();
    const [crop, setCrop] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;
        try {
            const blob = await getCroppedImage(imageSrc, croppedAreaPixels, rotation);
            const file = new File([blob], "cropped-poster.jpg", {type: "image/jpeg"});
            onConfirm(file);
            onOpenChange(false);
        } catch {
            toast.error(t("clipboardFailed"), { position: "top-center" });
        }
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crop className="h-5 w-5"/>
                        {t("imageEditorTitle")}
                    </DialogTitle>
                </DialogHeader>

                <div className="relative w-full h-72 bg-muted rounded-lg overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0"/>
                        <span className="text-sm text-muted-foreground w-12">{t("zoom")}</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <RotateCw className="h-4 w-4 text-muted-foreground shrink-0"/>
                        <span className="text-sm text-muted-foreground w-12">{t("rotate")}</span>
                        <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            value={rotation}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={handleRotate}
                        >
                            <RotateCw className="h-3.5 w-3.5"/>
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t("cancel")}
                    </Button>
                    <Button type="button" onClick={handleConfirm}>
                        {t("applyCrop")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
