/**
 * ==============================================================================
 * SIH26103: Universal Search Control (Projects, Locations & Coordinates)
 * ==============================================================================
 * Provides integrated search across:
 * 1. Infrastructure Projects (by ID, Code, Name, Sector, State, District)
 * 2. Geographic Locations (Curated local gazetteer + OpenStreetMap Nominatim)
 * 3. Exact Geographic Coordinates (decimal degrees or DMS)
 * ==============================================================================
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, AlertCircle, MapPin, Crosshair, Loader2, Building2 } from 'lucide-react';
import type { InfrastructureProject } from '../../types/project';
import { searchLocations, type GeocodedLocation } from '../../services/geocodingService';
import { Badge } from '../common/Badge';

/**
 * Validates and extracts coordinates from text input like:
 * "13.1007, 77.5963", "18.9405, 72.8352", "13.1007°N, 77.5963°E"
 */
export function parseCoordinates(
  input: string
): { latitude: number; longitude: number; label: string } | null {
  const trimmed = input.trim();
  const regex = /^([+-]?\d+(?:\.\d+)?)\s*(?:°)?\s*([NSns])?\s*[, ]\s*([+-]?\d+(?:\.\d+)?)\s*(?:°)?\s*([EWew])?$/;
  const match = trimmed.match(regex);
  if (!match) return null;

  let lat = parseFloat(match[1]);
  const latDir = match[2]?.toUpperCase();
  let lon = parseFloat(match[3]);
  const lonDir = match[4]?.toUpperCase();

  if (latDir === 'S') lat = -Math.abs(lat);
  if (latDir === 'N') lat = Math.abs(lat);
  if (lonDir === 'W') lon = -Math.abs(lon);
  if (lonDir === 'E') lon = Math.abs(lon);

  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;

  const latLabel = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonLabel = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;

  return {
    latitude: lat,
    longitude: lon,
    label: `${latLabel}, ${lonLabel}`
  };
}

export interface ProjectSearchResult {
  type: 'PROJECT';
  id: string;
  project: InfrastructureProject;
}

export interface LocationSearchResult {
  type: 'LOCATION';
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  boundingBox?: [number, number, number, number];
}

export interface CoordinateSearchResult {
  type: 'COORDINATES';
  id: string;
  latitude: number;
  longitude: number;
  label: string;
}

export type UniversalSearchResult =
  | ProjectSearchResult
  | LocationSearchResult
  | CoordinateSearchResult;

export interface UniversalLocationTarget {
  name: string;
  displayName?: string;
  latitude: number;
  longitude: number;
  boundingBox?: [number, number, number, number];
}

export interface UniversalSearchControlProps {
  projects?: InfrastructureProject[];
  onSelectProject?: (project: InfrastructureProject) => void;
  onSelectLocation?: (location: UniversalLocationTarget) => void;
  onSelectCoordinates?: (coords: { latitude: number; longitude: number; label: string }) => void;
  selectedEntityId?: string | null;
  activeLocationTarget?: UniversalLocationTarget | null;
  onClearTracking?: () => void;
}

export const FlightSearchControl: React.FC<UniversalSearchControlProps> = ({
  projects = [],
  onSelectProject,
  onSelectLocation,
  onSelectCoordinates,
  activeLocationTarget,
  onClearTracking
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{ title: string; subtitle: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setErrorBanner(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectProjectItem = useCallback((p: InfrastructureProject) => {
    setIsDropdownOpen(false);
    setErrorBanner(null);
    setResults([]);
    setSelectedIndex(-1);
    setQuery(p.name);
    onSelectProject?.(p);
  }, [onSelectProject]);

  const handleSelectLocationItem = useCallback((loc: LocationSearchResult) => {
    setIsDropdownOpen(false);
    setErrorBanner(null);
    setResults([]);
    setSelectedIndex(-1);
    setQuery(loc.name);
    onSelectLocation?.({
      name: loc.name,
      displayName: loc.displayName,
      latitude: loc.latitude,
      longitude: loc.longitude,
      boundingBox: loc.boundingBox
    });
  }, [onSelectLocation]);

  const handleSelectCoordinateItem = useCallback((coords: CoordinateSearchResult) => {
    setIsDropdownOpen(false);
    setErrorBanner(null);
    setResults([]);
    setSelectedIndex(-1);
    setQuery(coords.label);
    onSelectCoordinates?.({
      latitude: coords.latitude,
      longitude: coords.longitude,
      label: coords.label
    });
  }, [onSelectCoordinates]);

  // Search matching projects from loaded dataset
  const searchProjects = useCallback((searchStr: string): ProjectSearchResult[] => {
    const q = searchStr.toLowerCase().trim();
    if (!q) return [];

    return projects
      .filter(p => {
        const idMatch = p.id.toLowerCase().includes(q);
        const codeMatch = p.code.toLowerCase().includes(q);
        const ocmsMatch = p.legacyOcmsCode?.toLowerCase().includes(q);
        const nameMatch = p.name.toLowerCase().includes(q);
        const ministryMatch = p.ministry?.toLowerCase().includes(q);
        const sectorMatch = p.sector.toLowerCase().includes(q);
        const stateMatch = p.state.toLowerCase().includes(q);
        const districtMatch = p.district?.toLowerCase().includes(q);
        const agencyMatch = p.implementingAgency.toLowerCase().includes(q);
        return idMatch || codeMatch || ocmsMatch || nameMatch || ministryMatch || sectorMatch || stateMatch || districtMatch || agencyMatch;
      })
      .slice(0, 30)
      .map(p => ({
        type: 'PROJECT' as const,
        id: `prj-${p.id}`,
        project: p
      }));
  }, [projects]);

  // Execute Search on user submit (Enter key or button)
  const executeSearch = useCallback(async (searchStr: string) => {
    const trimmed = searchStr.trim();
    if (!trimmed) {
      setResults([]);
      setIsDropdownOpen(false);
      setErrorBanner(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 1. Check Projects match first
    const matchedProjects = searchProjects(trimmed);
    if (matchedProjects.length === 1) {
      handleSelectProjectItem(matchedProjects[0].project);
      return;
    }

    // 2. Check Coordinate Query
    const parsedCoords = parseCoordinates(trimmed);
    if (parsedCoords) {
      handleSelectCoordinateItem({
        type: 'COORDINATES',
        id: `coord-${parsedCoords.latitude}-${parsedCoords.longitude}`,
        latitude: parsedCoords.latitude,
        longitude: parsedCoords.longitude,
        label: parsedCoords.label
      });
      return;
    }

    // 3. Forward Geocoding Query (Locations)
    setIsResolving(true);
    setErrorBanner(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const locations: GeocodedLocation[] = await searchLocations(trimmed, controller.signal);
      const locResults: LocationSearchResult[] = (locations || []).map(l => ({
        type: 'LOCATION',
        id: l.id,
        name: l.name,
        displayName: l.displayName,
        latitude: l.latitude,
        longitude: l.longitude,
        boundingBox: l.boundingBox
      }));

      const combined: UniversalSearchResult[] = [...matchedProjects, ...locResults];

      if (combined.length > 0) {
        setResults(combined);
        setSelectedIndex(0);
        setIsDropdownOpen(true);
      } else {
        setErrorBanner({
          title: `No match found for '${trimmed}'`,
          subtitle: 'Search by project name, project ID (e.g. PRJ-NH-042), city, or coordinates.'
        });
        setResults([]);
        setIsDropdownOpen(true);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        if (matchedProjects.length > 0) {
          setResults(matchedProjects);
          setSelectedIndex(0);
          setIsDropdownOpen(true);
        } else {
          setErrorBanner({
            title: 'Search error',
            subtitle: err.message || 'Unable to resolve search query.'
          });
          setResults([]);
          setIsDropdownOpen(true);
        }
      }
    } finally {
      setIsResolving(false);
    }
  }, [handleSelectCoordinateItem, handleSelectProjectItem, searchProjects]);

  // Debounced auto-suggestions
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      setErrorBanner(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // 1. Projects matches
      const matchedProjects = searchProjects(trimmed);

      // 2. Coordinate check
      const parsedCoords = parseCoordinates(trimmed);
      const coordItem: CoordinateSearchResult | null = parsedCoords
        ? {
            type: 'COORDINATES',
            id: `coord-${parsedCoords.latitude}-${parsedCoords.longitude}`,
            latitude: parsedCoords.latitude,
            longitude: parsedCoords.longitude,
            label: parsedCoords.label
          }
        : null;

      // 3. Location matches
      let matchedLocations: LocationSearchResult[] = [];
      try {
        const locs = await searchLocations(trimmed);
        matchedLocations = (locs || []).slice(0, 4).map(l => ({
          type: 'LOCATION',
          id: l.id,
          name: l.name,
          displayName: l.displayName,
          latitude: l.latitude,
          longitude: l.longitude,
          boundingBox: l.boundingBox
        }));
      } catch {}

      const combined: UniversalSearchResult[] = [
        ...matchedProjects,
        ...(coordItem ? [coordItem] : []),
        ...matchedLocations
      ];

      if (combined.length > 0) {
        setResults(combined);
        setSelectedIndex(0);
        setIsDropdownOpen(true);
        setErrorBanner(null);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, searchProjects]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        setIsDropdownOpen(true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        setIsDropdownOpen(true);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const item = results[selectedIndex];
        if (item.type === 'PROJECT') handleSelectProjectItem(item.project);
        else if (item.type === 'LOCATION') handleSelectLocationItem(item);
        else if (item.type === 'COORDINATES') handleSelectCoordinateItem(item);
      } else {
        executeSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setErrorBanner(null);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsDropdownOpen(false);
    setErrorBanner(null);
    onClearTracking?.();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative z-40 w-full sm:w-80 md:w-96 text-xs font-mono">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 || errorBanner) setIsDropdownOpen(true);
          }}
          placeholder="Search project, sector, city, or coordinates..."
          className="w-full bg-[#070A0F] text-slate-200 placeholder-slate-500 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:outline-none transition-all shadow-inner font-mono"
        />

        <div className="absolute left-2.5 flex items-center pointer-events-none text-slate-400">
          {isResolving ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </div>

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-slate-800"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Active Location Focus Indicator */}
      {activeLocationTarget && !query && (
        <div className="mt-1 flex items-center justify-between px-2 py-0.5 bg-emerald-950/70 border border-emerald-800/80 rounded text-[10px] text-emerald-300">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-bold truncate">LOCATION: {activeLocationTarget.name}</span>
          </div>
          <button
            onClick={onClearTracking}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer text-[11px] px-1"
            title="Clear location focus"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dropdown Search Results */}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-[#090C12]/98 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden z-50 max-h-80 overflow-y-auto">
          {errorBanner && (
            <div className="p-2.5 bg-rose-950/80 border-b border-rose-900/60 text-[10.5px]">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorBanner.title}</span>
              </div>
              <div className="text-slate-300 mt-0.5 pl-5 text-[9.5px]">
                {errorBanner.subtitle}
              </div>
            </div>
          )}

          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  if (item.type === 'PROJECT') handleSelectProjectItem(item.project);
                  else if (item.type === 'LOCATION') handleSelectLocationItem(item);
                  else if (item.type === 'COORDINATES') handleSelectCoordinateItem(item);
                }}
                className={`p-2 border-b border-slate-800/80 last:border-b-0 cursor-pointer transition-colors ${
                  isSelected ? 'bg-cyan-950/70 text-slate-100' : 'hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                {item.type === 'PROJECT' && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-xs text-slate-100 truncate">{item.project.name}</span>
                        <span className="text-[9px] font-mono text-cyan-400 shrink-0">({item.project.code})</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[9.5px] text-slate-400">
                        <Badge variant="sector" size="sm" sector={item.project.sector}>
                          {item.project.sector}
                        </Badge>
                        <span className="text-slate-300 font-bold">{item.project.state}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400 font-bold">{item.project.physicalProgress}% PROG</span>
                        {item.project.hasCoordinates ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                            📍 3D GLOBE
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            STATE LEVEL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {item.type === 'LOCATION' && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-100 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.displayName}</div>
                      <div className="text-[9px] text-cyan-400/80 font-mono">
                        {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                      </div>
                    </div>
                  </div>
                )}

                {item.type === 'COORDINATES' && (
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-amber-300">Fly to Coordinates</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.label}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
