/**
 * Header.tsx
 *
 * Top navigation header.
 *
 * Responsibilities:
 * - Render the top application header including sidebar toggle and company info.
 * - Display the current user's company name as the title when available (fallback: "Truck Manager").
 * - Prepend a non-bold label "Company Name:" immediately before the company name title.
 * - Show the user's display name, then the company's main hub (city) and country (friendly name + flag emoji)
 *   in the subtitle for all players.
 * - Show admin badge and capital display unchanged.
 *
 * Notes:
 * - Uses safe checks to avoid runtime errors when parts of gameState are missing.
 * - Uses Intl.DisplayNames (when available) to render a friendly country name from an ISO code.
 * - Produces a small inline flag emoji from a two-letter ISO country code when possible.
 */

import React from 'react';
import { Menu, Crown, MapPin, User as UserIcon } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

/**
 * resolveCountryName
 *
 * @description Try to resolve an ISO-3166 alpha-2 country code into a human friendly name.
 * Uses Intl.DisplayNames when available; falls back to upper-cased code.
 *
 * @param code ISO alpha-2 code (e.g. "gb", "de")
 * @returns Human-friendly country name or upper-cased code as fallback
 */
function resolveCountryName(code?: string): string {
  if (!code) return '';
  try {
    const normalized = code.toUpperCase();
    // Intl.DisplayNames exists in modern envs; guard access
    // @ts-ignore - DisplayNames typing can be missing in some TS configs
    if (typeof (Intl as any).DisplayNames === 'function') {
      // Use 'en' for a stable display language
      // @ts-ignore
      const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
      const name = dn.of(normalized);
      if (typeof name === 'string' && name.length > 0) return name;
    }
  } catch {
    // ignore and fallback below
  }
  return code.toUpperCase();
}

/**
 * countryCodeToFlagEmoji
 *
 * @description Convert a 2-letter ISO country code to the corresponding regional indicator
 * symbol pair which renders as a flag emoji in most environments. Returns empty string for invalid input.
 *
 * @param code ISO alpha-2 code
 * @returns Flag emoji or empty string
 */
function countryCodeToFlagEmoji(code?: string): string {
  if (!code || code.length !== 2) return '';
  try {
    const upper = code.toUpperCase();
    const A = 'A'.charCodeAt(0);
    const OFFSET = 0x1F1E6 - A;
    const first = upper.charCodeAt(0) + OFFSET;
    const second = upper.charCodeAt(1) + OFFSET;
    return String.fromCodePoint(first, second);
  } catch {
    return '';
  }
}

/**
 * Header
 *
 * @description Top navigation header. The primary title displays the user's
 * company name when available (gameState.company?.name). Falls back to the static
 * application title "Truck Manager".
 *
 * The subtitle shows the current username (with icon), hub name (with icon)
 * and country (friendly name + flag emoji). Adds "Company Main Hub:" non-bold label
 * before the hub location text to match the Company Name label style.
 */
const Header: React.FC = () => {
  const { gameState, toggleSidebar } = useGame();

  /**
   * isAdmin
   *
   * @description Determine whether the current company represents an admin user.
   * Uses lightweight checks to avoid throwing when company is undefined.
   */
  const isAdmin = React.useMemo(() => {
    return (
      !!gameState.company &&
      (gameState.company.name === 'Admin' || gameState.company.email === 'bracko87@live.com')
    );
  }, [gameState.company]);

  /**
   * titleText
   *
   * @description Compute the header title string. Prefer the company name when present
   * to provide a personalized title; fall back to the static "Truck Manager".
   */
  const titleText = gameState.company?.name || 'Truck Manager';

  /**
   * resolveUserName
   *
   * @description Robustly resolve a username from multiple possible locations in gameState.
   * Ensures we show a sensible display name for all players if available.
   */
  const resolveUserName = React.useCallback((): string => {
    const maybe =
      (gameState.user && ((gameState.user as any).displayName || (gameState.user as any).name)) ||
      (gameState as any).username ||
      (gameState as any).playerName ||
      gameState.company?.ownerName ||
      gameState.company?.owner ||
      '';
    if (typeof maybe === 'string' && maybe.trim().length > 0) return maybe.trim();
    return '';
  }, [gameState]);

  /**
   * subtitleNode
   *
   * @description Render subtitle content as JSX: username (with icon), hub name (with icon)
   * and country (friendly name + flag emoji). Adds "Company Main Hub:" non-bold label
   * before the hub location text to match the Company Name label style.
   *
   * NOTE: The visual fallback Flag icon was removed intentionally — when a native emoji is not
   * available we only show the country name text to avoid injecting the lucide Flag icon.
   */
  const subtitleNode = React.useMemo(() => {
    const userName = resolveUserName();

    // main hub name resolution
    const hubName =
      (gameState.company?.hub && ((gameState.company.hub as any).name || (gameState.company.hub as any).location)) ||
      gameState.company?.mainHub?.name ||
      '';

    // country code resolution (many modules store it on hub.country or company.country)
    const countryCode =
      (gameState.company?.hub && (gameState.company.hub as any).country) ||
      (gameState.company?.country as string) ||
      '';

    const countryName = resolveCountryName(countryCode);
    const flagEmoji = countryCodeToFlagEmoji(countryCode);

    // Build subtitle as JSX with icons; keep same text color and size
    return (
      <div className="flex items-center space-x-3">
        {/* Username with small user icon (show when available) */}
        {userName ? (
          <div className="flex items-center space-x-1 text-slate-400 text-sm">
            <UserIcon className="w-4 h-4 text-slate-400" aria-hidden />
            <span className="truncate" title={userName}>{userName}</span>
          </div>
        ) : null}

        {/* Hub + Country: render hub and country together without decorative bullet */}
        {hubName ? (
          <div className="flex items-center space-x-2 text-slate-400 text-sm">
            <div className="flex items-center space-x-1">
              {/* New non-bold label before hub (matches Company Name label visual style) */}
              <span className="text-sm text-slate-400 mr-1">Company Main Hub:</span>
              {/* MapPin moved so it appears directly in front of the hub city/name */}
              <MapPin className="w-4 h-4 text-indigo-400" aria-hidden />
              <span className="truncate" title={hubName + (countryName ? `, ${countryName}` : '')}>
                {hubName}
                {countryName ? `, ${countryName}` : ''}
              </span>
              {/* Show a small native flag emoji when available (decorative).
                  If no emoji is available we intentionally do not render the lucide Flag icon;
                  we prefer pure text to avoid platform inconsistencies. */}
              {flagEmoji ? (
                <span className="ml-1" aria-hidden title={countryName}>
                  {flagEmoji}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          // If hub is missing but country exists show country (no fallback icon)
          countryName ? (
            <div className="flex items-center space-x-2 text-slate-400 text-sm">
              <div className="flex items-center space-x-1">
                <span className="truncate">{countryName}</span>
                {flagEmoji ? (
                  <span className="ml-1" aria-hidden title={countryName}>
                    {flagEmoji}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null
        )}
      </div>
    );
  }, [gameState, resolveUserName]);

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left side - Menu and Title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-slate-400" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent">
              {/* decorative logo placeholder */}
              <span className="sr-only">Logo placeholder</span>
            </div>

            <div>
              {/* New: non-bold label before company name as requested */}
              <div className="flex items-baseline space-x-2">
                <span className="text-sm text-slate-400">Company Name:</span>
                <h1 className="text-xl font-bold text-white m-0">{titleText}</h1>
              </div>

              {/* subtitle rendered as JSX node with small icons */}
              <div className="text-slate-400 text-sm">{subtitleNode}</div>
            </div>
          </div>
        </div>

        {/* Right side - User info and admin status */}
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">Admin</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-white font-medium">Company Balance</div>
              <div className="text-slate-400 text-sm">
                Capital: ${(gameState.company?.capital || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;