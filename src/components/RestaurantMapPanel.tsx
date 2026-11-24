/// <reference types="google.maps" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
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
  TrainFront,
} from 'lucide-react';
import { HK_DISTRICTS, HK_REGIONS, HKRegionId } from '../data/hkFoods';

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

interface RouteStepView {
  kind: 'transit' | 'walk';
  badge?: string;
  instruction: string;
  distanceText: string;
  durationText: string;
}

interface RouteSummary {
  effectiveMode: 'TRANSIT' | 'WALKING';
  fallbackNote?: string;
  distanceMeters: number;
  durationMillis: number;
  steps: RouteStepView[];
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
  travelMode: 'TRANSIT' | 'WALKING';
  onTravelModeChange: (mode: 'TRANSIT' | 'WALKING') => void;
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

  const markerRefs = useRef<Record<string, google.maps.marker.AdvancedMarkerElement | null>>({});
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }, []);

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
            radius: Math.max(1000, Math.min(3500, maxWalkKm * 1000)),
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
        setSearchError('搜尋附近餐廳時發生問題，請稍後再試或切換香港十八區定位。');
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

  // Routes API: Route.computeRoutes (preferring TRANSIT Walking + MTR/Rail, fallback to WALKING when nearby)
  useEffect(() => {
    if (!routesLib || !map || !routeTarget) return;

    let cancelled = false;
    clearPolylines();
    setRouting(true);
    setRouteError(null);
    setRouteSummary(null);

    const buildRequest = (mode: 'TRANSIT' | 'WALKING'): google.maps.routes.ComputeRoutesRequest => ({
      origin,
      destination: { lat: routeTarget.lat, lng: routeTarget.lng },
      travelMode: mode as google.maps.TravelMode,
      ...(mode === 'TRANSIT'
        ? {
            transitPreference: {
              allowedTransitModes: ['SUBWAY', 'TRAIN', 'LIGHT_RAIL', 'RAIL'],
              routingPreference: 'LESS_WALKING',
            },
          }
        : {}),
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
      language: 'zh-HK',
    });

    const extractSteps = (route: google.maps.routes.Route): RouteStepView[] => {
      const rawSteps = route.legs?.[0]?.steps || [];
      return rawSteps
        .map((s): RouteStepView | null => {
          const td = s.transitDetails;
          if (td && td.transitLine) {
            const lineLabel = td.transitLine.shortName || td.transitLine.name || '港鐵／鐵路';
            const dep = td.departureStop?.name || '';
            const arr = td.arrivalStop?.name || '';
            const stops = td.stopCount ? `（${td.stopCount} 個站）` : '';
            const instruction =
              dep && arr
                ? `乘搭 ${lineLabel}${td.headsign ? `（往${td.headsign}）` : ''}：${dep} → ${arr}${stops}`
                : s.instructions || `乘搭 ${lineLabel}${stops}`;
            return {
              kind: 'transit',
              badge: lineLabel,
              instruction,
              distanceText: s.localizedValues?.distance || formatDistanceHK(s.distanceMeters || 0),
              durationText:
                s.localizedValues?.staticDuration ||
                (s.staticDurationMillis ? formatDurationHK(s.staticDurationMillis) : ''),
            };
          }

          const text = s.instructions || '步行前往';
          return {
            kind: 'walk',
            instruction: text,
            distanceText: s.localizedValues?.distance || formatDistanceHK(s.distanceMeters || 0),
            durationText:
              s.localizedValues?.staticDuration ||
              (s.staticDurationMillis ? formatDurationHK(s.staticDurationMillis) : ''),
          };
        })
        .filter((x): x is RouteStepView => Boolean(x));
    };

    const runCompute = async () => {
      try {
        let effectiveMode: 'TRANSIT' | 'WALKING' = travelMode;
        let fallbackNote: string | undefined;

        let res = await routesLib.Route.computeRoutes(buildRequest(travelMode));
        let primaryRoute = res?.routes?.[0];

        // If TRANSIT returns no rail/transit route (e.g., very close walking distance), retry with WALKING automatically
        if (!primaryRoute && travelMode === 'TRANSIT') {
          res = await routesLib.Route.computeRoutes(buildRequest('WALKING'));
          primaryRoute = res?.routes?.[0];
          if (primaryRoute) {
            effectiveMode = 'WALKING';
            fallbackNote = '距離好近，步行即可直達（已顯示純步行路線）';
          }
        }

        if (cancelled) return;

        if (!primaryRoute) {
          setRouteError('暫時搵唔到合適路線，請改用下方 Google Maps App 連結瀏覽。');
          return;
        }

        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: effectiveMode === 'TRANSIT' ? '#0071E3' : '#16A34A',
            strokeWeight: 6,
            strokeOpacity: 0.92,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        setRouteSummary({
          effectiveMode,
          fallbackNote,
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
          steps: extractSteps(primaryRoute),
        });
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        // Fallback attempt to WALKING if TRANSIT threw an error
        if (travelMode === 'TRANSIT') {
          try {
            const walkRes = await routesLib.Route.computeRoutes(buildRequest('WALKING'));
            const walkRoute = walkRes?.routes?.[0];
            if (!cancelled && walkRoute) {
              const newPolylines = walkRoute.createPolylines();
              newPolylines.forEach((polyline) => {
                polyline.setOptions({
                  strokeColor: '#16A34A',
                  strokeWeight: 6,
                  strokeOpacity: 0.92,
                });
                polyline.setMap(map);
              });
              polylinesRef.current = newPolylines;
              if (walkRoute.viewport) map.fitBounds(walkRoute.viewport);
              setRouteSummary({
                effectiveMode: 'WALKING',
                fallbackNote: '此路段毋須轉乘鐵路，已顯示步行路線',
                distanceMeters: walkRoute.distanceMeters ?? 0,
                durationMillis: walkRoute.durationMillis ?? 0,
                steps: extractSteps(walkRoute),
              });
              return;
            }
          } catch {
            // Fall through to error display
          }
        }
        setRouteError('計算路線失敗，請稍後再試或改用 Google Maps App 開啟。');
      } finally {
        if (!cancelled) setRouting(false);
      }
    };

    void runCompute();

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
    setShowSteps(true);
  };

  const effectiveExternalMode =
    (routeSummary?.effectiveMode || travelMode) === 'TRANSIT' ? 'transit' : 'walking';

  const externalRouteUrl = routeTarget
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${routeTarget.lat},${routeTarget.lng}&travelmode=${effectiveExternalMode}`
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left: Interactive Map + Active Route Summary */}
      <div className="lg:col-span-7 space-y-3">
        <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] rounded-[22px] overflow-hidden border border-black/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)] bg-[#F5F5F7]">
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
                <div className="px-2 py-0.5 rounded-md bg-[#1D1D1F] text-white text-[10px] font-bold mb-1 shadow">
                  {originLabel}
                </div>
                <div className="w-4 h-4 rounded-full bg-[#0071E3] border-2 border-white shadow-md" />
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
                          ? 'bg-[#0071E3] border-white text-white scale-110'
                          : 'bg-white border-[#1D1D1F] text-[#1D1D1F]'
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
                <div className="p-1 max-w-[230px] space-y-1.5 text-[#1D1D1F]">
                  <div className="font-bold text-sm">{selectedRestaurant.name}</div>
                  <div className="text-xs text-[#6E6E73]">
                    評分 {selectedRestaurant.rating.toFixed(1)} ★（{selectedRestaurant.userRatingCount} 則評論）
                  </div>
                  <div className="text-[11px] text-[#6E6E73]">{selectedRestaurant.address}</div>
                  <button
                    type="button"
                    onClick={() => handleShowRoute(selectedRestaurant)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#0071E3] text-white text-xs font-bold cursor-pointer"
                  >
                    顯示路線
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {searching && (
            <div className="absolute top-3 left-3 z-10 px-3.5 py-2 rounded-xl bg-white/95 border border-black/[0.08] shadow-sm text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0071E3]" />
              <span>正搜尋附近 4.0★+ 餐廳...</span>
            </div>
          )}
        </div>

        {/* Active Route Planner Card */}
        {routeTarget && (
          <div className="bg-white border border-black/[0.08] rounded-[22px] p-4 sm:p-5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#16A34A]">路線規劃目的地</div>
                <h3 className="font-semibold text-base sm:text-lg text-[#1D1D1F]">
                  {routeTarget.name}
                </h3>
              </div>

              <div className="relative inline-flex p-1 rounded-xl bg-[#E8E8ED]/80 border border-black/[0.06] overflow-hidden">
                <button
                  type="button"
                  onClick={() => onTravelModeChange('TRANSIT')}
                  className={`apple-btn relative px-3 py-1.5 rounded-[9px] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer z-10 ${
                    travelMode === 'TRANSIT' ? 'text-[#0071E3]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {travelMode === 'TRANSIT' && (
                    <motion.span
                      layoutId="map-travel-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  <TrainFront className="w-3.5 h-3.5" />
                  <span>步行 + 鐵路</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTravelModeChange('WALKING')}
                  className={`apple-btn relative px-3 py-1.5 rounded-[9px] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer z-10 ${
                    travelMode === 'WALKING' ? 'text-[#16A34A]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {travelMode === 'WALKING' && (
                    <motion.span
                      layoutId="map-travel-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                      className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  <Footprints className="w-3.5 h-3.5" />
                  <span>純步行</span>
                </button>
              </div>
            </div>

            {routing && (
              <div className="flex items-center gap-2 text-xs text-[#6E6E73]">
                <Loader2 className="w-4 h-4 animate-spin text-[#0071E3]" />
                <span>計算緊最佳步行／鐵路路線同預計時間...</span>
              </div>
            )}

            {routeError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {routeError}
              </div>
            )}

            {routeSummary && (
              <div className="space-y-3">
                {routeSummary.fallbackNote && (
                  <p className="text-xs font-medium text-[#0071E3]">
                    {routeSummary.fallbackNote}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-[#0071E3]" />
                    <div>
                      <div className="text-xs text-[#6E6E73]">
                        {routeSummary.effectiveMode === 'TRANSIT'
                          ? '預計步行加鐵路時間'
                          : '預計步行時間'}
                      </div>
                      <div className="font-mono-tabular text-base font-bold text-[#1D1D1F]">
                        {routeSummary.effectiveMode === 'TRANSIT' ? '步行 + 鐵路 ' : '純步行 '}
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
                        className="apple-btn min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-black/[0.1] text-xs font-semibold text-[#1D1D1F] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>詳細步驟 ({routeSummary.steps.length})</span>
                        {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <a
                      href={externalRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="apple-btn min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1D1D1F] text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <span>Google Maps App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {showSteps && routeSummary.steps.length > 0 && (
                  <ol className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs text-[#1D1D1F]">
                    {routeSummary.steps.map((step, i) => (
                      <li
                        key={`${i}_${step.instruction.slice(0, 12)}`}
                        className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 ${
                          step.kind === 'transit'
                            ? 'bg-[#0071E3]/[0.06] border-[#0071E3]/25'
                            : 'bg-[#F5F5F7] border-black/[0.06]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="font-mono-tabular font-bold shrink-0">{i + 1}.</span>
                          <div className="space-y-0.5">
                            {step.kind === 'transit' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0071E3] mr-1.5">
                                <TrainFront className="w-3.5 h-3.5" />
                                <span>{step.badge || '鐵路'}</span>
                              </span>
                            )}
                            <span>{step.instruction}</span>
                          </div>
                        </div>
                        <span className="font-mono-tabular text-[11px] text-[#6E6E73] shrink-0">
                          {step.durationText || step.distanceText}
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
          <h3 className="font-semibold text-base text-[#1D1D1F]">
            嚴選高評分餐廳（{restaurants.length} 間）
          </h3>
          <span className="text-xs text-[#6E6E73]">
            4.0★+ · {minReviews}+ 評論
          </span>
        </div>

        {searchError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">
            {searchError}
          </div>
        )}

        {!searching && !searchError && restaurants.length === 0 && (
          <div className="p-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] space-y-3 text-center">
            <p className="text-sm font-semibold text-[#1D1D1F]">
              附近 {maxWalkKm} 公里內暫時搵唔到符合「4.0★ + ≥{minReviews} 評論」嘅「{searchKeyword}」餐廳。
            </p>
            <p className="text-xs text-[#6E6E73]">
              你可以試下輸入更簡短嘅菜式名稱（例如「日本菜」、「越南河粉」），或者放寬評論數門檻。
            </p>
            {minReviews > 10 && (
              <button
                type="button"
                onClick={onRelaxMinReviews}
                className="apple-btn min-h-[40px] px-4 py-2 rounded-xl bg-white border border-black/[0.1] hover:border-[#0071E3] text-xs font-semibold text-[#1D1D1F] cursor-pointer"
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
                      ? 'bg-[#0071E3]/[0.04] border-[#0071E3]'
                      : 'bg-white border-black/[0.08] hover:border-[#0071E3]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#1D1D1F] text-white font-mono-tabular text-[11px] font-bold">
                        #{index + 1}
                      </span>
                      <h4 className="font-semibold text-sm sm:text-base text-[#1D1D1F] truncate">
                        {r.name}
                      </h4>
                    </div>
                    <p className="text-xs text-[#6E6E73] mt-1 line-clamp-2">{r.address}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFFBEB] text-[#92400E] font-mono-tabular text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      <span>{r.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-[11px] text-[#6E6E73] mt-0.5 font-mono-tabular">
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
                          : 'bg-[#F5F5F7] text-[#6E6E73]'
                      }`}
                    >
                      {r.isOpenText}
                    </span>
                    {r.priceLevelLabel && (
                      <span className="font-mono-tabular font-semibold text-[#6E6E73]">
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
                      className="apple-btn min-h-[36px] px-2.5 py-1.5 rounded-xl border border-black/[0.1] bg-white hover:bg-[#F5F5F7] text-xs font-semibold text-[#1D1D1F] inline-flex items-center gap-1"
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
                      className="apple-btn min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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
  const defaultDistrict = HK_DISTRICTS.find((d) => d.id === 'wan_chai') || HK_DISTRICTS[0];

  const [draftQuery, setDraftQuery] = useState(searchKeyword || '壽司');
  const [selectedRegion, setSelectedRegion] = useState<HKRegionId>(defaultDistrict.region);
  const [origin, setOrigin] = useState<{ lat: number; lng: number }>({
    lat: defaultDistrict.lat,
    lng: defaultDistrict.lng,
  });
  const [originLabel, setOriginLabel] = useState(`${defaultDistrict.name}（預設）`);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'TRANSIT' | 'WALKING'>('TRANSIT');
  const [minReviews, setMinReviews] = useState(50);

  useEffect(() => {
    if (searchKeyword) {
      setDraftQuery(searchKeyword);
      setMinReviews(50);
    }
  }, [searchKeyword]);

  const districtsInRegion = useMemo(
    () => HK_DISTRICTS.filter((d) => d.region === selectedRegion),
    [selectedRegion]
  );

  const handleRequestGps = async () => {
    setGpsError(null);
    setGpsStatusText(null);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGpsError('目前連線非 HTTPS 安全環境，瀏覽器唔容許讀取 GPS，請喺下方揀選香港十八區位置。');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('你嘅瀏覽器唔支援 GPS 定位，請喺下方直接揀選十八區。');
      return;
    }

    // Pre-check Permissions API if available
    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          setGpsError(
            '定位權限已被瀏覽器封鎖，請喺網址列左側開啟「位置」權限，或直接揀選下方香港十八區。'
          );
          return;
        }
      }
    } catch {
      // Some browsers (Safari/iOS) do not support querying geolocation permission; continue normally
    }

    setGpsLoading(true);

    const applySuccess = (pos: GeolocationPosition) => {
      setOrigin({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setOriginLabel('你目前嘅 GPS 位置');
      setGpsStatusText(
        `已成功鎖定目前位置（精準度約 ${Math.round(pos.coords.accuracy || 50)} 米）`
      );
      setGpsLoading(false);
    };

    const handleFailure = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError(
          '你已拒絕或未授權瀏覽器定位權限（請於瀏覽器設定容許位置權限），已為你保留目前分區定位。'
        );
      } else {
        setGpsError('GPS 訊號暫時較弱或超時，你可以再試一次，或直接揀選下方香港十八區位置。');
      }
      setGpsLoading(false);
    };

    // Pass 1: High accuracy (6s), Pass 2 fallback: Network/Wi-Fi accuracy (8s) for desktop/indoor reliability
    navigator.geolocation.getCurrentPosition(
      applySuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          handleFailure(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          applySuccess,
          handleFailure,
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
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
      {/* Top Search & 18 HK Districts Bar */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1D1D1F]">
              搜尋「{activeKeyword}」4.0★ 以上餐廳
            </h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              目前出發起點：<strong className="text-[#1D1D1F]">{originLabel}</strong>（預設優先顯示步行加港鐵路線）
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestGps}
            disabled={gpsLoading}
            className="apple-btn min-h-[44px] px-4 py-2 rounded-xl bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {gpsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 text-[#0A84FF]" />
            )}
            <span>{gpsLoading ? '定位中...' : '用我而家嘅 GPS 位置'}</span>
          </button>
        </div>

        <form onSubmit={handleQuerySubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="搜尋菜式或餐廳類型（例如：越南河粉、打邊爐、松屋漢堡扒）"
              className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border border-black/[0.1] bg-[#F5F5F7] focus:bg-white focus:outline-none focus:border-[#0071E3] text-sm"
            />
          </div>
          <button
            type="submit"
            className="apple-btn min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-semibold cursor-pointer shrink-0"
          >
            重新搜尋餐廳
          </button>
        </form>

        {/* All 18 HK Districts Switcher */}
        <div className="pt-2 border-t border-black/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#1D1D1F]">
              香港十八區位置切換（萬一 GPS 用唔到可直接揀區）
            </span>
            <div className="relative inline-flex p-1 rounded-xl bg-[#E8E8ED]/80 border border-black/[0.06] overflow-hidden">
              {HK_REGIONS.map((reg) => {
                const active = selectedRegion === reg.id;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setSelectedRegion(reg.id)}
                    className={`apple-btn relative px-3 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer whitespace-nowrap z-10 ${
                      active ? 'text-[#1D1D1F]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="map-region-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                        className="absolute inset-0 bg-white rounded-[9px] shadow-[0_1px_2px_rgba(0,0,0,0.08)] -z-10"
                      />
                    )}
                    <span>{reg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {districtsInRegion.map((d) => {
              const isSelected = originLabel === d.name || originLabel === `${d.name}（預設）`;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setOrigin({ lat: d.lat, lng: d.lng });
                    setOriginLabel(d.name);
                    setGpsError(null);
                    setGpsStatusText(null);
                  }}
                  className={`apple-btn min-h-[50px] px-3 py-2 rounded-xl border text-left flex flex-col justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-[0_1px_4px_rgba(0,113,227,0.28)]'
                      : 'bg-[#F5F5F7] border-black/[0.07] text-[#1D1D1F] hover:bg-[#EBEBF0]'
                  }`}
                >
                  <span className="text-xs font-bold truncate">{d.name}</span>
                  <span
                    className={`text-[10px] truncate mt-0.5 ${
                      isSelected ? 'text-white/85' : 'text-[#6E6E73]'
                    }`}
                  >
                    {d.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {gpsStatusText && (
          <p className="text-xs font-medium text-[#15803D]">{gpsStatusText}</p>
        )}
        {gpsError && <p className="text-xs font-medium text-[#B45309]">{gpsError}</p>}
      </section>

      {/* Interactive Google Map Section */}
      <section className="bg-white border border-black/[0.08] rounded-[22px] p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {!mapsConfigLoaded ? (
          <div className="h-[360px] flex flex-col items-center justify-center gap-2 text-sm text-[#6E6E73]">
            <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
            <span>載入地圖設定中...</span>
          </div>
        ) : !mapsApiKey ? (
          <div className="p-8 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] text-center space-y-3">
            <MapPin className="w-8 h-8 text-[#0071E3] mx-auto" />
            <h3 className="font-semibold text-lg text-[#1D1D1F]">暫時未能載入 Google 地圖金鑰</h3>
            <p className="text-sm text-[#6E6E73] max-w-md mx-auto">
              環境尚未注入 Google Maps Platform API 金鑰，你亦可以直接打開 Google Maps 瀏覽附近高評分「{activeKeyword}」餐廳。
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeKeyword} 餐廳 ${originLabel}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="apple-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0071E3] text-white text-sm font-semibold"
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
