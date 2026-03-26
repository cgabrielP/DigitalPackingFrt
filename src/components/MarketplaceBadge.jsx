import './MarketplaceBadge.css'

const CONFIG = {
  MERCADOLIBRE: { label: 'ML',       name: 'Mercado Libre', cls: 'mp-ml'      },
  FALABELLA:    { label: 'FAL',      name: 'Falabella',     cls: 'mp-falabella'},
  RIPLEY:       { label: 'RIP',      name: 'Ripley',        cls: 'mp-ripley'  },
  WALMART:      { label: 'WMT',      name: 'Walmart',       cls: 'mp-walmart' },
  HITES:        { label: 'HIT',      name: 'Hites',         cls: 'mp-hites'   },
}

export default function MarketplaceBadge({ marketplace, size = 'sm' }) {
  const cfg = CONFIG[marketplace] ?? { label: '?', name: marketplace ?? 'Desconocido', cls: 'mp-unknown' }

  return (
    <span className={`mp-badge ${cfg.cls} mp-badge--${size}`} title={cfg.name}>
      {cfg.label}
    </span>
  )
}
