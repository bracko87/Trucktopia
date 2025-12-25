/**
 * CreateCompany.tsx
 *
 * Full version:
 * - Original background, glow, branding
 * - Custom dropdown with flags
 * - FULL country + city list
 * - Updated Supabase / Netlify cloud logic
 * - creditScore preserved
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Company } from '../types/game';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Truck, ChevronDown, Check } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  cities: string[];
}

const CreateCompany: React.FC = () => {
  const navigate = useNavigate();
  const { createCompany, gameState } = useGame();

  const [formData, setFormData] = useState({
    companyName: '',
    hubCountry: '',
    hubCity: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const countries: Country[] = [
    { code: 'xk', name: 'Kosovo', cities: ['Pristina', 'Prizren', 'Peja', 'Gjakova', 'Mitrovica', 'Ferizaj', 'Gjilan', 'Vushtrri', 'Suharekë', 'Podujevë'] },
    { code: 'lu', name: 'Luxembourg', cities: ['Luxembourg City', 'Differdange', 'Dudelange', 'Ettelbruck', 'Diekirch', 'Wiltz', 'Echternach'] },
    { code: 'md', name: 'Moldova', cities: ['Chișinău', 'Bălți', 'Bender', 'Rîbnița', 'Cahul', 'Ungheni', 'Soroca', 'Orhei', 'Dubăsari', 'Comrat'] },
    { code: 'me', name: 'Montenegro', cities: ['Podgorica', 'Nikšić', 'Herceg Novi', 'Pljevlja', 'Bijelo Polje', 'Cetinje', 'Berane', 'Bar', 'Kotor', 'Tivat'] },
    { code: 'mk', name: 'North Macedonia', cities: ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo', 'Veles', 'Ohrid', 'Gostivar', 'Štip', 'Strumica'] },
    { code: 'sk', name: 'Slovakia', cities: ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Nitra', 'Trnava', 'Martin', 'Trenčín', 'Poprad', 'Prievidza'] },
    { code: 'si', name: 'Slovenia', cities: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper', 'Novo Mesto', 'Ptuj', 'Trbovlje', 'Kamnik'] },
    { code: 'af', name: 'Afghanistan', cities: ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Jalalabad', 'Kunduz', 'Ghazni', 'Lashkar Gah', 'Taloqan', 'Pul-e Khumri'] },
    { code: 'bh', name: 'Bahrain', cities: ['Manama', 'Riffa', 'Muharraq','Budaiya', 'Galali'] },
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
    { code: 'fr', name: 'France', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'] },
    { code: 'de', name: 'Germany', cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'] },
    { code: 'gb', name: 'United Kingdom', cities: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Glasgow', 'Sheffield', 'Bristol', 'Leicester', 'Edinburgh', 'Coventry', 'Nottingham', 'Kingston upon Hull', 'Bradford', 'Cardiff', 'Stoke-on-Trent', 'Sunderland', 'Derby', 'Southampton', 'Portsmouth'] },
    { code: 'es', name: 'Spain', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet de Llobregat', 'La Coruña', 'Granada', 'Elche', 'Oviedo', 'Santa Cruz de Tenerife'] },
    { code: 'it', name: 'Italy', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Verona', 'Venice', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena'] },
    { code: 'ru', name: 'Russia', cities: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Nizhny Novgorod', 'Kazan', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm', 'Voronezh', 'Volgograd', 'Saratov', 'Krasnodar', 'Tyumen', 'Tolyatti', 'Izhevsk'] },
    { code: 'tr', name: 'Turkey', cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Eskişehir', 'Diyarbakır', 'Samsun', 'Denizli', 'Şanlıurfa', 'Malatya', 'Erzurum', 'Sakarya', 'Trabzon', 'Manisa'] },
    { code: 'ir', name: 'Iran', cities: ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Tabriz', 'Shiraz', 'Qom', 'Ahvaz', 'Kermanshah', 'Urmia', 'Rasht', 'Kerman', 'Hamadan', 'Yazd', 'Arak', 'Bandar Abbas', 'Zanjan', 'Sanandaj', 'Khorramabad', 'Gorgan'] },
    { code: 'in', name: 'India', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ludhiana'] }
  ].sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical sorting

  const selectedCountry = countries.find(c => c.name === formData.hubCountry);

  const getFlagUrl = (code: string) =>
    `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const email = gameState.currentUser || sessionStorage.getItem('tm_current_user');
    if (!email) {
      alert('Session error: Please log in again.');
      navigate('/login');
      return;
    }

    const hubCost = 2000;
    const remainingCapital = 10000 - hubCost;

    const newCompany: Company = {
      id: `company-${Date.now()}`,
      name: formData.companyName,
      level: 'startup',
      capital: remainingCapital,
      reputation: 0,
      employees: 1,
      founded: new Date(),
      hub: {
        id: formData.hubCity.toLowerCase().replace(/\s+/g, '-'),
        name: formData.hubCity,
        country: formData.hubCountry,
        region: 'Global',
        capacity: 5,
        level: 1,
        cost: hubCost
      },
      trucks: [],
      contracts: [],
      logo: null,
      email: email.toLowerCase(),
      creditScore: 50
    };

    try {
      const response = await fetch('/.netlify/functions/update-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          company_name: formData.companyName,
          hub_name: formData.hubCity,
          hub_country: formData.hubCountry,
          capital: remainingCapital,
          balance: remainingCapital
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Cloud update failed');

      createCompany(newCompany);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl animate-pulse delay-1000" />

      <Card className="w-full max-w-lg bg-slate-800/90 border-slate-700 relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white">TRUCKTOPIA</h1>
              <p className="text-yellow-500 text-sm">Every Route Counts</p>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Create Your Company</CardTitle>
          <CardDescription className="text-slate-400">Choose your global hub</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-slate-300">Company Name</label>
              <Input
                value={formData.companyName}
                onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div ref={dropdownRef}>
              <label className="text-sm text-slate-300">Hub Country</label>
              <button
                type="button"
                onClick={() => setIsCountryOpen(!isCountryOpen)}
                className="w-full mt-1 flex items-center justify-between bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              >
                {selectedCountry ? (
                  <div className="flex items-center space-x-2">
                    <img src={getFlagUrl(selectedCountry.code)} className="w-6 h-4 rounded" />
                    <span>{selectedCountry.name}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">Select Country</span>
                )}
                <ChevronDown className="w-4 h-4" />
              </button>

              {isCountryOpen && (
                <div className="mt-2 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg">
                  {countries.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setFormData(p => ({ ...p, hubCountry: c.name, hubCity: '' }));
                        setIsCountryOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 text-white"
                    >
                      <div className="flex items-center space-x-2">
                        <img src={getFlagUrl(c.code)} className="w-6 h-4 rounded" />
                        <span>{c.name}</span>
                      </div>
                      {formData.hubCountry === c.name && <Check className="w-4 h-4 text-yellow-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCountry && (
              <div>
                <label className="text-sm text-slate-300">Hub City</label>
                <select
                  value={formData.hubCity}
                  onChange={e => setFormData(p => ({ ...p, hubCity: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="">Select City</option>
                  {selectedCountry.cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !formData.hubCity}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isLoading ? 'Saving to Cloud...' : 'Create Company'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCompany;
