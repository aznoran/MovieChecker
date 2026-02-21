"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { CropperAreaData } from "@/components/ui/cropper";
import { getCroppedImage } from "@/lib/crop-utils";
import { useLocale } from "@/context/locale-context";

interface UseImageCropperOptions {
    initialPreview?: string | null;
    onPosterRemoved?: () => void;
}

export function useImageCropper(options: UseImageCropperOptions = {}) {
    const { t } = useLocale();

    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(options.initialPreview ?? null);
    const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [withGrid, setWithGrid] = useState(false);
    const croppedAreaPixelsRef = useRef<CropperAreaData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onCropReset = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
    }, []);

    const onCropComplete = useCallback((_: CropperAreaData, croppedPixels: CropperAreaData) => {
        croppedAreaPixelsRef.current = croppedPixels;
    }, []);

    const startCropping = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditorImageSrc(reader.result as string);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            croppedAreaPixelsRef.current = null;
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    }, []);

    const applyCropAndGetFile = async (): Promise<File | null> => {
        if (!editorImageSrc) return null;
        let file: File;
        if (croppedAreaPixelsRef.current) {
            const blob = await getCroppedImage(editorImageSrc, croppedAreaPixelsRef.current, rotation);
            file = new File([blob], "cropped-poster.jpg", { type: "image/jpeg" });
        } else {
            const res = await fetch(editorImageSrc);
            const blob = await res.blob();
            file = new File([blob], "poster.jpg", { type: blob.type || "image/jpeg" });
        }
        setPosterFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPosterPreview(reader.result as string);
        reader.readAsDataURL(file);
        setIsCropping(false);
        return file;
    };

    const handleApplyCrop = async () => {
        try {
            await applyCropAndGetFile();
        } catch {
            toast.error(t("cropFailed"), { position: "top-center" });
        }
    };

    const handleCancelCrop = () => {
        if (!posterPreview) {
            setEditorImageSrc(null);
        }
        setIsCropping(false);
    };

    const handlePasteFromClipboard = async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find((t) => t.startsWith("image/"));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const ext = imageType.split("/")[1] || "png";
                    const file = new File([blob], `clipboard.${ext}`, { type: imageType });
                    startCropping(file);
                    return;
                }
            }
            toast.error(t("clipboardNoImage"), { position: "top-center" });
        } catch {
            toast.error(t("clipboardNoImage"), { position: "top-center" });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        startCropping(file);
    };

    const removePoster = () => {
        setPosterFile(null);
        setPosterPreview(null);
        setEditorImageSrc(null);
        setIsCropping(false);
        onCropReset();
        croppedAreaPixelsRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = "";
        options.onPosterRemoved?.();
    };

    const resetCropper = useCallback((preview?: string | null) => {
        setPosterFile(null);
        setPosterPreview(preview ?? null);
        setEditorImageSrc(null);
        setIsCropping(false);
        onCropReset();
        croppedAreaPixelsRef.current = null;
    }, [onCropReset]);

    return {
        posterFile,
        posterPreview,
        editorImageSrc,
        isCropping,
        crop,
        zoom,
        rotation,
        withGrid,
        fileInputRef,
        setCrop,
        setZoom,
        setRotation,
        setWithGrid,
        setIsCropping,
        setEditorImageSrc,
        onCropReset,
        onCropComplete,
        startCropping,
        applyCropAndGetFile,
        handleApplyCrop,
        handleCancelCrop,
        handlePasteFromClipboard,
        handleFileChange,
        removePoster,
        resetCropper,
    };
}
