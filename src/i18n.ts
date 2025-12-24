/**
 * i18n.ts
 * 
 * Configuration for multi-language support.
 * Includes automatic persistence to localStorage.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "nav": {
        "dashboard": "My Company",
        "garage": "Fleet",
        "staff": "Staff Management",
        "market": "Freight Market",
        "contract_jobs": "Contract Jobs",
        "jobs": "My Jobs",
        "infrastructure": "Infrastructure",
        "finances": "Finances",
        "map": "Map",
        "settings": "Settings",
        "admin": "Admin Dashboard",
        "logout": "Log Out",
        "sign_out_desc": "Sign out of account"
      },
      "landing": {
        "hero_title": "Trucktopia — Build your logistics empire",
        "hero_subtitle": "Manage fleets, hire professionals, and deliver cargo worldwide. Real markets, strategic upgrades and real-time operations — start growing today.",
        "cta_login": "Login to Your Company",
        "cta_register": "Start New Company",
        "stats": {
          "total_users": "Total User Accounts",
          "total_trucks": "Total Trucks (active)",
          "total_jobs": "Total Jobs (global)",
          "cities": "In-game Cities"
        },
        "headings": {
          "information": "Information",
          "info_subtitle": "Helpful resources & notes",
          "info_tabs_subtitle": "Helpful links & notes",
          "why_trucktopia": "Why Trucktopia?",
          "game_facts": "Game Facts",
          "screenshots_title": "Screenshots",
          "screenshots_desc": "Below are a few representative screenshots. Replace these with your real images later.",
          "how_to_start": "How to Get Started",
          "tips_title": "Tips for Success"
        },
        "info": {
          "tabs": {
            "overview": "Overview",
            "community": "Community",
            "support": "Support"
          },
          "overview_p1": "Trucktopia is a logistics simulation where you buy vehicles, hire staff, take contracts and expand hubs. Balance maintenance, payroll and market risk to grow a profitable operation.",
          "overview_p2": "Use the dashboard to monitor fleet health, job profitability and staff allocation. Start small and scale strategically.",
          "community_p1": "Discuss strategies, game rules, and mechanics with the community. Join challenges, track leaderboards, and stay connected with other players.",
          "community_link": "Join our Discord Channel",
          "support_p1": "Need help? Check the game manual, visit our Discord community, or explore the FAQ in settings.",
          "support_p2": "You can also contact us directly using the support form in game settings."
        },
        "features": {
          "fleet_title": "Advanced Fleet Management",
          "fleet_desc": "Buy, maintain and optimize your trucks. Hire drivers and improve profits through upgrades and maintenance.",
          "network_title": "Worldwide Transport Network",
          "network_desc": "Take freight contracts across different countries with dynamic markets and realistic delivery constraints.",
          "growth_title": "Strategic Growth & Markets",
          "growth_desc": "Earn profits, invest in equipment and expand your company strategically to dominate the market."
        },
        "facts": {
          "contracts_title": "Contract Variety",
          "contracts_val": "Multiple Contract Types",
          "contracts_desc": "Work on contracts across delivery systems: standard freight, express, refrigerated, multi-stop and oversized loads.",
          "market_title": "Dynamic Market",
          "market_val": "Supply & Demand",
          "market_desc": "Prices and job availability change with the market — plan routes and investments accordingly.",
          "time_title": "Realistic Time Simulation",
          "time_val": "Dynamic day/night & schedule",
          "time_desc": "World clock advances with configurable speed and running state."
        },
        "screenshots": {
          "market": "Vehicle Market",
          "card": "Truck card",
          "highway": "Long-haul deliveries",
          "cargo": "Cargo & loading",
          "urban": "City routes",
          "ui": "Compact staff / truck card"
        },
        "how_to": {
          "step1_title": "Create Your Company",
          "step1_desc": "Register and set up your HQ to begin operations.",
          "step2_title": "Buy Your First Truck",
          "step2_desc": "Open the vehicle market and pick a truck that fits your strategy.",
          "step3_title": "Hire Staff & Assign Routes",
          "step3_desc": "Recruit drivers and mechanics. Assign jobs, schedule maintenance and manage payroll.",
          "step4_title": "Scale & Optimize",
          "step4_desc": "Monitor profit, expand hubs, and refine your fleet to take bigger contracts.",
          "tip1": "Balance hiring with fleet size — payroll is an ongoing cost.",
          "tip2": "Maintain trucks regularly to avoid sudden breakdowns and fines.",
          "tip3": "Use short and long-haul contracts strategically to stabilize income.",
          "tip4": "Expand hubs to unlock regional job pools and higher-paying offers."
        },
        "footer": {
          "tagline": "A logistics simulation for strategic managers",
          "about": "About Trucktopia",
          "about_desc": "A logistics simulation for strategic managers. Build and run a trucking company — buy vehicles, hire staff, take contracts and grow your logistics empire.",
          "copyright": "© 2025 Trucktopia Simulator"
        }
      },
      "footer": {
        "version": "Version",
        "encrypted": "Encrypted Session",
        "language": "Language"
      }
    }
  },
  sr: {
    translation: {
      "nav": {
        "dashboard": "Moja Kompanija",
        "garage": "Flota",
        "staff": "Upravljanje Osobljem",
        "market": "Tržište Tereta",
        "contract_jobs": "Ugovoreni Poslovi",
        "jobs": "Moji Poslovi",
        "infrastructure": "Infrastruktura",
        "finances": "Finansije",
        "map": "Mapa",
        "settings": "Podešavanja",
        "admin": "Admin Panel",
        "logout": "Odjavi se",
        "sign_out_desc": "Odjavite se sa naloga"
      },
      "landing": {
        "hero_title": "Trucktopia — Izgradite svoju logističku imperiju",
        "hero_subtitle": "Upravljajte flotama, zapošljavajte profesionalce i isporučujte teret širom sveta. Realna tržišta, strateške nadogradnje i operacije u realnom vremenu — počnite danas.",
        "cta_login": "Prijavite se u kompaniju",
        "cta_register": "Započnite Novu Kompaniju",
        "stats": {
          "total_users": "Ukupno Korisnika",
          "total_trucks": "Aktivni Kamioni",
          "total_jobs": "Dostupni Poslovi",
          "cities": "Gradovi u igri"
        },
        "headings": {
          "information": "Informacije",
          "info_subtitle": "Korisni resursi i napomene",
          "info_tabs_subtitle": "Korisni linkovi i napomene",
          "why_trucktopia": "Zašto Trucktopia?",
          "game_facts": "Činjenice o Igri",
          "screenshots_title": "Slike iz igre",
          "screenshots_desc": "Ispod su neke od slika iz igre. Zamenite ih svojim pravim slikama kasnije.",
          "how_to_start": "Kako Započeti",
          "tips_title": "Saveti za Uspeh"
        },
        "info": {
          "tabs": {
            "overview": "Pregled",
            "community": "Zajednica",
            "support": "Podrška"
          },
          "overview_p1": "Trucktopia je logistička simulacija u kojoj kupujete vozila, zapošljavate osoblje, preuzimate ugovore i širite čvorišta. Balansirajte održavanje, plate i tržišni rizik kako biste razvili profitabilnu operaciju.",
          "overview_p2": "Koristite kontrolnu tablu za praćenje zdravlja flote, profitabilnosti poslova i raspodele osoblja. Počnite polako i skalirajte strateški.",
          "community_p1": "Razgovarajte o strategijama, pravilima igre i mehanici sa zajednicom. Pridružite se izazovima, pratite rang liste i ostanite povezani sa drugim igračima.",
          "community_link": "Pridružite se našem Discord kanalu",
          "support_p1": "Potrebna vam je pomoć? Pogledajte uputstvo za igru, posetite našu Discord zajednicu ili istražite ČPP u podešavanjima.",
          "support_p2": "Takođe nas možete kontaktirati direktno koristeći formular za podršku u podešavanjima igre."
        },
        "features": {
          "fleet_title": "Napredno Upravljanje Flotom",
          "fleet_desc": "Kupujte, održavajte i optimizujte svoje kamione. Angažujte vozače i povećajte profit kroz nadogradnje.",
          "network_title": "Svetska Transportna Mreža",
          "network_desc": "Preuzmite ugovore u različitim zemljama sa dinamičnim tržištima i realističnim ograničenjima isporuke.",
          "growth_title": "Strateški Rast i Tržišta",
          "growth_desc": "Ostvarite profit, investirajte u opremu i strateški proširite svoju kompaniju da dominirate tržištem."
        },
        "facts": {
          "contracts_title": "Raznovrsnost Ugovora",
          "contracts_val": "Više Tipova Ugovora",
          "contracts_desc": "Radite na ugovorima: standardni teret, ekspresni, hladnjače, više stajališta i vangabaritni tereti.",
          "market_title": "Dinamično Tržište",
          "market_val": "Ponuda i Potražnja",
          "market_desc": "Cene i dostupnost poslova se menjaju sa tržištem — planirajte rute i investicije u skladu sa tim.",
          "time_title": "Realistična Simulacija Vremena",
          "time_val": "Dinamičan dan/noć i raspored",
          "time_desc": "Sat u svetu napreduje sa podesivom brzinom i stanjem rada."
        },
        "screenshots": {
          "market": "Tržište vozila",
          "card": "Kartica kamiona",
          "highway": "Duge relacije",
          "cargo": "Teret i utovar",
          "urban": "Gradske rute",
          "ui": "Kompaktni profil osoblja / kamiona"
        },
        "how_to": {
          "step1_title": "Kreirajte Svoju Kompaniju",
          "step1_desc": "Registrujte se i postavite svoje sedište da biste započeli operacije.",
          "step2_title": "Kupite Svoj Prvi Kamion",
          "step2_desc": "Otvorite tržište vozila i izaberite kamion koji odgovara vašoj strategiji.",
          "step3_title": "Zaposlite Osoblje i Dodelite Rute",
          "step3_desc": "Regrutujte vozače i mehaničare. Dodelite poslove, zakažite održavanje i upravljajte platama.",
          "step4_title": "Skalirajte i Optimizujte",
          "step4_desc": "Pratite profit, proširite čvorišta i usavršite svoju flotu za veće ugovore.",
          "tip1": "Balansirajte zapošljavanje sa veličinom flote — plate su stalni trošak.",
          "tip2": "Redovno održavajte kamione kako biste izbegli iznenadne kvarove i kazne.",
          "tip3": "Strateški koristite kratke i duge relacije za stabilizaciju prihoda.",
          "tip4": "Proširite čvorišta da otključate regionalne poslove i bolje plaćene ponude."
        },
        "footer": {
          "tagline": "Logistička simulacija za strateške menadžere",
          "about": "O Trucktopia Projektu",
          "about_desc": "Logistička simulacija za strateške menadžere. Izgradite i vodite transportnu kompaniju — kupujte vozila, zapošljavajte osoblje i širite svoju imperiju.",
          "copyright": "© 2025 Trucktopia Simulator"
        }
      },
      "footer": {
        "version": "Verzija",
        "encrypted": "Enkriptovana Sesija",
        "language": "Jezik"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('app_language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

/**
 * Event listener: languageChanged
 * @description Automatically persists language choice to localStorage whenever it changes.
 */
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app_language', lng);
});

export default i18n;