/**
 * Company Creation Page with Complete Country List and Real Flags
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Company, HubLocation } from '../types/game';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Truck, Building, MapPin, DollarSign, CheckCircle, Globe } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  cities: string[];
}

const CreateCompany: React.FC = () => {
  const navigate = useNavigate();
  const { createCompany, gameState } = useGame();
  const [formData, setFormData] = useState({
    gameWorld: 'euro-asia',
    companyName: '',
    hubCountry: '',
    hubCity: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Complete expanded list of countries from attachment
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

  const selectedCountry = countries.find(country => country.name === formData.hubCountry);
  const selectedCity = selectedCountry?.cities.find(city => city === formData.hubCity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.companyName || !formData.hubCountry || !formData.hubCity) {
      alert('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    // Calculate hub cost based on city importance
    const isMajorCity = ['London', 'Paris', 'Berlin', 'Moscow', 'Tokyo', 'Beijing', 'Istanbul', 'Dubai', 'Mumbai', 'Singapore'].includes(formData.hubCity);
    const hubCost = isMajorCity ? 3000 : 2000;
    const remainingCapital = 10000 - hubCost;

    const newCompany: Company = {
      id: `company-${Date.now()}`,
      name: formData.companyName,
      level: 'startup',
      capital: remainingCapital,
      reputation: 50,
      employees: 1,
      founded: new Date(),
      hub: {
        id: formData.hubCity.toLowerCase().replace(/\\s+/g, '-'),
        name: formData.hubCity,
        country: formData.hubCountry,
        region: 'euro-asia',
        capacity: 5,
        level: 1,
        cost: hubCost
      },
      trucks: [],
      contracts: [],
      logo: null
    };

    createCompany(newCompany);
    
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'hubCountry' && { hubCity: '' }) // Reset city when country changes
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-2xl">
        <CardHeader className="text-center space-y-1 pb-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-white leading-tight">TRUCK MANAGER</h1>
              <p className="text-yellow-500 text-sm font-medium">SIMULATOR 2024</p>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-white">
            Create Your Company
          </CardTitle>
          <CardDescription className="text-slate-400">
            Establish your logistics empire in the Euro-Asia region
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game World Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe className="h-4 w-4 text-yellow-500" />
                Game World
              </label>
              <Select value={formData.gameWorld} onValueChange={(value) => handleChange('gameWorld', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:border-yellow-500">
                  <SelectValue placeholder="Select game world" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="euro-asia" className="text-white hover:bg-slate-700">
                    Euro-Asia
                  </SelectItem>
                  <SelectItem value="americas" disabled className="text-slate-500">
                    Americas (Coming Soon)
                  </SelectItem>
                  <SelectItem value="africa" disabled className="text-slate-500">
                    Africa (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building className="h-4 w-4 text-yellow-500" />
                Company Name
              </label>
              <Input
                type="text"
                placeholder="Enter your company name"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-yellow-500"
                required
              />
            </div>

            {/* Hub Country */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-yellow-500" />
                Hub Country
              </label>
              <Select value={formData.hubCountry} onValueChange={(value) => handleChange('hubCountry', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:border-yellow-500">
                  <SelectValue placeholder="Select your hub country" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-60">
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.name} className="text-white hover:bg-slate-700">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={`https://flagcdn.com/w40/${country.code}.png`} 
                          alt={`${country.name} flag`}
                          className="w-6 h-4 object-cover rounded"
                        />
                        <span>{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hub City */}
            {selectedCountry && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-yellow-500" />
                  Hub City
                </label>
                <Select value={formData.hubCity} onValueChange={(value) => handleChange('hubCity', value)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white focus:border-yellow-500">
                    <SelectValue placeholder="Select your hub city" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 max-h-60">
                    {selectedCountry.cities.map((city) => (
                      <SelectItem key={city} value={city} className="text-white hover:bg-slate-700">
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Financial Summary */}
            {selectedCity && (
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                  Financial Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Starting Capital:</span>
                    <span className="text-green-400 font-semibold">$10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Hub Setup Cost:</span>
                    <span className="text-yellow-400 font-semibold">-$2,000</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-600 pt-2">
                    <span className="text-slate-300">Remaining Capital:</span>
                    <span className="text-white font-bold">$8,000</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isLoading || !formData.companyName || !formData.hubCountry || !formData.hubCity}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold py-3 text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Company...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Create Company & Start Playing
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCompany;