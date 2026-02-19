"use client";

import {
    Cropper,
    CropperImage,
    CropperArea,
} from "@/components/ui/cropper";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldContent,
} from "@/components/ui/field";
import {
    ImagePlus,
    X,
    ClipboardPaste,
    Crop,
    ZoomIn,
    RotateCw,
    RotateCcw,
} from "lucide-react";
import { useLocale } from "@/context/locale-context";
import type { useImageCropper } from "@/hooks/use-image-cropper";

type CropperReturn = ReturnType<typeof useImageCropper>;

interface PosterUploadSectionProps {
    cropper: Omit<CropperReturn, "fileInputRef" | "handleFileChange">;
    fileInputRef: CropperReturn["fileInputRef"];
    onFileChange: CropperReturn["handleFileChange"];
    gridSwitchId: string;
    canReCropFromPreview?: boolean;
    showPasteInPreview?: boolean;
}

export function PosterUploadSection({
    cropper,
    fileInputRef,
    onFileChange,
    gridSwitchId,
    canReCropFromPreview,
    showPasteInPreview,
}: PosterUploadSectionProps) {
    const { t } = useLocale();

    return (
        <Field>
            <FieldContent>
                <FieldLabel className="flex items-center gap-1.5">
                    <ImagePlus className="h-4 w-4" />
                    {t("poster")}
                </FieldLabel>
                <FieldDescription>
                    {t("posterDescription")}
                </FieldDescription>
            </FieldContent>
            {cropper.isCropping && cropper.editorImageSrc ? (
                <div className="space-y-3">
                    <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
                        <Cropper
                            crop={cropper.crop}
                            zoom={cropper.zoom}
                            rotation={cropper.rotation}
                            aspectRatio={4 / 3}
                            withGrid={cropper.withGrid}
                            onCropChange={cropper.setCrop}
                            onZoomChange={cropper.setZoom}
                            onRotationChange={cropper.setRotation}
                            onCropAreaChange={cropper.onCropComplete}
                        >
                            <CropperImage
                                src={cropper.editorImageSrc}
                                alt="Image to crop"
                                crossOrigin="anonymous"
                            />
                            <CropperArea />
                        </Cropper>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground w-12">{t("zoom")}</span>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={cropper.zoom}
                                onChange={(e) => cropper.setZoom(Number(e.target.value))}
                                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground w-12">{t("rotate")}</span>
                            <input
                                type="range"
                                min={0}
                                max={360}
                                step={1}
                                value={cropper.rotation}
                                onChange={(e) => cropper.setRotation(Number(e.target.value))}
                                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => cropper.setRotation((prev) => (prev + 90) % 360)}
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch id={gridSwitchId} checked={cropper.withGrid} onCheckedChange={cropper.setWithGrid} size="sm" />
                                <Label htmlFor={gridSwitchId} className="text-sm text-muted-foreground">{t("showGrid")}</Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" onClick={cropper.handleApplyCrop} className="flex-1">
                            {t("applyCrop")}
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={cropper.onCropReset}>
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" onClick={cropper.handleCancelCrop}>
                            {t("cancel")}
                        </Button>
                    </div>
                </div>
            ) : cropper.posterPreview ? (
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
                    <img
                        src={cropper.posterPreview}
                        alt="Poster preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                        {canReCropFromPreview ? (
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={t("imageEditorTitle")}
                                onClick={() => {
                                    if (!cropper.editorImageSrc && cropper.posterPreview) {
                                        cropper.setEditorImageSrc(cropper.posterPreview);
                                    }
                                    cropper.setIsCropping(true);
                                }}
                            >
                                <Crop className="h-3.5 w-3.5" />
                            </Button>
                        ) : (
                            cropper.editorImageSrc && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-label={t("imageEditorTitle")}
                                    onClick={() => cropper.setIsCropping(true)}
                                >
                                    <Crop className="h-3.5 w-3.5" />
                                </Button>
                            )
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                        </Button>
                        {showPasteInPreview && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                onClick={cropper.handlePasteFromClipboard}
                            >
                                <ClipboardPaste className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cropper.removePoster}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center flex-1 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors text-muted-foreground"
                    >
                        <ImagePlus className="h-8 w-8 mb-2" />
                        <span className="text-sm">{t("clickToUpload")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={cropper.handlePasteFromClipboard}
                        className="flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors text-muted-foreground"
                    >
                        <ClipboardPaste className="h-8 w-8 mb-2" />
                        <span className="text-xs text-center px-1">{t("pasteFromClipboard")}</span>
                    </button>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onFileChange}
            />
        </Field>
    );
}
