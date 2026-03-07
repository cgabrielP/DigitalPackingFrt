import { useState, useCallback } from 'react'
import Header from './Header'
import Sidebar, { SidebarContext } from './Sidebar'

/**
 * Layout — envuelve Header + Sidebar + contenido.
 * Usalo en cada página así:
 *
 *   <Layout theme={theme} onToggleTheme={toggleTheme} onSync={handleSync} syncing={syncing}>
 *     <div className="orders-main"> ... </div>
 *   </Layout>
 *
 * Props que pasa al Header: theme, onToggleTheme, onSync, syncing, syncMsg, navPath
 * Props propias: children, pendingDeliveryCount
 */
export default function Layout({
  children,
  theme,
  onToggleTheme,
  onSync        = null,
  syncing       = false,
  syncMsg       = null,
  navPath       = null,
  subtitle      = 'SYSTEM',
  pendingDeliveryCount = 0,
}) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapse = useCallback(() => setCollapsed(v => !v),  [])
  const toggleMobile   = useCallback(() => setMobileOpen(v => !v), [])

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggleCollapse, toggleMobile }}>
      <div className="layout-root">

        {/* ── Header ── */}
        <Header
          subtitle={subtitle}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSync={onSync}
          syncing={syncing}
          syncMsg={syncMsg}
          navPath={navPath}
          onMenuToggle={toggleMobile}
        />

        <div className="layout-body">

          {/* ── Sidebar ── */}
          <Sidebar pendingDeliveryCount={pendingDeliveryCount} />

          {/* ── Contenido ── */}
          <main className={`layout-main ${collapsed ? 'layout-main--collapsed' : ''}`}>
            {children}
          </main>

        </div>
      </div>
    </SidebarContext.Provider>
  )
}