'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface MapPickerProps {
  onSelect: (displayName: string) => void
  onClose: () => void
}

function MapCenterTracker({ onCenterChange }: { onCenterChange: (lat: number, lon: number) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useMapEvents({
    moveend(e) {
      const center = e.target.getCenter()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onCenterChange(center.lat, center.lng)
      }, 500)
    },
  })
  return null
}

function FlyController({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 16)
  }, [target, map])
  return null
}

export default function MapPicker({ onSelect, onClose }: MapPickerProps) {
  const [previewAddress, setPreviewAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string; place_id: number }[]>([])
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`)
      const data = await res.json()
      if (data.display_name) setPreviewAddress(data.display_name)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reverseGeocode(51.1657, 10.4515)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchInput(val: string) {
    setSearchQuery(val)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setSearchResults([])
    if (val.length < 3) return
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`)
        const data = await res.json()
        setSearchResults(data)
      } catch { /* ignore */ }
    }, 350)
  }

  function flyToResult(lat: string, lon: string, name: string) {
    setSearchQuery(name)
    setSearchResults([])
    const pos: [number, number] = [parseFloat(lat), parseFloat(lon)]
    setFlyTarget(pos)
    reverseGeocode(pos[0], pos[1])
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 border-b border-gray-100">
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <polyline points="15,18 9,12 15,6" stroke="#1A1F2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="font-bold text-[#1A1F2E] text-base">Ort auf Karte wählen</h2>
      </div>

      {/* Search bar — z-[1000] so dropdown appears above Leaflet panes (max z-index 700) */}
      <div className="relative z-[1000] px-4 py-2 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Ort suchen…"
            className="flex-1 bg-transparent text-sm text-[#1A1F2E] outline-none placeholder-gray-400"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {searchResults.map(r => (
              <button
                key={r.place_id}
                onMouseDown={() => flyToResult(r.lat, r.lon, r.display_name)}
                className="w-full text-left px-4 py-3 text-sm text-[#1A1F2E] hover:bg-gray-50 border-b border-gray-100 last:border-0 truncate"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer
          center={[51.1657, 10.4515]}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          <MapCenterTracker onCenterChange={reverseGeocode} />
          <FlyController target={flyTarget} />
        </MapContainer>

        {/* Fixed crosshair */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 800 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="4" fill="#F05A1E" />
            <line x1="16" y1="2" x2="16" y2="10" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="22" x2="16" y2="30" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
            <line x1="2" y1="16" x2="10" y2="16" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="16" x2="30" y2="16" stroke="#F05A1E" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="#F05A1E" strokeWidth="2" />
            <circle cx="12" cy="10" r="3" stroke="#F05A1E" strokeWidth="2" />
          </svg>
          <p className="text-sm text-[#1A1F2E] leading-snug">
            {loading ? 'Adresse wird geladen…' : previewAddress || 'Karte bewegen um Ort zu wählen'}
          </p>
        </div>
        <button
          disabled={!previewAddress || loading}
          onClick={() => { if (previewAddress) onSelect(previewAddress) }}
          className="w-full rounded-2xl bg-[#F05A1E] py-4 font-bold text-white text-base disabled:opacity-40"
        >
          Übernehmen
        </button>
      </div>
    </div>
  )
}
