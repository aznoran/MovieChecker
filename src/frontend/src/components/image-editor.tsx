"use client";

import {useState, useRef, useCallback, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {ZoomIn, ZoomOut, RotateCcw} from "lucide-react";
import {useLocale} from "@/context/locale-context";
import {cn} from "@/lib/utils";

interface ImageEditorProps {
    imageSrc: string;
    onSave: (croppedFile: File) => void;
    onCancel: () => void;
}

interface Position {
    x: number;
    y: number;
}

export function ImageEditor({
    imageSrc,
    onSave,
    onCancel,
}: ImageEditorProps) {
    const {t} = useLocale();
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [zoom, setZoom] = useState(100);
    const [position, setPosition] = useState<Position>({x: 0, y: 0});
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Position>({x: 0, y: 0});
    const [imageLoaded, setImageLoaded] = useState(false);

    // Reset when image source changes
    useEffect(() => {
        setZoom(100);
        setPosition({x: 0, y: 0});
        setImageLoaded(false);
    }, [imageSrc]);

    const handleZoomChange = useCallback((newZoom: number) => {
        const clampedZoom = Math.min(300, Math.max(50, newZoom));
        setZoom(clampedZoom);
    }, []);

    // Add non-passive wheel event listener to prevent page scroll
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -10 : 10;
            setZoom(prevZoom => Math.min(300, Math.max(50, prevZoom + delta)));
        };

        container.addEventListener("wheel", handleWheel, {passive: false});
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, []);

    const handleZoomIn = useCallback(() => {
        handleZoomChange(zoom + 10);
    }, [zoom, handleZoomChange]);

    const handleZoomOut = useCallback(() => {
        handleZoomChange(zoom - 10);
    }, [zoom, handleZoomChange]);

    const handleReset = useCallback(() => {
        setZoom(100);
        setPosition({x: 0, y: 0});
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    }, [position]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setIsDragging(true);
            setDragStart({
                x: touch.clientX - position.x,
                y: touch.clientY - position.y,
            });
        }
    }, [position]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleSave = useCallback(() => {
        if (!containerRef.current || !imageRef.current || !canvasRef.current) return;

        const container = containerRef.current;
        const image = imageRef.current;
        const canvas = canvasRef.current;

        // Ensure image is fully loaded with valid dimensions
        if (!image.naturalWidth || !image.naturalHeight) {
            console.error("Image not loaded or has no dimensions");
            return;
        }

        // Get the container dimensions (the visible area)
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        // Set canvas to the output size (use container aspect ratio for consistency)
        const outputWidth = 800;
        const outputHeight = Math.round(outputWidth * containerHeight / containerWidth);
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate the scale factor for the displayed image
        const scale = zoom / 100;
        
        // The displayed image dimensions (how big the image appears)
        const displayedWidth = image.naturalWidth * scale;
        const displayedHeight = image.naturalHeight * scale;

        // The image is centered in the container via CSS:
        // left: 50%, top: 50% puts the image's top-left at container center
        // transform: translate(-50% + posX, -50% + posY) moves it by half its displayed size plus user offset
        // 
        // So the image's center is at:
        //   centerX = containerWidth/2 + position.x
        //   centerY = containerHeight/2 + position.y
        //
        // And the image's top-left corner (in container coordinates) is at:
        //   imageLeft = centerX - displayedWidth/2 = containerWidth/2 + position.x - displayedWidth/2
        //   imageTop = centerY - displayedHeight/2 = containerHeight/2 + position.y - displayedHeight/2

        const imageLeft = containerWidth / 2 + position.x - displayedWidth / 2;
        const imageTop = containerHeight / 2 + position.y - displayedHeight / 2;

        // The visible portion of the container (0, 0) to (containerWidth, containerHeight)
        // maps to these coordinates in the displayed image:
        //   visibleLeft = 0 - imageLeft = -imageLeft
        //   visibleTop = 0 - imageTop = -imageTop
        //
        // Convert from displayed image coordinates to source image coordinates by dividing by scale
        const srcX = -imageLeft / scale;
        const srcY = -imageTop / scale;
        const srcWidth = containerWidth / scale;
        const srcHeight = containerHeight / scale;

        // Draw the visible portion of the image onto the canvas
        ctx.drawImage(
            image,
            srcX,
            srcY,
            srcWidth,
            srcHeight,
            0,
            0,
            outputWidth,
            outputHeight
        );

        // Convert canvas to blob and create a File
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "poster.png", {type: "image/png"});
                onSave(file);
            } else {
                console.error("Failed to create blob from canvas - canvas may be tainted by CORS");
            }
        }, "image/png", 0.95);
    }, [zoom, position, onSave]);

    return (
        <div className="flex flex-col gap-3">
            {/* Image container */}
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full h-48 overflow-hidden rounded-lg border bg-muted cursor-grab select-none",
                    isDragging && "cursor-grabbing"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Edit preview"
                    className="absolute pointer-events-none left-1/2 top-1/2"
                    crossOrigin="anonymous"
                    style={{
                        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom / 100})`,
                        transformOrigin: "center center",
                        maxWidth: "none",
                        maxHeight: "none",
                    }}
                    onLoad={() => setImageLoaded(true)}
                    draggable={false}
                />
                {/* Overlay grid/guide */}
                <div className="absolute inset-0 pointer-events-none border-2 border-white/20" />
            </div>

            {/* Hidden canvas for export */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>

                <div className="flex-1 flex items-center gap-2">
                    <input
                        type="range"
                        min={50}
                        max={300}
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                        {zoom}%
                    </span>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    disabled={zoom >= 300}
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleReset}
                    title={t("imageEditorReset")}
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>
                    {t("cancel")}
                </Button>
                <Button type="button" onClick={handleSave} disabled={!imageLoaded}>
                    {t("imageEditorApply")}
                </Button>
            </div>
        </div>
    );
}
