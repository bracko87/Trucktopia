/**
 * Utility functions for country flag emojis and ISO codes
 */

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

/**
 * Country data with ISO codes and flag emojis
 */
export const countries: CountryInfo[] = [
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
];

/**
 * City to country mapping for European cities
 */
export const cityToCountry: Record<string, string> = {
  // Germany
  'Berlin': 'Germany', 'Munich': 'Germany', 'Hamburg': 'Germany', 'Cologne': 'Germany', 'Stuttgart': 'Germany',
  'Düsseldorf': 'Germany', 'Dortmund': 'Germany', 'Essen': 'Germany', 'Leipzig': 'Germany', 'Bremen': 'Germany',
  'Dresden': 'Germany', 'Hanover': 'Germany', 'Nuremberg': 'Germany', 'Bonn': 'Germany', 'Mannheim': 'Germany',
  'Karlsruhe': 'Germany', 'Wiesbaden': 'Germany', 'Münster': 'Germany', 'Augsburg': 'Germany', 'Aachen': 'Germany',
  'Braunschweig': 'Germany', 'Kiel': 'Germany', 'Lübeck': 'Germany', 'Rostock': 'Germany', 'Magdeburg': 'Germany',
  'Freiburg': 'Germany', 'Erfurt': 'Germany', 'Mainz': 'Germany', 'Kassel': 'Germany', 'Oldenburg': 'Germany',
  'Osnabrück': 'Germany', 'Heidelberg': 'Germany', 'Potsdam': 'Germany', 'Würzburg': 'Germany', 'Regensburg': 'Germany',
  'Göttingen': 'Germany', 'Ulm': 'Germany', 'Ingolstadt': 'Germany', 'Trier': 'Germany', 'Saarbrücken': 'Germany',
  'Krefeld': 'Germany', 'Wolfsburg': 'Germany', 'Gelsenkirchen': 'Germany', 'Heilbronn': 'Germany', 'Pforzheim': 'Germany',
  'Reutlingen': 'Germany', 'Koblenz': 'Germany', 'Bergisch Gladbach': 'Germany', 'Jena': 'Germany', 'Remscheid': 'Germany',
  'Erlangen': 'Germany', 'Moers': 'Germany', 'Siegen': 'Germany', 'Hildesheim': 'Germany', 'Salzgitter': 'Germany',

  // France
  'Paris': 'France', 'Lyon': 'France', 'Marseille': 'France', 'Toulouse': 'France', 'Nice': 'France',
  'Nantes': 'France', 'Strasbourg': 'France', 'Montpellier': 'France', 'Bordeaux': 'France', 'Lille': 'France',
  'Rennes': 'France', 'Reims': 'France', 'Le Havre': 'France', 'Saint-Étienne': 'France', 'Toulon': 'France',

  // UK
  'London': 'UK', 'Manchester': 'UK', 'Birmingham': 'UK', 'Liverpool': 'UK', 'Glasgow': 'UK',
  'Edinburgh': 'UK', 'Leeds': 'UK', 'Bristol': 'UK', 'Cardiff': 'UK', 'Sheffield': 'UK',
  'Newcastle': 'UK', 'Nottingham': 'UK', 'Southampton': 'UK', 'Portsmouth': 'UK', 'Leicester': 'UK',

  // Netherlands
  'Amsterdam': 'Netherlands', 'Rotterdam': 'Netherlands', 'The Hague': 'Netherlands', 'Utrecht': 'Netherlands',
  'Eindhoven': 'Netherlands', 'Tilburg': 'Netherlands', 'Groningen': 'Netherlands', 'Almere': 'Netherlands',
  'Breda': 'Netherlands', 'Nijmegen': 'Netherlands', 'Enschede': 'Netherlands', 'Haarlem': 'Netherlands',

  // Belgium
  'Brussels': 'Belgium', 'Antwerp': 'Belgium', 'Ghent': 'Belgium', 'Charleroi': 'Belgium', 'Liège': 'Belgium',
  'Bruges': 'Belgium', 'Namur': 'Belgium', 'Leuven': 'Belgium', 'Mons': 'Belgium', 'Mechelen': 'Belgium',

  // Switzerland
  'Zurich': 'Switzerland', 'Basel': 'Switzerland', 'Geneva': 'Switzerland', 'Lausanne': 'Switzerland',
  'Bern': 'Switzerland', 'Winterthur': 'Switzerland', 'Lucerne': 'Switzerland', 'St. Gallen': 'Switzerland',

  // Austria
  'Vienna': 'Austria', 'Salzburg': 'Austria', 'Graz': 'Austria', 'Linz': 'Austria', 'Innsbruck': 'Austria',
  'Klagenfurt': 'Austria', 'Villach': 'Austria', 'Wels': 'Austria', 'St. Pölten': 'Austria',

  // Czech Republic
  'Prague': 'Czech Republic', 'Brno': 'Czech Republic', 'Ostrava': 'Czech Republic', 'Plzeň': 'Czech Republic',
  'Liberec': 'Czech Republic', 'Olomouc': 'Czech Republic', 'Ústí nad Labem': 'Czech Republic', 'Hradec Králové': 'Czech Republic',

  // Italy
  'Milan': 'Italy', 'Rome': 'Italy', 'Naples': 'Italy', 'Turin': 'Italy', 'Palermo': 'Italy',
  'Genoa': 'Italy', 'Bologna': 'Italy', 'Florence': 'Italy', 'Venice': 'Italy', 'Verona': 'Italy',

  // Spain
  'Madrid': 'Spain', 'Barcelona': 'Spain', 'Valencia': 'Spain', 'Seville': 'Spain', 'Zaragoza': 'Spain',
  'Málaga': 'Spain', 'Murcia': 'Spain', 'Palma': 'Spain', 'Las Palmas': 'Spain', 'Bilbao': 'Spain',

  // Portugal
  'Lisbon': 'Portugal', 'Porto': 'Portugal', 'Vila Nova de Gaia': 'Portugal', 'Amadora': 'Portugal',
  'Braga': 'Portugal', 'Funchal': 'Portugal', 'Coimbra': 'Portugal', 'Setúbal': 'Portugal',

  // Poland
  'Warsaw': 'Poland', 'Krakow': 'Poland', 'Łódź': 'Poland', 'Wrocław': 'Poland', 'Poznań': 'Poland',
  'Gdańsk': 'Poland', 'Szczecin': 'Poland', 'Bydgoszcz': 'Poland', 'Lublin': 'Poland', 'Katowice': 'Poland',

  // Hungary
  'Budapest': 'Hungary', 'Debrecen': 'Hungary', 'Szeged': 'Hungary', 'Miskolc': 'Hungary', 'Pécs': 'Hungary',
  'Győr': 'Hungary', 'Nyíregyháza': 'Hungary', 'Kecskemét': 'Hungary', 'Székesfehérvár': 'Hungary',

  // Scandinavia
  'Stockholm': 'Sweden', 'Gothenburg': 'Sweden', 'Malmö': 'Sweden', 'Uppsala': 'Sweden', 'Västerås': 'Sweden',
  'Örebro': 'Sweden', 'Linköping': 'Sweden', 'Helsingborg': 'Sweden',
  
  'Copenhagen': 'Denmark', 'Aarhus': 'Denmark', 'Odense': 'Denmark', 'Aalborg': 'Denmark', 'Esbjerg': 'Denmark',
  
  'Oslo': 'Norway', 'Bergen': 'Norway', 'Stavanger': 'Norway', 'Trondheim': 'Norway', 'Drammen': 'Norway',
  
  'Helsinki': 'Finland', 'Espoo': 'Finland', 'Tampere': 'Finland', 'Vantaa': 'Finland', 'Oulu': 'Finland',
  'Turku': 'Finland', 'Jyväskylä': 'Finland', 'Lahti': 'Finland',

  // Baltic States
  'Tallinn': 'Estonia', 'Tartu': 'Estonia', 'Narva': 'Estonia', 'Pärnu': 'Estonia',
  'Riga': 'Latvia', 'Daugavpils': 'Latvia', 'Liepāja': 'Latvia', 'Jelgava': 'Latvia',
  'Vilnius': 'Lithuania', 'Kaunas': 'Lithuania', 'Klaipėda': 'Lithuania', 'Šiauliai': 'Lithuania',

  // Other European
  'Bucharest': 'Romania', 'Cluj-Napoca': 'Romania', 'Timișoara': 'Romania', 'Iași': 'Romania',
  'Sofia': 'Bulgaria', 'Plovdiv': 'Bulgaria', 'Varna': 'Bulgaria', 'Burgas': 'Bulgaria',
  'Belgrade': 'Serbia', 'Novi Sad': 'Serbia', 'Niš': 'Serbia', 'Kragujevac': 'Serbia',
  'Zagreb': 'Croatia', 'Split': 'Croatia', 'Rijeka': 'Croatia', 'Osijek': 'Croatia',
  'Dublin': 'Ireland', 'Cork': 'Ireland', 'Limerick': 'Ireland', 'Galway': 'Ireland',
  'Athens': 'Greece', 'Thessaloniki': 'Greece', 'Patras': 'Greece', 'Heraklion': 'Greece',
  'Bratislava': 'Slovakia', 'Košice': 'Slovakia', 'Prešov': 'Slovakia', 'Žilina': 'Slovakia',
  'Ljubljana': 'Slovenia', 'Maribor': 'Slovenia', 'Celje': 'Slovenia', 'Kranj': 'Slovenia',
  'Luxembourg': 'Luxembourg', 'Esch-sur-Alzette': 'Luxembourg', 'Differdange': 'Luxembourg',
  'Valletta': 'Malta', 'Birkirkara': 'Malta', 'Mosta': 'Malta', 'Qormi': 'Malta',
  'Nicosia': 'Cyprus', 'Limassol': 'Cyprus', 'Larnaca': 'Cyprus', 'Famagusta': 'Cyprus',
};

/**
 * Get country by city name
 */
export function getCountryByCity(cityName: string): string {
  return cityToCountry[cityName] || 'International';
}

/**
 * Get country flag emoji by country name
 */
export function getCountryFlag(countryName: string): string {
  const country = countries.find(c => 
    c.name.toLowerCase() === countryName.toLowerCase() ||
    c.code.toLowerCase() === countryName.toLowerCase()
  );
  return country?.flag || '🏴';
}

/**
 * Get country ISO code by country name
 */
export function getCountryCode(countryName: string): string {
  const country = countries.find(c => 
    c.name.toLowerCase() === countryName.toLowerCase() ||
    c.code.toLowerCase() === countryName.toLowerCase()
  );
  return country?.code || 'GB';
}

/**
 * Get country flag image URL by country name
 */
export function getCountryFlagUrl(countryName: string): string {
  const code = getCountryCode(countryName);
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

/**
 * Get country flag image URL by city name
 */
export function getCountryFlagUrlByCity(cityName: string): string {
  const country = getCountryByCity(cityName);
  return getCountryFlagUrl(country);
}
