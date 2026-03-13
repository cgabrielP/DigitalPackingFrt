import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import './CameraScanner.css'

/**
 * CameraScanner
 * Props:
 *   onScan(code: string) — callback cuando se detecta un código
 *   onClose()            — callback para cerrar el scanner
 */
export default function CameraScanner({ onScan, onClose }) {
  const videoRef    = useRef(null)
  const readerRef   = useRef(null)
  const [error,     setError]     = useState(null)
  const [cameras,   setCameras]   = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [lastCode,  setLastCode]  = useState(null)

  /* ── Inicializar lector y listar cámaras ── */
  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    // Pedir permiso de cámara primero, luego enumerar dispositivos
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        // Liberar el stream temporal — solo lo pedimos para obtener permiso
        stream.getTracks().forEach(t => t.stop())
        return navigator.mediaDevices.enumerateDevices()
      })
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput')
        if (!videoDevices.length) {
          setError('No se encontraron cámaras disponibles')
          return
        }
        // Preferir cámara trasera
        const backIdx = videoDevices.findIndex(d =>
          /back|rear|trasera|environment/i.test(d.label)
        )
        setCameras(videoDevices)
        setActiveIdx(backIdx >= 0 ? backIdx : videoDevices.length - 1)
      })
      .catch(() => setError('No se pudo acceder a la cámara. Verificá los permisos del navegador.'))

    return () => { reader.reset() }
  }, [])

  /* ── Iniciar decodificación cuando cambia la cámara activa ── */
  useEffect(() => {
    if (!cameras.length || !readerRef.current || !videoRef.current) return

    const deviceId = cameras[activeIdx]?.deviceId
    if (!deviceId) return

    setError(null)
    readerRef.current.reset()

    readerRef.current.decodeFromVideoDevice(
      deviceId,
      videoRef.current,
      (result, err) => {
        if (result) {
          const code = result.getText()
          if (code === lastCode) return
          setLastCode(code)
          if (navigator.vibrate) navigator.vibrate(80)
          onScan(code)
          setTimeout(() => setLastCode(null), 2000)
        }
        if (err && !(err instanceof NotFoundException)) {
          console.warn('[CameraScanner]', err)
        }
      }
    ).catch(e => {
      setError('Error iniciando cámara: ' + (e?.message ?? 'desconocido'))
    })

    return () => { readerRef.current?.reset() }
  }, [cameras, activeIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = () => {
    setActiveIdx(i => (i + 1) % cameras.length)
    setLastCode(null)
  }

  return (
    <div className="cscan-overlay">
      <div className="cscan-modal">

        <div className="cscan-header">
          <span className="cscan-title">ESCANEAR CÓDIGO</span>
          <button className="cscan-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="cscan-viewport">
          <video ref={videoRef} className="cscan-video" autoPlay playsInline muted />
          <div className="cscan-frame">
            <span className="cscan-corner cscan-corner--tl" />
            <span className="cscan-corner cscan-corner--tr" />
            <span className="cscan-corner cscan-corner--bl" />
            <span className="cscan-corner cscan-corner--br" />
            <div className="cscan-laser" />
          </div>
        </div>

        {error && (
          <div className="cscan-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="cscan-footer">
          <p className="cscan-hint">Apuntá al código de barras o QR de la orden</p>
          {cameras.length > 1 && (
            <button className="cscan-switch" onClick={switchCamera}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Cambiar cámara
            </button>
          )}
        </div>

      </div>
    </div>
  )
}