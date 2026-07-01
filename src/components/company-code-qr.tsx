import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { QRCodeCanvas } from "qrcode.react"
import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveBlob } from "@/lib/download"
import { neutral } from "@/lib/colors"

const QR_SIZE = 200

interface CompanyCodeQrProps {
  /** Chaîne brute encodée dans le QR : le code société, rien d'autre. */
  code: string
  companyName: string
}

export function CompanyCodeQr({ code, companyName }: CompanyCodeQrProps) {
  const { t } = useTranslation()
  const wrapper = useRef<HTMLDivElement>(null)

  const getCanvas = () =>
    wrapper.current?.querySelector("canvas") as HTMLCanvasElement | null

  const handleDownload = () => {
    const canvas = getCanvas()
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, `${code}.png`)
    }, "image/png")
  }

  const handlePrint = () => {
    const canvas = getCanvas()
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=640")
    if (!win) return
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${code}</title>` +
        `<style>` +
        `body{margin:0;font-family:system-ui,sans-serif;display:flex;flex-direction:column;` +
        `align-items:center;justify-content:center;min-height:100vh;gap:16px;color:${neutral[900]}}` +
        `img{width:280px;height:280px}` +
        `h1{font-size:18px;margin:0}` +
        `p{font-size:14px;margin:0;color:${neutral[700]}}` +
        `code{font-size:22px;letter-spacing:2px;font-weight:600}` +
        `</style></head><body onload="window.focus();window.print()">` +
        `<h1>${companyName}</h1>` +
        `<img src="${dataUrl}" alt="${code}" />` +
        `<code>${code}</code>` +
        `<p>${t("company.settings.qrCaption")}</p>` +
        `</body></html>`,
    )
    win.document.close()
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
        <div ref={wrapper}>
          <QRCodeCanvas
            value={code}
            size={QR_SIZE}
            marginSize={4}
            level="M"
            bgColor={neutral.white}
            fgColor={neutral[900]}
            title={t("company.settings.qrCaption")}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("company.settings.qrCaption")}
        </p>
        <span className="font-mono text-lg font-semibold tracking-widest text-foreground">
          {code}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
          <Download />
          {t("company.settings.qrDownload")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
          <Printer />
          {t("company.settings.qrPrint")}
        </Button>
      </div>
    </div>
  )
}
