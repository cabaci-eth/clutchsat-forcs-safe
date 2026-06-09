import { useState, useRef, useCallback, useEffect } from "react";
import { X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesmosCalculatorProps {
  open: boolean;
  onClose: () => void;
}

const DESMOS_URL = "https://www.desmos.com/testing/collegeboard/graphing";

const DesmosCalculator = ({ open, onClose }: DesmosCalculatorProps) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 500, h: 550 });
  const [maximized, setMaximized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampSize = useCallback((next: { w: number; h: number }) => {
    const maxW = Math.max(320, Math.round(window.innerWidth * 0.9));
    const maxH = Math.max(280, Math.round(window.innerHeight * 0.9));
    return {
      w: Math.min(maxW, Math.max(300, next.w)),
      h: Math.min(maxH, Math.max(250, next.h)),
    };
  }, []);

  // Center on open
  useEffect(() => {
    if (open && !initialized) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;
      const w = isMobile ? Math.round(vw * 0.9) : 500;
      const h = isMobile ? Math.round(Math.min(vh * 0.9, 600)) : 550;
      setSize(clampSize({ w, h }));
      setPos({ x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2) });
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, initialized]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  const startResize = useCallback((clientX: number, clientY: number) => {
    setResizing(true);
    dragOffset.current = { x: clientX, y: clientY };
  }, []);

  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(e.clientX, e.clientY);
  }, [startResize]);

  const handleResizeTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    startResize(touch.clientX, touch.clientY);
  }, [startResize]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (resizing) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        dragOffset.current = { x: e.clientX, y: e.clientY };
        setSize((s) => clampSize({ w: s.w + dx, h: s.h + dy }));
      }
    };

    const handleUp = () => {
      setDragging(false);
      setResizing(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [clampSize, dragging, resizing]);

  // Touch support for drag
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setDragging(true);
    dragOffset.current = { x: touch.clientX - pos.x, y: touch.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      if (dragging) {
        setPos({ x: touch.clientX - dragOffset.current.x, y: touch.clientY - dragOffset.current.y });
      }

      if (resizing) {
        const dx = touch.clientX - dragOffset.current.x;
        const dy = touch.clientY - dragOffset.current.y;
        dragOffset.current = { x: touch.clientX, y: touch.clientY };
        setSize((s) => clampSize({ w: s.w + dx, h: s.h + dy }));
      }
    };
    const handleTouchEnd = () => {
      setDragging(false);
      setResizing(false);
    };
    // Prevent page scroll while dragging/resizing
    const preventScroll = (e: TouchEvent) => { e.preventDefault(); };
    document.body.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.body.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [clampSize, dragging, resizing]);

  if (!open) return null;

  const style = maximized
    ? { top: 0, left: 0, width: "100vw", height: "100vh" }
    : { top: pos.y, left: pos.x, width: size.w, height: size.h };

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      style={style}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/80 border-b border-border cursor-move select-none shrink-0 touch-none"
        onMouseDown={!maximized ? handleMouseDown : undefined}
        onTouchStart={!maximized ? handleTouchStart : undefined}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          Desmos Graphing Calculator
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setMaximized((m) => !m)}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        src={DESMOS_URL}
        className="flex-1 w-full border-0"
        title="Desmos Graphing Calculator"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />

      {/* Resize handle */}
      {!maximized && (
        <div
          className="absolute bottom-0 right-0 z-20 flex h-8 w-8 cursor-nwse-resize items-end justify-end p-1 touch-none"
          onMouseDown={handleResizeDown}
          onTouchStart={handleResizeTouchStart}
          aria-label="Resize calculator"
        >
          <svg viewBox="0 0 20 20" className="h-full w-full text-muted-foreground/70">
            <path d="M14 20L20 14M10 20L20 10M6 20L20 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default DesmosCalculator;
