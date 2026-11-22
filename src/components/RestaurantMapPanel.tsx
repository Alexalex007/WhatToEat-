/// <reference types="google.maps" />
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Footprints,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Star,
} from 'lucide-react';
import { HK_DISTRICTS } from '../data/hkFoods';

interface RestaurantResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  userRatingCount: number;
  priceLevelLabel: string;
  isOpenText: string;
  googleMapsURI: string;
}

interface RouteSummary {
  distanceMeters: number;
  durationMillis: number;
  steps: { instruction: string; distanceText: string; durationText: string }[];
}

interface RestaurantMapPanelProps {
  mapsApiKey: string;
  mapsConfigLoaded: boolean;
  searchKeyword: string;
  maxWalkKm: number;
  onChangeSearchKeyword: (kw: string) => void;
}

function isQuotaError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : String(err);
  const upper = msg.toUpperCase();
  return (
    upper.includes('429') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('OVER_QUERY_LIMIT') ||
    upper.includes('QUOTA')
  );
}

function formatPriceLevel(level: unknown): string {
  const str = String(level || '');
  if (str.includes('INEXPENSIVE')) return '$';
  if (str.includes('MODERATE')) return '$$';
  if (str.includes('EXPENSIVE') && !str.includes('VERY')) return '$$$';
  if (str.includes('VERY_EXPENSIVE')) return '$$$$';
  return '';
}

function formatDurationHK(ms: number): string {
  const totalMins = Math.max(1, Math.round(ms / 60000));
  if (totalMins < 60) return `約 ${totalMins} 分鐘`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `約 ${hrs} 小時 ${mins} 分鐘` : `約 ${hrs} 小時`;
}

function formatDistanceHK(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} 米`;
  return `${(meters / 1000).toFixed(2)} 公里`;
}

interface MapWorkspaceProps {
  origin: { lat: number; lng: number };
  originLabel: string;
  searchKeyword: string;
  maxWalkKm: number;
  minReviews: number;
  travelMode: 'WALKING' | 'DRIVING';
  onTravelModeChange: (mode: 'WALKING' | 'DRIVING') => void;
  onRelaxMinReviews: () => void;
}

function MapWorkspace({
  origin,
  originLabel,
  searchKeyword,
  maxWalkKm,
  minReviews,
  travelMode,
  onTravelModeChange,
  onRelaxMinReviews,
}: MapWorkspaceProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [restaurants, setRestaurants] = useState<RestaurantResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeTarget, setRouteTarget] = useState<RestaurantResult | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Use plain Record instead of new Map() to avoid Map component name shadowing
  const markerRefs = useRef<Record<string, google.maps.marker.AdvancedMarkerElement | null>>({});
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }, []);

  // Re-center map when origin changes and no active route
  useEffect(() => {
    if (map && !routeTarget) {
      map.panTo(origin);
      map.setZoom(15);
    }
  }, [map, origin, routeTarget]);

  // Places API (New): Place.searchByText
  useEffect(() => {
    if (!placesLib || !searchKeyword.trim()) return;

    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    setRouteTarget(null);
    setRouteSummary(null);
    clearPolylines();

    const runSearch = async () => {
      try {
        const textQuery = `${searchKeyword.trim()} 餐廳`;
        const response = await placesLib.Place.searchByText({
          textQuery,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'regularOpeningHours',
            'priceLevel',
            'googleMapsURI',
          ],
          locationBias: {
            center: origin,
            radius: Math.max(1000, Math.min(3000, maxWalkKm * 1000)),
          },
          minRating: 4.0,
          maxResultCount: 18,
          language: 'zh-HK',
          region: 'HK',
        });

        if (cancelled) return;

        const placesList = response?.places || [];
        const mapped: RestaurantResult[] = [];

        for (const p of placesList) {
          const rating = p.rating ?? 0;
          const count = p.userRatingCount ?? 0;
          const loc = p.location;
          if (!loc || rating < 4.0 || count < minReviews) continue;

          const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
          const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          let isOpenText = '營業狀態未明';
          if (typeof p.isOpen === 'function') {
            try {
              const openNow = await p.isOpen();
              if (openNow === true) isOpenText = '營業中';
              else if (openNow === false) isOpenText = '休息中';
            } catch {
              // Keep fallback text
            }
          }

          mapped.push({
            id: p.id || `${lat}_${lng}`,
            name: p.displayName || '精選餐廳',
            address: p.formattedAddress || '香港',
            lat,
            lng,
            rating,
            userRatingCount: count,
            priceLevelLabel: formatPriceLevel(p.priceLevel),
            isOpenText,
            googleMapsURI:
              p.googleMapsURI ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName || textQuery)}`,
          });
        }

        // Sort by weighted quality (rating & review count)
        mapped.sort((a, b) => {
          const scoreA = a.rating * 100 + Math.min(500, a.userRatingCount) * 0.1;
          const scoreB = b.rating * 100 + Math.min(500, b.userRatingCount) * 0.1;
          return scoreB - scoreA;
        });

        if (!cancelled) {
          setRestaurants(mapped);
          setSelectedId(mapped[0]?.id || null);
        }
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSearchError('搜尋附近餐廳時發生問題，請稍後再試或切換香港地區定位。');
        setRestaurants([]);
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [placesLib, searchKeyword, origin, maxWalkKm, minReviews, clearPolylines]);

  // Routes API: Route.computeRoutes
  useEffect(() => {
    if (!routesLib || !map || !routeTarget) return;

    let cancelled = false;
    clearPolylines();
    setRouting(true);
    setRouteError(null);
    setRouteSummary(null);

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination: { lat: routeTarget.lat, lng: routeTarget.lng },
      travelMode: travelMode as google.maps.TravelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
      language: 'zh-HK',
    };

    routesLib.Route.computeRoutes(request)
      .then((res) => {
        if (cancelled) return;
        const primaryRoute = res?.routes?.[0];
        if (!primaryRoute) {
          setRouteError('暫時搵唔到合適路線，請改用下方 Google Maps App 連結瀏覽。');
          return;
        }

        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: travelMode === 'WALKING' ? '#E85D3F' : '#0284C7',
            strokeWeight: 6,
            strokeOpacity: 0.92,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const steps = (primaryRoute.legs?.[0]?.steps || [])
          .map((s) => ({
            instruction: s.instructions || '沿路前進',
            distanceText: s.localizedValues?.distance || formatDistanceHK(s.distanceMeters || 0),
            durationText:
              s.localizedValues?.staticDuration ||
              (s.staticDurationMillis ? formatDurationHK(s.staticDurationMillis) : ''),
          }))
          .filter((s) => s.instruction);

        setRouteSummary({
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
          steps,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setRouteError('計算路線失敗，請稍後再試或改用 Google Maps App 開啟。');
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });

    return () => {
      cancelled = true;
      clearPolylines();
    };
  }, [routesLib, map, origin, routeTarget, travelMode, clearPolylines]);

  const selectedRestaurant = restaurants.find((r) => r.id === selectedId) || null;

  const handleSelectRestaurant = (r: RestaurantResult) => {
    setSelectedId(r.id);
    if (map) {
      map.panTo({ lat: r.lat, lng: r.lng });
    }
  };

  const handleShowRoute = (r: RestaurantResult) => {
    setSelectedId(r.id);
    setRouteTarget(r);
    setShowSteps(false);
  };

  const externalRouteUrl = routeTarget
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${routeTarget.lat},${routeTarget.lng}&travelmode=${travelMode === 'WALKING' ? 'walking' : 'driving'}`
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left: Interactive Map + Active Route Summary */}
      <div className="lg:col-span-7 space-y-3">
        <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] rounded-3xl overflow-hidden border border-[#E7E2DA] shadow-xs bg-[#FAF8F5]">
          <GoogleMap
            defaultCenter={origin}
            defaultZoom={15}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            disableDefaultUI={false}
            streetViewControl={false}
            mapTypeControl={false}
            className="w-full h-full"
          >
            {/* User Origin Marker */}
            <AdvancedMarker position={origin} title={originLabel}>
              <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 rounded-md bg-[#1C1917] text-white text-[10px] font-bold mb-1 shadow">
                  {originLabel}
                </div>
                <div className="w-4 h-4 rounded-full bg-[#2563EB] border-2 border-white shadow-md" />
              </div>
            </AdvancedMarker>

            {/* Restaurant Markers */}
            {restaurants.map((r, index) => {
              const isSelected = r.id === selectedId;
              const isRouteEnd = r.id === routeTarget?.id;
              return (
                <AdvancedMarker
                  key={r.id}
                  ref={(el) => {
                    markerRefs.current[r.id] = el;
                  }}
                  position={{ lat: r.lat, lng: r.lng }}
                  title={r.name}
                  onClick={() => handleSelectRestaurant(r)}
                >
                  <div
                    className={`px-2.5 py-1 rounded-xl font-bold text-xs shadow-md border-2 transition-transform ${
                      isRouteEnd
                        ? 'bg-[#16A34A] border-white text-white scale-110'
                        : isSelected
                          ? 'bg-[#E85D3F] border-white text-white scale-110'
                          : 'bg-white border-[#1C1917] text-[#1C1917]'
                    }`}
                  >
                    <span>#{index + 1} · {r.rating.toFixed(1)}★</span>
                  </div>
                </AdvancedMarker>
              );
            })}

            {selectedRestaurant && markerRefs.current[selectedRestaurant.id] && (
              <InfoWindow
                anchor={markerRefs.current[selectedRestaurant.id]}
                onCloseClick={() => setSelectedId(null)}
              >
                <div className="p-1 max-w-[230px] space-y-1.5 text-[#1C1917]">
                  <div className="font-bold text-sm">{selectedRestaurant.name}</div>
                  <div className="text-xs text-[#6B6560]">
                    評分 {selectedRestaurant.rating.toFixed(1)} ★（{selectedRestaurant.userRatingCount} 則評論）
                  </div>
                  <div className="text-[11px] text-[#6B6560]">{selectedRestaurant.address}</div>
                  <button
                    type="button"
                    onClick={() => handleShowRoute(selectedRestaurant)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#E85D3F] text-white text-xs font-bold cursor-pointer"
                  >
                    顯示路線
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {searching && (
            <div className="absolute top-3 left-3 z-10 px-3.5 py-2 rounded-xl bg-white/95 border border-[#E7E2DA] shadow-sm text-xs font-semibold text-[#1C1917] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#E85D3F]" />
              <span>正搜尋附近 4.0★+ 餐廳...</span>
            </div>
          )}
        </div>

        {/* Active Route Planner Card */}
        {routeTarget && (
          <div className="bg-white border border-[#E7E2DA] rounded-3xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#16A34A]">路線規劃目的地</div>
                <h3 className="font-bold text-base sm:text-lg text-[#1C1917]">
                  {routeTarget.name}
                </h3>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <button
                  type="button"
                  onClick={() => onTravelModeChange('WALKING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    travelMode === 'WALKING'
                      ? 'bg-[#E85D3F] text-white'
                      : 'text-[#6B6560] hover:text-[#1C1917]'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>步行</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTravelModeChange('DRIVING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                    travelMode === 'DRIVING'
                      ? 'bg-[#0284C7] text-white'
                      : 'text-[#6B6560] hover:text-[#1C1917]'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>駕車 / 的士</span>
                </button>
              </div>
            </div>

            {routing && (
              <div className="flex items-center gap-2 text-xs text-[#6B6560]">
                <Loader2 className="w-4 h-4 animate-spin text-[#E85D3F]" />
                <span>計算緊最佳路線同預計時間...</span>
              </div>
            )}

            {routeError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {routeError}
              </div>
            )}

            {routeSummary && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA]">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-[#E85D3F]" />
                    <div>
                      <div className="text-xs text-[#6B6560]">
                        {travelMode === 'WALKING' ? '預計步行時間' : '預計行車時間'}
                      </div>
                      <div className="font-mono-tabular text-base font-bold text-[#1C1917]">
                        {travelMode === 'WALKING' ? '步行' : '駕車'}
                        {formatDurationHK(routeSummary.durationMillis)} ·{' '}
                        {formatDistanceHK(routeSummary.distanceMeters)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {routeSummary.steps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSteps((prev) => !prev)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-[#E7E2DA] text-xs font-semibold text-[#1C1917] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>詳細步驟 ({routeSummary.steps.length})</span>
                        {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <a
                      href={externalRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1C1917] text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <span>Google Maps App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {showSteps && routeSummary.steps.length > 0 && (
                  <ol className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 text-xs text-[#1C1917]">
                    {routeSummary.steps.map((step, i) => (
                      <li
                        key={`${i}_${step.instruction.slice(0, 12)}`}
                        className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] flex items-start justify-between gap-3"
                      >
                        <span>
                          <strong className="font-mono-tabular mr-1.5">{i + 1}.</strong>
                          {step.instruction}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-[#6B6560] shrink-0">
                          {step.distanceText}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Filtered Restaurant List */}
      <div className="lg:col-span-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1C1917]">
            嚴選高評分餐廳（{restaurants.length} 間）
          </h3>
          <span className="text-xs text-[#6B6560]">
            4.0★+ · {minReviews}+ 評論
          </span>
        </div>

        {searchError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">
            {searchError}
          </div>
        )}

        {!searching && !searchError && restaurants.length === 0 && (
          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-3 text-center">
            <p className="text-sm font-semibold text-[#1C1917]">
              附近 {maxWalkKm} 公里內暫時搵唔到符合「4.0★ + ≥{minReviews} 評論」嘅「{searchKeyword}」餐廳。
            </p>
            <p className="text-xs text-[#6B6560]">
              你可以試下輸入更簡短嘅菜式名稱（例如「日本菜」、「越南河粉」），或者放寬評論數門檻。
            </p>
            {minReviews > 10 && (
              <button
                type="button"
                onClick={onRelaxMinReviews}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white border border-[#E7E2DA] hover:border-[#E85D3F] text-xs font-semibold text-[#1C1917] cursor-pointer"
              >
                放寬評論數門檻（改為 10+ 則評論）
              </button>
            )}
          </div>
        )}

        <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {restaurants.map((r, index) => {
            const isSelected = r.id === selectedId;
            const isActiveRoute = r.id === routeTarget?.id;
            return (
              <div
                key={r.id}
                onClick={() => handleSelectRestaurant(r)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  isActiveRoute
                    ? 'bg-[#F0FDF4] border-[#16A34A]'
                    : isSelected
                      ? 'bg-[#FFF5F2] border-[#E85D3F]'
                      : 'bg-white border-[#E7E2DA] hover:border-[#E85D3F]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#1C1917] text-white font-mono-tabular text-[11px] font-bold">
                        #{index + 1}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-[#1C1917] truncate">
                        {r.name}
                      </h4>
                    </div>
                    <p className="text-xs text-[#6B6560] mt-1 line-clamp-2">{r.address}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FEF3C7] text-[#92400E] font-mono-tabular text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      <span>{r.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-[11px] text-[#6B6560] mt-0.5 font-mono-tabular">
                      {r.userRatingCount} 評論
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        r.isOpenText === '營業中'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#FAF8F5] text-[#6B6560]'
                      }`}
                    >
                      {r.isOpenText}
                    </span>
                    {r.priceLevelLabel && (
                      <span className="font-mono-tabular font-semibold text-[#6B6560]">
                        價位 {r.priceLevelLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={r.googleMapsURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-[#E7E2DA] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#1C1917] inline-flex items-center gap-1"
                    >
                      <span>瀏覽</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowRoute(r);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>顯示路線</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RestaurantMapPanel({
  mapsApiKey,
  mapsConfigLoaded,
  searchKeyword,
  maxWalkKm,
  onChangeSearchKeyword,
}: RestaurantMapPanelProps) {
  const [draftQuery, setDraftQuery] = useState(searchKeyword || '壽司');
  const [origin, setOrigin] = useState<{ lat: number; lng: number }>({
    lat: HK_DISTRICTS[0].lat,
    lng: HK_DISTRICTS[0].lng,
  });
  const [originLabel, setOriginLabel] = useState('銅鑼灣（預設）');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'WALKING' | 'DRIVING'>('WALKING');
  const [minReviews, setMinReviews] = useState(50);

  useEffect(() => {
    if (searchKeyword) {
      setDraftQuery(searchKeyword);
      setMinReviews(50);
    }
  }, [searchKeyword]);

  const handleRequestGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('你嘅瀏覽器唔支援 GPS 定位，請揀選下方香港地區。');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setOriginLabel('你目前嘅位置');
        setGpsLoading(false);
      },
      () => {
        setGpsError('未能取得你嘅 GPS 位置（可能未授權定位權限），已保留目前區域定位。');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftQuery.trim()) return;
    setMinReviews(50);
    onChangeSearchKeyword(draftQuery.trim());
  };

  const activeKeyword = searchKeyword || '壽司';

  return (
    <div className="space-y-5">
      {/* Top Search & Location Bar */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#E85D3F]">第三階段 · 附近高評分餐廳與路線規劃</span>
            <h2 className="font-display text-2xl font-bold text-[#1C1917]">
              搜尋「{activeKeyword}」4.0★ 以上餐廳
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRequestGps}
            disabled={gpsLoading}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {gpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 text-[#E85D3F]" />
            )}
            <span>用我而家嘅 GPS 位置</span>
          </button>
        </div>

        <form onSubmit={handleQuerySubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B6560] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="搜尋菜式或餐廳類型（例如：越南河粉、打邊爐、松屋漢堡扒）"
              className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#E85D3F] text-sm"
            />
          </div>
          <button
            type="submit"
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#D44A2C] text-white text-sm font-bold cursor-pointer shrink-0"
          >
            重新搜尋餐廳
          </button>
        </form>

        {/* HK District Quick Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[#6B6560] mr-1">快捷切換香港地區：</span>
          {HK_DISTRICTS.map((d) => {
            const isSelected = originLabel === d.name || originLabel === `${d.name}（預設）`;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setOrigin({ lat: d.lat, lng: d.lng });
                  setOriginLabel(d.name);
                  setGpsError(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#E85D3F] border-[#E85D3F] text-white'
                    : 'bg-[#FAF8F5] border-[#E7E2DA] text-[#1C1917] hover:border-[#E85D3F]/60'
                }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>

        {gpsError && <p className="text-xs text-[#B45309]">{gpsError}</p>}
      </section>

      {/* Interactive Google Map Section */}
      <section className="bg-white border border-[#E7E2DA] rounded-3xl p-4 sm:p-6 shadow-xs">
        {!mapsConfigLoaded ? (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-sm text-[#6B6560]">
            <Loader2 className="w-6 h-6 animate-spin text-[#E85D3F]" />
            <span>載入地圖設定中...</span>
          </div>
        ) : !mapsApiKey ? (
          <div className="p-8 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] text-center space-y-3">
            <MapPin className="w-8 h-8 text-[#E85D3F] mx-auto" />
            <h3 className="font-bold text-lg text-[#1C1917]">暫時未能載入 Google 地圖金鑰</h3>
            <p className="text-sm text-[#6B6560] max-w-md mx-auto">
              環境尚未注入 Google Maps Platform API 金鑰，你亦可以直接打開 Google Maps 瀏覽附近高評分「{activeKeyword}」餐廳。
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeKeyword} 餐廳 ${originLabel}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E85D3F] text-white text-sm font-bold"
            >
              <span>喺 Google Maps 搜尋附近餐廳</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <APIProvider
            apiKey={mapsApiKey}
            language="zh-HK"
            region="HK"
          >
            <MapWorkspace
              origin={origin}
              originLabel={originLabel}
              searchKeyword={activeKeyword}
              maxWalkKm={maxWalkKm}
              minReviews={minReviews}
              travelMode={travelMode}
              onTravelModeChange={setTravelMode}
              onRelaxMinReviews={() => setMinReviews(10)}
            />
          </APIProvider>
        )}
      </section>
    </div>
  );
}
