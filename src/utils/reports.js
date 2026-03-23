// src/utils/generateDeliveryReport.js
// Generador de PDF para reportes de asignaciones de delivery.
// Dependencias: jspdf + jspdf-autotable
// Instalar: npm install jspdf jspdf-autotable

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─────────────────────────────────────────
//  CONSTANTES
// ─────────────────────────────────────────

const SHIPPING_LABEL = {
  delivered:     'Entregado',
  shipped:       'En tránsito',
  not_delivered: 'No entregado',
  pending:       'Pendiente',
  ready_to_ship: 'Listo para enviar',
  handling:      'En preparación',
}

const SHIPPING_COLOR = {
  'Entregado':          [22,  163, 74],
  'En tránsito':        [124, 58,  237],
  'No entregado':       [239, 68,  68],
  'Listo para enviar':  [251, 191, 36],
  'En preparación':     [96,  165, 250],
  'Pendiente':          [148, 163, 184],
}

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────

const fmt = (d) =>
  d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })

const fmtFull = (d) =>
  d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const fmtPeso = (n) =>
  `$${Number(n).toLocaleString('es-CL')}`

/**
 * Calcula el rango de fechas según el período elegido.
 * @param {'day'|'week'|'month'} period
 * @returns {{ rangeStart: Date, rangeEnd: Date, periodLabel: string }}
 */
export const buildDateRange = (period) => {
  const now = new Date()
  let rangeStart, rangeEnd, periodLabel

  if (period === 'day') {
    rangeStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    rangeEnd    = new Date(rangeStart.getTime() + 86_400_000 - 1)
    periodLabel = fmtFull(now)

  } else if (period === 'week') {
    const dow  = now.getDay() === 0 ? 6 : now.getDay() - 1
    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
    rangeEnd   = new Date(rangeStart.getTime() + 7 * 86_400_000 - 1)
    periodLabel = `Semana ${fmt(rangeStart)} – ${fmt(rangeEnd)}`

  } else {
    rangeStart  = new Date(now.getFullYear(), now.getMonth(), 1)
    rangeEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    periodLabel = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  }

  return { rangeStart, rangeEnd, periodLabel }
}

// ─────────────────────────────────────────
//  GENERADOR PRINCIPAL
// ─────────────────────────────────────────

/**
 * Genera y descarga el PDF de reporte de asignaciones.
 *
 * @param {object}   opts
 * @param {Array}    opts.assignments      - Array de asignaciones ya filtradas (filteredAssignments)
 * @param {'day'|'week'|'month'} opts.period
 * @param {string}   [opts.deliveryName]  - Nombre del delivery filtrado (o null si todos)
 * @param {string}   [opts.cityFilter]    - Ciudad filtrada (o 'all')
 * @param {string}   [opts.search]        - Texto de búsqueda activo
 * @returns {{ ok: boolean, count: number }}
 */
export const generateDeliveryReport = ({
  assignments,
  period,
  deliveryName = null,
}) => {
  const now = new Date()
  const { periodLabel } = buildDateRange(period)

  if (!assignments.length) return { ok: false, count: 0 }

  // ── Métricas ───────────────────────────────────────────────────────────────
  const totalAsignadas  = assignments.length
  const totalEntregadas = assignments.filter(a => a.order?.shippingStatus === 'delivered').length
  const totalEnTransito = assignments.filter(a => a.order?.shippingStatus === 'shipped').length

  // Total a pagar: solo entregadas y no canceladas — misma lógica que la UI
  const totalAPagar = assignments
    .filter(a =>
      a.order?.shippingStatus === 'delivered' &&
      a.order?.status !== 'cancelled'
    )
    .reduce((sum, a) => sum + (a.paymentAmount || 0), 0)

  // ── Setup ──────────────────────────────────────────────────────────────────
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setFillColor(10, 15, 30)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, 3, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('REPORTE DE ASIGNACIONES DELIVERY', 10, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(periodLabel.toUpperCase(), 10, 18)

  const genStr = `Generado ${now.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })} · ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
  doc.setFontSize(7)
  doc.text(genStr, pageW - 10, 18, { align: 'right' })

  if (deliveryName) {
    doc.setTextColor(99, 102, 241)
    doc.setFontSize(7)
    doc.text(`Delivery: ${deliveryName}`, 10, 25)
  }

  // ── CARDS DE RESUMEN — 4 cards incluyendo TOTAL A PAGAR ───────────────────
  const cardY   = 35
  const cardGap = 4
  const cardW   = (pageW - 28 - cardGap * 3) / 4

  const cards = [
    { label: 'ASIGNADAS',     value: String(totalAsignadas),  color: [30, 41, 59],   bg: [241, 245, 249] },
    { label: 'ENTREGADAS',    value: String(totalEntregadas), color: [22, 163, 74],  bg: [240, 253, 244] },
    { label: 'EN TRÁNSITO',   value: String(totalEnTransito), color: [124, 58, 237], bg: [245, 243, 255] },
    { label: 'TOTAL A PAGAR', value: fmtPeso(totalAPagar),    color: [5, 150, 105],  bg: [236, 253, 245] },
  ]

  cards.forEach(({ label, value, color, bg }, i) => {
    const x = 14 + i * (cardW + cardGap)
    doc.setFillColor(...bg)
    doc.roundedRect(x, cardY, cardW, 17, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(label, x + 4, cardY + 5.5)
    doc.setFont('helvetica', 'bold')
    // Fuente ligeramente menor para el valor monetario (más largo)
    doc.setFontSize(i === 3 ? 10 : 13)
    doc.setTextColor(...color)
    doc.text(value, x + 4, cardY + 14)
  })

  // ── TABLA ──────────────────────────────────────────────────────────────────
  const fmtAssignedAt = (val) => {
    if (!val) return '—'
    const d = new Date(val)
    if (isNaN(d)) return '—'
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  const rows = assignments.map(a => {
    const productos     = a.order?.orderItems
      ?.map(i => `${i.quantity}x ${i.title}`)
      .join('\n') || '—'
    const shippingKey   = a.order?.shippingStatus ?? ''
    const shippingLabel = SHIPPING_LABEL[shippingKey] ?? shippingKey?.toUpperCase() ?? '—'

    const pago = (
      a.order?.shippingStatus === 'delivered' &&
      a.order?.status !== 'cancelled'
    ) ? fmtPeso(a.paymentAmount || 0) : '—'

    return [
      a.order?.packId ?? a.order?.id ?? '—',
      productos,
      a.order?.receiverCity ?? '—',
      a.deliveryUser?.name ?? '—',
      fmtAssignedAt(a.assignedAt),
      shippingLabel,
      pago,
    ]
  })

  autoTable(doc, {
    startY: cardY + 23,
    head:   [['ID ORDEN', 'PRODUCTOS', 'CIUDAD', 'DELIVERY', 'FECHA ASIG.', 'ESTADO ENVÍO', 'PAGO']],
    body:   rows,
    headStyles: {
      fillColor:   [10, 15, 30],
      textColor:   [255, 255, 255],
      fontSize:    8,
      fontStyle:   'bold',
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      lineWidth:   0,
    },
    bodyStyles: {
      fontSize:    8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor:   [30, 41, 59],
      lineColor:   [226, 232, 240],
      lineWidth:   0.2,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', textColor: [99, 102, 241] },
      1: { cellWidth: 48 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 24 },
      6: { cellWidth: 21, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 5) {
          const color = SHIPPING_COLOR[data.cell.raw]
          if (color) data.cell.styles.textColor = color
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.index === 6 && data.cell.raw !== '—') {
          data.cell.styles.textColor = [5, 150, 105]
        }
      }
    },
    didDrawPage: () => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Pág. ${doc.internal.getCurrentPageInfo().pageNumber} de ${doc.internal.getNumberOfPages()}`,
        pageW - 14,
        pageH - 8,
        { align: 'right' }
      )
      doc.text('Sistema de Picking · Reporte Delivery', 14, pageH - 8)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(14, pageH - 12, pageW - 14, pageH - 12)
    },
    margin: { left: 14, right: 14, bottom: 16 },
  })

  // ── FILA DE TOTAL al pie de la tabla ──────────────────────────────────────
  const finalY    = doc.lastAutoTable.finalY + 4
  const totalRowH = 11

  doc.setFillColor(236, 253, 245)
  doc.roundedRect(14, finalY, pageW - 28, totalRowH, 2, 2, 'F')
  doc.setDrawColor(22, 163, 74)
  doc.setLineWidth(0.5)
  doc.roundedRect(14, finalY, pageW - 28, totalRowH, 2, 2, 'S')

  // Label izquierda
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(5, 150, 105)
  doc.text('TOTAL A PAGAR', 19, finalY + 7.2)

  // Detalle centro
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `${totalEntregadas} entregadas de ${totalAsignadas} asignadas`,
    pageW / 2,
    finalY + 7.2,
    { align: 'center' }
  )

  // Monto derecha
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(5, 150, 105)
  doc.text(fmtPeso(totalAPagar), pageW - 19, finalY + 7.2, { align: 'right' })

  // ── DESCARGAR ─────────────────────────────────────────────────────────────
  const fileName = `reporte-delivery-${period}-${now.toISOString().split('T')[0]}.pdf`
  doc.save(fileName)

  return { ok: true, count: assignments.length }
}