import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRange } from "@/hooks/useProgressData";
import { toast } from "@/hooks/use-toast";

interface Props {
  contentRef: React.RefObject<HTMLDivElement>;
  timeRange: TimeRange;
}

const labels: Record<TimeRange, string> = {
  all: "All Time",
  "6months": "Last 6 Months",
  month: "Last Month",
  week: "Last Week",
};

const PdfExportButton = ({ contentRef, timeRange }: Props) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Clone the content and force light theme for print
      const clone = contentRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.width = `${contentRef.current.offsetWidth}px`;
      clone.style.backgroundColor = "#ffffff";
      clone.style.color = "#1a1a1a";
      clone.style.padding = "24px";

      // Remove dark mode classes and force light colors
      clone.classList.remove("dark");
      clone.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.classList.remove("dark");
        // Force light-mode colors on elements
        const computed = window.getComputedStyle(htmlEl);
        if (computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)") {
          const rgb = computed.backgroundColor;
          // If background is very dark, make it light
          const match = rgb.match(/\d+/g);
          if (match) {
            const [r, g, b] = match.map(Number);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            if (luminance < 50) {
              htmlEl.style.backgroundColor = "#ffffff";
            } else if (luminance < 100) {
              htmlEl.style.backgroundColor = "#f5f5f5";
            }
          }
        }
        // Make dark text readable
        if (computed.color) {
          const match = computed.color.match(/\d+/g);
          if (match) {
            const [r, g, b] = match.map(Number);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            if (luminance > 200) {
              htmlEl.style.color = "#1a1a1a";
            }
          }
        }
        // Fix borders
        if (computed.borderColor) {
          const match = computed.borderColor.match(/\d+/g);
          if (match) {
            const [r, g, b] = match.map(Number);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
            if (luminance > 180) {
              htmlEl.style.borderColor = "#e0e0e0";
            }
          }
        }
      });

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;

      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(30, 30, 30);
      pdf.text("ClutchSAT Progress Report", margin, 18);
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Period: ${labels[timeRange]}  •  Generated: ${new Date().toLocaleDateString()}`, margin, 25);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, 28, pageW - margin, 28);

      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = usableW / imgW;
      const scaledH = imgH * ratio;
      const startY = 32;
      const availH = pageH - startY - margin;

      if (scaledH <= availH) {
        pdf.addImage(imgData, "PNG", margin, startY, usableW, scaledH);
      } else {
        let srcY = 0;
        let pageNum = 0;
        const sliceH = availH / ratio;
        while (srcY < imgH) {
          if (pageNum > 0) pdf.addPage();
          const thisSlice = Math.min(sliceH, imgH - srcY);
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = imgW;
          tempCanvas.height = thisSlice;
          const ctx = tempCanvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, imgW, thisSlice);
          ctx.drawImage(canvas, 0, srcY, imgW, thisSlice, 0, 0, imgW, thisSlice);
          pdf.addImage(tempCanvas.toDataURL("image/png"), "PNG", margin, pageNum === 0 ? startY : margin, usableW, thisSlice * ratio);
          srcY += thisSlice;
          pageNum++;
        }
      }

      pdf.save(`clutchsat-progress-${timeRange}.pdf`);
      toast({ title: "PDF exported", description: "Your progress report has been downloaded." });
    } catch {
      toast({ title: "Export failed", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      Export PDF
    </Button>
  );
};

export default PdfExportButton;
