/**
 * cities.ts
 *
 * Fallback country -> cities mapping used when the authoritative game database
 * (CreateCompany exports or gameState) is not available.
 *
 * Responsibilities:
 * - Provide a typed mapping and a small data array used by BuildHubBox and other UI
 *   components to present country and city selects.
 * - Export both a convenient Record (CitiesByCountry) for quick lookups and a
 *   CountriesData array that contains full country names and city lists.
 *
 * This version additionally computes:
 * - flag: emoji flag where possible (regional indicator symbols)
 * - flagPng: external PNG flag URL (best-effort) using flagcdn.com/w40/{code}.png
 *
 * NOTE: Keep this file free of runtime side-effects. It is intentionally a plain
 * data module to allow synchronous imports.
 */

/**
 * CountryEntry
 * @description Shape for each country entry in the CountriesData array.
 */
export interface CountryEntry {
  /** ISO-like country code used across the game (lowercase) */
  code: string;
  /** Human friendly full country name */
  name: string;
  /** Array of representative city names for hub selection */
  cities: string[];
  /** Best-effort emoji flag derived from code (may not render for unofficial codes) */
  flag?: string | null;
  /** External PNG flag URL (best-effort). Uses flagcdn with 40px width. */
  flagPng?: string | null;
}

/**
 * asciiToFlagEmoji
 * @description Create a regional-indicator symbol based flag emoji for a 2-letter country code.
 *              Returns null for codes that cannot be sensibly converted.
 * @param code ISO alpha-2 like code (case-insensitive)
 */
function asciiToFlagEmoji(code: string): string | null {
  if (!code || code.length !== 2) return null;
  const A = 'A'.charCodeAt(0);
  const chars = code.toUpperCase().split('');
  // Only ASCII letters A-Z can be converted to regional indicator symbols.
  if (!chars.every((c) => c >= 'A' && c <= 'Z')) return null;
  const first = 0x1f1e6 + (chars[0].charCodeAt(0) - A);
  const second = 0x1f1e6 + (chars[1].charCodeAt(0) - A);
  return String.fromCodePoint(first, second);
}

/**
 * flagPngForCode
 * @description Return an external PNG flag URL for a 2-letter code using flagcdn.com.
 *              Returns null for codes that are not 2 letters.
 * @param code ISO alpha-2 like code (case-insensitive)
 */
function flagPngForCode(code: string): string | null {
  if (!code || code.length !== 2) return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

/**
 * RawCountries
 * @description Initial raw list of countries added to this fallback dataset.
 *              Entries here are intentionally explicit so editors can update them easily.
 *              This list includes the countries/cities you provided.
 */
const RawCountries: Omit<CountryEntry, 'flag' | 'flagPng'>[] = [
  { code: 'xk', name: 'Kosovo', cities: ['Pristina', 'Prizren', 'Peja', 'Gjakova', 'Mitrovica', 'Ferizaj', 'Gjilan', 'Vushtrri', 'Suharekë', 'Podujevë'] },
  { code: 'lu', name: 'Luxembourg', cities: ['Luxembourg City', 'Differdange', 'Dudelange', 'Ettelbruck', 'Diekirch', 'Wiltz', 'Echternach'] },
  { code: 'md', name: 'Moldova', cities: ['Chișinău', 'Bălți', 'Bender', 'Rîbnița', 'Cahul', 'Ungheni', 'Soroca', 'Orhei', 'Dubăsari', 'Comrat'] },
  { code: 'me', name: 'Montenegro', cities: ['Podgorica', 'Nikšić', 'Herceg Novi', 'Pljevlja', 'Bijelo Polje', 'Cetinje', 'Berane', 'Bar', 'Kotor', 'Tivat'] },
  { code: 'mk', name: 'North Macedonia', cities: ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo', 'Veles', 'Ohrid', 'Gostivar', 'Štip', 'Strumica'] },
  { code: 'sk', name: 'Slovakia', cities: ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Nitra', 'Trnava', 'Martin', 'Trenčín', 'Poprad', 'Prievidza'] },
  { code: 'si', name: 'Slovenia', cities: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper', 'Novo Mesto', 'Ptuj', 'Trbovlje', 'Kamnik'] },
  { code: 'af', name: 'Afghanistan', cities: ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Jalalabad', 'Kunduz', 'Ghazni', 'Lashkar Gah', 'Taloqan', 'Pul-e Khumri'] },
  { code: 'bh', name: 'Bahrain', cities: ['Manama', 'Riffa', 'Muharraq', 'Budaiya', 'Galali'] },
  { code: 'bd', name: 'Bangladesh', cities: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Mymensingh', 'Barisal', 'Rangpur', 'Narayanganj', 'Gazipur'] },
  { code: 'kh', name: 'Cambodia', cities: ['Phnom Penh', 'Battambang', 'Siem Reap', 'Sihanoukville', 'Poipet', 'Kampong Cham', 'Pursat', 'Ta Khmau', 'Kampot', 'Kampong Chhnang'] },
  { code: 'jo', name: 'Jordan', cities: ['Amman', 'Zarqa', 'Irbid', 'Russeifa', 'Aqaba', 'Madaba', 'Mafraq', 'Salt', 'Jerash', 'Karak'] },
  { code: 'kg', name: 'Kyrgyzstan', cities: ['Bishkek', 'Osh', 'Jalal-Abad', 'Karakol', 'Tokmok', 'Talas', 'Naryn', 'Kant', 'Batken', 'Balykchy'] },
  { code: 'la', name: 'Laos', cities: ['Vientiane', 'Pakse', 'Savannakhet', 'Luang Prabang', 'Thakhek', 'Phonsavan', 'Muang Xay', 'Xam Neua', 'Attapeu', 'Sekong'] },
  { code: 'lb', name: 'Lebanon', cities: ['Beirut', 'Tripoli', 'Sidon', 'Zahle', 'Tyre', 'Jounieh', 'Baabda', 'Batroun', 'Baalbek', 'Byblos'] },
  { code: 'my', name: 'Malaysia', cities: ['Kuala Lumpur', 'Kuala Terengganu', 'Kangar', 'Ipoh', 'Seremban', 'Melaka', 'Johor Bahru', 'Kuantan', 'Alor Setar', 'Kota Bharu'] },
  { code: 'mm', name: 'Myanmar', cities: ['Yangon', 'Mandalay', 'Naypyidaw', 'Bago', 'Pathein', 'Monywa', 'Sittwe', 'Meiktila', 'Taunggyi', 'Myitkyina'] },
  { code: 'om', name: 'Oman', cities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Buraimi', 'Ibri', 'Rustaq', 'Saham', 'Ibra'] },
  { code: 'qa', name: 'Qatar', cities: ['Doha', 'Al Khor', 'Al Shahaniya', 'Mesaieed', 'Dukhan', 'Al Daayen', 'Lusail'] },
  { code: 'sg', name: 'Singapore', cities: ['Singapore'] },
  { code: 'sy', name: 'Syria', cities: ['Damascus', 'Aleppo', 'Homs', 'Hama', 'Latakia', 'Deir ez-Zor', 'Raqqa', 'Daraa', 'Idlib', 'Tartus'] },
  { code: 'tj', name: 'Tajikistan', cities: ['Dushanbe', 'Khujand', 'Kulob', 'Bokhtar', 'Istaravshan', 'Tursunzoda', 'Vahdat', 'Isfara', 'Konibodom', 'Panjakent'] },
  { code: 'tm', name: 'Turkmenistan', cities: ['Ashgabat', 'Turkmenabat', 'Dashoguz', 'Mary', 'Balkanabat', 'Tejen', 'Bayramaly', 'Atamyrat', 'Kaka', 'Gyzylgaya'] },
  { code: 'uz', name: 'Uzbekistan', cities: ['Tashkent', 'Samarkand', 'Namangan', 'Andijan', 'Bukhara', 'Nukus', 'Qarshi', 'Fergana', 'Jizzakh', 'Termiz'] },
  { code: 'ye', name: 'Yemen', cities: ['Sana', 'Aden', 'Taiz', 'Al Hudaydah', 'Ibb', 'Dhamar', 'Saada', 'Marib', 'Hajjah', 'Al Mukalla'] },
  { code: 'al', name: 'Albania', cities: ['Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Fier', 'Korçë', 'Berat', 'Lushnjë', 'Pogradec', 'Kavajë'] },
  { code: 'am', name: 'Armenia', cities: ['Yerevan', 'Gyumri', 'Vanadzor', 'Vagharshapat', 'Abovyan', 'Kapan', 'Hrazdan', 'Artashat', 'Armavir', 'Gavar'] },
  { code: 'at', name: 'Austria', cities: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten', 'Dornbirn'] },
  { code: 'az', name: 'Azerbaijan', cities: ['Baku', 'Ganja', 'Sumqayit', 'Mingachevir', 'Lankaran', 'Shirvan', 'Nakhchivan', 'Shaki', 'Yevlakh', 'Khachmaz'] },
  { code: 'by', name: 'Belarus', cities: ['Minsk', 'Gomel', 'Mogilev', 'Vitebsk', 'Grodno', 'Brest', 'Babruysk', 'Baranovichi', 'Borisov', 'Pinsk'] },
  { code: 'be', name: 'Belgium', cities: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst'] },
  { code: 'ba', name: 'Bosnia and Herzegovina', cities: ['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica', 'Mostar', 'Bijeljina', 'Prijedor', 'Brčko', 'Doboj', 'Cazin'] },
  { code: 'bg', name: 'Bulgaria', cities: ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Pleven', 'Sliven', 'Dobrich', 'Shumen'] },
  { code: 'hr', name: 'Croatia', cities: ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac', 'Varaždin', 'Šibenik'] },
  { code: 'cz', name: 'Czech Republic', cities: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'Ústí nad Labem', 'Hradec Králové', 'České Budějovice', 'Pardubice'] },
  { code: 'dk', name: 'Denmark', cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde'] },
  { code: 'ee', name: 'Estonia', cities: ['Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Kohtla-Järve', 'Viljandi', 'Rakvere', 'Maardu', 'Sillamäe', 'Kuressaare'] },
  { code: 'fi', name: 'Finland', cities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori'] },
  { code: 'ge', name: 'Georgia', cities: ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi', 'Gori', 'Zugdidi', 'Poti', 'Sokhumi', 'Samtredia', 'Khashuri'] },
  { code: 'gr', name: 'Greece', cities: ['Athens', 'Thessaloniki', 'Patras', 'Larissa', 'Volos', 'Ioannina', 'Kalamata','Patras','Chalcis' ,'Kavala'] },
  { code: 'hu', name: 'Hungary', cities: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár', 'Szombathely'] },
  { code: 'iq', name: 'Iraq', cities: ['Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 'Karbala', 'Nasiriyah', 'Amara', 'Kirkuk', 'Wasit'] },
  { code: 'il', name: 'Israel', cities: ['Jerusalem', 'Tel Aviv', 'Haifa', 'Rishon LeZion', 'Petah Tikva', 'Ashdod', 'Netanya', 'Beersheba', 'Holon', 'Bnei Brak'] },
  { code: 'kz', name: 'Kazakhstan', cities: ['Nur-Sultan', 'Almaty', 'Shymkent', 'Karaganda', 'Aktobe', 'Taraz', 'Pavlodar', 'Ust-Kamenogorsk', 'Semey', 'Atyrau'] },
  { code: 'kr', name: 'South Korea', cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang'] },
  { code: 'kw', name: 'Kuwait', cities: ['Kuwait City', 'Al Ahmadi', 'Hawalli', 'As Salimiyah', 'Sabah as Salim', 'Al Farwaniyah'] },
  { code: 'lv', name: 'Latvia', cities: ['Riga', 'Daugavpils', 'Liepāja', 'Jelgava', 'Jūrmala', 'Ventspils', 'Rēzekne', 'Valmiera', 'Ogre', 'Cēsis'] },
  { code: 'lt', name: 'Lithuania', cities: ['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Alytus', 'Marijampolė', 'Mažeikiai', 'Jonava', 'Utena'] },
  { code: 'nl', name: 'Netherlands', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen'] },
  { code: 'no', name: 'Norway', cities: ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad', 'Porsgrunn', 'Skien', 'Kristiansand', 'Tønsberg'] },
  { code: 'pk', name: 'Pakistan', cities: ['Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Peshawar', 'Multan', 'Hyderabad', 'Islamabad', 'Quetta'] },
  { code: 'pl', name: 'Poland', cities: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice'] },
  { code: 'pt', name: 'Portugal', cities: ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada', 'Agualva-Cacém'] },
  { code: 'ro', name: 'Romania', cities: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești', 'Oradea'] },
  { code: 'sa', name: 'Saudi Arabia', cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Tabuk', 'Al Hofuf', 'Taif', 'Buraydah', 'Khobar'] },
  { code: 'se', name: 'Sweden', cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping'] },
  { code: 'ch', name: 'Switzerland', cities: ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel'] },
  { code: 'ua', name: 'Ukraine', cities: ['Kyiv', 'Kharkiv', 'Odessa', 'Dnipro', 'Donetsk', 'Zaporizhzhia', 'Lviv', 'Kryvyi Rih', 'Mykolaiv', 'Mariupol'] },
  { code: 'ae', name: 'United Arab Emirates', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah'] },
  { code: 'vn', name: 'Vietnam', cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Haiphong', 'Can Tho', 'Bien Hoa', 'Nha Trang', 'Hue', 'Vung Tau', 'Qui Nhon'] },
  { code: 'rs', name: 'Serbia', cities: ['Belgrade', 'Novi Sad', 'Nis', 'Kragujevac', 'Novi Pazar', 'Subotica', 'Kraljevo', 'Jagodina', 'Pirot', 'Zrenjanin'] },
  { code: 'cn', name: 'China', cities: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Tianjin', 'Chongqing', 'Wuhan', 'Chengdu', 'Xian', 'Nanjing', 'Hangzhou', 'Shenyang', 'Harbin', 'Qingdao', 'Dalian', 'Zhengzhou', 'Jinan', 'Changsha', 'Kunming', 'Suzhou'] },

  // Newly requested large-market entries
  { code: 'fr', name: 'France', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'] },
  { code: 'de', name: 'Germany', cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'] },
  { code: 'gb', name: 'United Kingdom', cities: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Glasgow', 'Sheffield', 'Bristol', 'Leicester', 'Edinburgh', 'Coventry', 'Nottingham', 'Kingston upon Hull', 'Bradford', 'Cardiff', 'Stoke-on-Trent', 'Sunderland', 'Derby', 'Southampton', 'Portsmouth'] },
  { code: 'es', name: 'Spain', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet de Llobregat', 'La Coruña', 'Granada', 'Elche', 'Oviedo', 'Santa Cruz de Tenerife'] },
  { code: 'it', name: 'Italy', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Verona', 'Venice', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena'] },
  { code: 'ru', name: 'Russia', cities: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Nizhny Novgorod', 'Kazan', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm', 'Voronezh', 'Volgograd', 'Saratov', 'Krasnodar', 'Tyumen', 'Tolyatti', 'Izhevsk'] },
  { code: 'tr', name: 'Turkey', cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Eskişehir', 'Diyarbakır', 'Samsun', 'Denizli', 'Şanlıurfa', 'Malatya', 'Erzurum', 'Sakarya', 'Trabzon', 'Manisa'] },
  { code: 'ir', name: 'Iran', cities: ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Tabriz', 'Shiraz', 'Qom', 'Ahvaz', 'Kermanshah', 'Urmia', 'Rasht', 'Kerman', 'Hamadan', 'Yazd', 'Arak', 'Bandar Abbas', 'Zanjan', 'Sanandaj', 'Khorramabad', 'Gorgan'] },
  { code: 'in', name: 'India', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ludhiana'] }
];

/**
 * CountriesData
 * @description CountriesData enhanced with computed flag emojis and PNG urls, sorted by name.
 */
export const CountriesData: CountryEntry[] = RawCountries
  // Map to include flag emoji + flag png URL
  .map((c) => ({
    ...c,
    flag: asciiToFlagEmoji(c.code),
    flagPng: flagPngForCode(c.code)
  }))
  // Remove duplicates by code (keep the last occurrence)
  .reduce<CountryEntry[]>((acc, cur) => {
    const existingIndex = acc.findIndex((e) => e.code === cur.code);
    if (existingIndex >= 0) {
      acc[existingIndex] = cur;
    } else {
      acc.push(cur);
    }
    return acc;
  }, [])
  // Sort alphabetically by country name
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * CitiesByCountry
 * @description Quick lookup map used by UI selects. Keys are country codes.
 */
export const CitiesByCountry: Record<string, string[]> = CountriesData.reduce((acc, cur) => {
  acc[cur.code] = cur.cities;
  return acc;
}, {} as Record<string, string[]>);

/**
 * CountryNames
 * @description Map of code => full country name for label rendering in selects.
 */
export const CountryNames: Record<string, string> = CountriesData.reduce((acc, cur) => {
  acc[cur.code] = cur.name;
  return acc;
}, {} as Record<string, string>);

/**
 * CountryFlags
 * @description Map of code => emoji flag (best-effort).
 */
export const CountryFlags: Record<string, string | null> = CountriesData.reduce((acc, cur) => {
  acc[cur.code] = cur.flag ?? null;
  return acc;
}, {} as Record<string, string | null>);

/**
 * CountryFlagPngs
 * @description Map of code => external 40px PNG flag URL (best-effort).
 *              Use these in <img src={CountryFlagPngs[code]} /> to display small flags.
 */
export const CountryFlagPngs: Record<string, string | null> = CountriesData.reduce((acc, cur) => {
  acc[cur.code] = cur.flagPng ?? null;
  return acc;
}, {} as Record<string, string | null>);

/**
 * Default export kept for backwards-compatibility in imports that expect a mapping.
 */
export default CitiesByCountry;