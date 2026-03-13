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
    // Semana lunes→domingo
    const dow  = now.getDay() === 0 ? 6 : now.getDay() - 1
    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
    rangeEnd   = new Date(rangeStart.getTime() + 7 * 86_400_000 - 1)
    periodLabel = `Semana ${fmt(rangeStart)} – ${fmt(rangeEnd)}`

  } else {
    // Mes completo
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
  cityFilter   = 'all',
  search       = '',
}) => {
  const now = new Date()
  const { rangeStart, rangeEnd, periodLabel } = buildDateRange(period)

  // ── Filtrar por rango ──────────────────────────────────────────────────────
  const inRange = assignments.filter(a => {
    const d = new Date(a.assignedAt)
    return d >= rangeStart && d <= rangeEnd
  })

  if (inRange.length === 0) {
    return { ok: false, count: 0 }
  }

  // ── Métricas de resumen ────────────────────────────────────────────────────
  const totalAsignadas  = inRange.length
  const totalEntregadas = inRange.filter(a => a.order?.shippingStatus === 'delivered').length
  const totalEnTransito = inRange.filter(a => a.order?.shippingStatus === 'shipped').length

  // ── Setup documento ────────────────────────────────────────────────────────
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(10, 15, 30)
  doc.rect(0, 0, pageW, 30, 'F')

  // Línea de acento izquierda
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

  // Fecha de generación — alineada a la derecha
  const genStr = `Generado ${now.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })} · ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
  doc.setFontSize(7)
  doc.text(genStr, pageW - 10, 18, { align: 'right' })

  // Filtros activos
  const activeFiltersDesc = [
    deliveryName             && `Delivery: ${deliveryName}`,
    cityFilter !== 'all'     && `Ciudad: ${cityFilter}`,
    search                   && `Búsqueda: "${search}"`,
  ].filter(Boolean)

  if (activeFiltersDesc.length > 0) {
    doc.setTextColor(99, 102, 241)
    doc.setFontSize(7)
    doc.text(`Filtros activos: ${activeFiltersDesc.join('  ·  ')}`, 10, 25)
  }

  // ── CARDS DE RESUMEN ──────────────────────────────────────────────────────
  const cardY = 35
  const cards = [
    { label: 'ASIGNADAS',   value: totalAsignadas,  color: [30, 41, 59],   bg: [241, 245, 249] },
    { label: 'ENTREGADAS',  value: totalEntregadas, color: [22, 163, 74],  bg: [240, 253, 244] },
    { label: 'EN TRÁNSITO', value: totalEnTransito, color: [124, 58, 237], bg: [245, 243, 255] },
  ]

  const cardW   = (pageW - 28) / 3
  const cardGap = 4

  cards.forEach(({ label, value, color, bg }, i) => {
    const x = 14 + i * (cardW + cardGap)
    doc.setFillColor(...bg)
    doc.roundedRect(x, cardY, cardW, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(label, x + 5, cardY + 5.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...color)
    doc.text(String(value), x + 5, cardY + 13)
  })

  // ── TABLA ─────────────────────────────────────────────────────────────────
  const rows = inRange.map(a => {
    const productos = a.order?.orderItems
      ?.map(i => `${i.quantity}x ${i.title}`)
      .join('\n') || '—'

    const shippingKey   = a.order?.shippingStatus ?? ''
    const shippingLabel = SHIPPING_LABEL[shippingKey] ?? shippingKey?.toUpperCase() ?? '—'

    return [
      a.order?.packId ?? a.order?.id ?? '—',
      productos,
      a.order?.receiverCity ?? '—',
      a.deliveryUser?.name ?? '—',
      shippingLabel,
    ]
  })

  autoTable(doc, {
    startY: cardY + 22,
    head:   [['ID ORDEN', 'PRODUCTOS', 'CIUDAD', 'DELIVERY', 'ESTADO ENVÍO']],
    body:   rows,
    headStyles: {
      fillColor:   [10, 15, 30],
      textColor:   [255, 255, 255],
      fontSize:    8,
      fontStyle:   'bold',
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      lineColor:   [30, 41, 59],
      lineWidth:   0,
    },
    bodyStyles: {
      fontSize:   8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor:  [30, 41, 59],
      lineColor:  [226, 232, 240],
      lineWidth:  0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold', textColor: [99, 102, 241] },
      1: { cellWidth: 68 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30 },
      4: { cellWidth: 28 },
    },
    // Colorear la celda de estado envío
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const color = SHIPPING_COLOR[data.cell.raw]
        if (color) data.cell.styles.textColor = color
        data.cell.styles.fontStyle = 'bold'
      }
    },
    // Línea separadora después del header
    didDrawPage: (data) => {
      const { pageNumber, pageCount } = doc.internal
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      // Footer
      doc.text(
        `Pág. ${pageNumber} de ${pageCount}`,
        pageW - 14,
        pageH - 8,
        { align: 'right' }
      )
      doc.text('Sistema de Picking · Reporte Delivery', 14, pageH - 8)
      // Línea footer
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(14, pageH - 12, pageW - 14, pageH - 12)
    },
    margin: { left: 14, right: 14, bottom: 16 },
  })

  // ── DESCARGAR ─────────────────────────────────────────────────────────────
  const fileName = `reporte-delivery-${period}-${now.toISOString().split('T')[0]}.pdf`
  doc.save(fileName)

  return { ok: true, count: inRange.length }
}