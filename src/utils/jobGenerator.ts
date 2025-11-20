/**
 * Dynamic Job Generator Engine
 * Creates realistic freight job offers for cities across Euro-Asia region
 */

import { getDistance } from './distanceCalculator';

// City size definitions
export type CitySize = 'small' | 'medium' | 'large';

// Import the new compatibility system
import { trailerTypes, cargoTypes as cargoTypeDefinitions, isCompatibleCargoTrailer } from './cargoTrailerCompatibility';

// Legacy mapping for backward compatibility
export const cargoTypes = {
  'Dry Goods': ['Box Trailer', 'Curtainside Trailer'],
  'Frozen / Refrigerated': ['Reefer Trailer', 'Freezer Trailer', 'Multi-Temp Reefer'],
  'Liquid - Clean / Food Grade': ['Food-Grade Tanker'],
  'Liquid - Industrial / Chemical': ['Industrial Tanker'],
  'Heavy Machinery / Oversized': ['Flatbed Trailer', 'Lowboy Trailer', 'Step Deck Trailer'],
  'Construction Material': ['Curtainside Trailer', 'Flatbed Trailer', 'Dump Trailer', 'Box Trailer'],
  'Construction Debris': ['Dump Trailer'],
  'Agricultural Bulk': ['Hopper Bottom Trailer'],
  'Vehicles': ['Car Carrier', 'Flatbed Trailer'],
  'Hazardous Materials': ['Industrial Tanker'],
  'Livestock': ['Livestock Trailer'],
  'Containerized / Intermodal': ['Container Chassis'],
  'Bulk Powder / Cement': ['Pneumatic Tanker'],
  'Waste & Recycling': ['Walking Floor Trailer'],
  'Extra Long Loads': ['Extendable Flatbed'],
  'Compressed Gases': ['Gas Tanker'],
  'Corrosive Chemicals': ['Acid Tanker']
};

// Expanded cargo items (~300 total) from attachment
// Expanded cargo items used to create varied and realistic job titles/descriptions
const cargoItems: Record<string, string[]> = {
  'Dry Goods': [
    'Furniture', 'Electronics', 'Clothes', 'Toys', 'Packaged Food', 'Paper Rolls', 'Textiles', 'Shoes', 'Plastic Goods', 'Books',
    'Office Supplies', 'Cleaning Products', 'Cardboard Boxes', 'Canned Food', 'Bottled Drinks', 'Instant Noodles', 'Mattresses',
    'Wooden Pallets', 'Ceramic Tiles', 'Kitchenware', 'Household Appliances', 'Bedding', 'Carpets', 'Stationery', 'Toiletries',
    'Detergents', 'Cosmetics', 'Medical Supplies', 'Pharmaceuticals', 'Light Fixtures', 'Tools', 'Garden Equipment', 'Sporting Goods',
    'Auto Parts', 'Paint Buckets', 'Plastic Containers', 'Metal Parts', 'Electrical Components', 'Hardware Supplies', 'Lamps',
    'Small Machinery', 'Packaged Beverages', 'Processed Sugar', 'Coffee Beans', 'Tea Boxes', 'Snacks', 'Pet Food', 'Baby Diapers',
    'Bicycles', 'Cables', 'Insulation Materials', 'Cardboard Rolls', 'Dry Grains', 'Shoeboxes', 'Cigarettes', 'Batteries',
    'Hand Sanitizers', 'Cereal Boxes', 'Gift Items', 'Towels', 'Plastic Packaging', 'Frozen Ready Meals (unfrozen transit)',
    'Medical Equipment', 'Cleaning Cloths', 'Plastic Toys', 'Laundry Detergent', 'Plastic Furniture', 'Aluminum Foil',
    'Glass Bottles', 'Plumbing Fixtures', 'Light Bulbs', 'Rugs', 'Cushions', 'Curtains', 'Tiles', 'Wall Paint', 'Toolboxes',
    'Electrical Switches', 'Plywood Sheets', 'Paper Towels', 'Adhesives', 'Fire Extinguishers', 'Hand Tools', 'Rubber Mats',
    'Refrigerators (non-active)', 'Microwaves', 'Televisions', 'Air Conditioners', 'Vacuum Cleaners', 'Electric Fans', 'Sewing Machines',
    'Smartphones', 'Tableware', 'Plastic Buckets', 'Shopping Bags', 'Car Seats', 'Treadmills', 'Ladders', 'Outdoor Furniture', 'Suitcases',
    'LED Panels', 'Water Dispensers', 'Office Chairs', 'Picture Frames', 'Mirrors', 'Speakers', 'Power Tools', 'Extension Cords',
    'Ropes', 'Chain Rolls', 'Bearings', 'Industrial Fans', 'Computer Components', 'Printers', 'Smartwatches', 'Gaming Consoles'
  ],

  'Frozen / Refrigerated': [
    'Frozen Meat', 'Frozen Fish', 'Ice Cream', 'Vegetables', 'Dairy Products', 'Frozen Fruit', 'Seafood', 'Butter', 'Cheese',
    'Yogurt', 'Frozen Pizza', 'Frozen Pastries', 'Frozen Dumplings', 'Frozen Bread Dough', 'Cold Cuts', 'Beverages (chilled)',
    'Pharmaceuticals (temperature-sensitive)', 'Vaccines', 'Chocolate', 'Fresh Juice', 'Berries', 'Lettuce', 'Tomatoes', 'Cucumbers',
    'Fresh Herbs', 'Bakery Products', 'Ready-to-Cook Meals', 'Energy Drinks', 'Smoothies', 'Salmon Fillets'
  ],

  'Liquid - Clean / Food Grade': [
    'Milk', 'Juice', 'Water', 'Beer', 'Wine', 'Edible Oil', 'Vinegar', 'Liquid Sugar', 'Corn Syrup', 'Olive Oil',
    'Palm Oil', 'Vegetable Oil', 'Soy Sauce', 'Molasses', 'Coconut Oil', 'Cider', 'Fruit Concentrate', 'Distilled Water',
    'Lemon Juice', 'Cooking Sauces', 'Tea Concentrate', 'Liquid Chocolate', 'Honey Syrup', 'Dairy Cream', 'Fruit Pulp'
  ],

  'Liquid - Industrial / Chemical': [
    'Fuel', 'Gasoline', 'Crude Oil', 'Lubricants', 'Chemical Solvents', 'Diesel', 'Kerosene', 'Bitumen', 'Paint Solvents', 'Acetone',
    'Hydraulic Oil', 'Engine Oil', 'Industrial Alcohol', 'Ethylene Glycol', 'Sulfuric Acid', 'Ammonia', 'Detergent Base Liquid',
    'Ink Base', 'Resins', 'Adhesive Chemicals', 'Pesticide Concentrate', 'Methanol', 'Biodiesel', 'Coolant Fluids', 'Industrial Paint'
  ],

  'Heavy Machinery / Oversized': [
    'Tractor', 'Excavator', 'Bulldozer', 'Road Roller', 'Crane Section', 'Wind Turbine Blade', 'Generator', 'Transformer', 'Tank Chassis',
    'Harvester', 'Mining Truck', 'Dump Truck Body', 'Drilling Rig', 'Pipeline Section', 'Excavator Arm', 'Bridge Segment',
    'Forklift', 'Front Loader', 'Industrial Press', 'Asphalt Mixer', 'Cement Mixer', 'Container Chassis', 'Tower Crane Section',
    'Bulldozer Blade', 'Industrial Engine'
  ],

  'Construction Material': [
    'Construction Bricks', 'Steel Beams', 'Concrete Pipes', 'Wood Planks', 'Drywall Sheets', 'Cement Blocks', 'Rebar', 'PVC Pipes',
    'Roof Tiles', 'Insulation Panels', 'Glass Panels', 'Sand Bags', 'Gravel', 'Steel Rods', 'Stone Slabs', 'Marble Tiles',
    'Timber Beams', 'Paint Buckets', 'Cement Bags', 'Scaffolding', 'Wooden Doors', 'Window Frames', 'Floor Tiles', 'Copper Pipes',
    'Aluminum Profiles', 'Gypsum Powder', 'Nails', 'Screws', 'Plaster Boards', 'Steel Mesh'
  ],

  'Construction Debris': [
    'Excavated Earth', 'Demolition Waste', 'Gravel', 'Sand', 'Rock Fill'
  ],

  'Agricultural Bulk': [
    'Corn', 'Wheat', 'Barley', 'Soybeans', 'Rice', 'Oats', 'Millet', 'Canola Seed', 'Sunflower Seed', 'Cotton',
    'Sugar Beet', 'Coffee Beans', 'Cocoa Beans', 'Rapeseed', 'Sesame Seeds', 'Peanuts', 'Lentils', 'Chickpeas', 'Flaxseed', 'Sorghum',
    'Hay Bales', 'Potatoes', 'Onions', 'Garlic', 'Carrots', 'Fertilizer', 'Animal Feed', 'Urea', 'Organic Compost', 'Grain Mix'
  ],

  'Vehicles': [
    'Small Car', 'SUV', 'Pickup Truck', 'Tractor', 'Motorcycle', 'Van', 'Minibus', 'Electric Car', 'ATV', 'Go-Kart',
    'Delivery Truck', 'Bus', 'Compact Car', 'Police Car', 'Ambulance'
  ],

  'Hazardous Materials': [
    'Chemical Drums', 'Pesticides', 'Compressed Gas Cylinders', 'Acids', 'Flammable Liquids', 'Paint Thinner', 'Diesel Additives',
    'Explosive Charges', 'Toxic Waste', 'Fireworks'
  ],

  'Livestock': [
    'Cows', 'Pigs', 'Sheep', 'Poultry', 'Goats', 'Horses', 'Calves', 'Rabbits', 'Turkeys', 'Ducks'
  ],

  'Containerized / Intermodal': [
    'Shipping Container', 'Electronics Container', 'Auto Parts Container', 'Textile Container', 'Food Container',
    'Machinery Container', 'Mixed Cargo Container', 'Clothing Container'
  ],

  'Bulk Powder / Cement': [
    'Cement', 'Flour', 'Lime Powder', 'Plastic Granules', 'Gypsum', 'Fertilizer Powder', 'Sand Dust', 'Fly Ash',
    'Talcum Powder', 'Detergent Powder', 'Silica', 'Grain Flour', 'Powdered Sugar', 'Starch', 'Calcium Carbonate'
  ],

  'Waste & Recycling': [
    'Municipal Waste', 'Recyclable Materials', 'Wood Chips', 'Garden Waste', 'Commercial Waste'
  ],

  'Extra Long Loads': [
    'Long Steel Beams', 'Bridge Girders', 'Wind Turbine Blades', 'Poles', 'Long Pipes'
  ],

  'Compressed Gases': [
    'Propane', 'Butane', 'LPG', 'Natural Gas', 'Industrial Gases'
  ],

  'Corrosive Chemicals': [
    'Sulfuric Acid', 'Hydrochloric Acid', 'Battery Acid', 'Industrial Acids'
  ]
};

// Expanded client companies (100+ from attachment)
const clients = [
  'Global Logistics Inc.', 'EuroFreight Solutions', 'Continental Transport',
  'Alpine Cargo', 'Nordic Haulers', 'Mediterranean Shipping',
  'Black Forest Transport', 'Rhine River Logistics', 'Danube Express',
  'Alps Mountain Freight', 'Baltic Sea Cargo', 'Atlantic Transport Co.',

  // New 100 companies from attachment
  'Pacific Cargo Lines', 'TransContinental Freight', 'Summit Logistics Group',
  'Eastern Horizon Transport', 'Blue Ridge Hauling', 'Titan Freight Systems',
  'Evergreen Cargo Solutions', 'Silverline Logistics', 'IronHorse Transport',
  'SkyBridge Freight', 'Frontier Cargo Services', 'Atlas Shipping & Logistics',
  'Redline Express Freight', 'PrimeRoute Logistics', 'Velocity Cargo',
  'CrossBorder Hauling', 'MetroFreight Express', 'Polar Star Logistics',
  'Central European Cargo', 'Pioneer Freight Systems', 'GlobalReach Transport',
  'Apex Logistics Network', 'Infinity Freight Group', 'RapidLink Transport',
  'Emerald Coast Shipping', 'Crystal Logistics Ltd.', 'EuroLink Cargo',
  'BlueWave Freight', 'Celtic Logistics', 'Highway Hauling Co.',
  'CargoNet Solutions', 'IronGate Transport', 'Summit Haulers',
  'Phoenix Freight Lines', 'UrbanMotion Logistics', 'Continental Express Cargo',
  'CoreHaul Logistics', 'NextGen Freight', 'RedMountain Transport',
  'PrimeLine Logistics', 'SkyTrail Cargo', 'Dynamic Freight Systems',
  'Horizon Transport Co.', 'EagleLine Logistics', 'NorthBridge Cargo',
  'Capital Cargo Services', 'BlueRiver Transport', 'EuroTrans Logistics',
  'Western Freight Lines', 'GrandLine Logistics', 'StarPoint Cargo',
  'RouteMaster Freight', 'FirstClass Hauling', 'SilverCargo Express',
  'OceanBridge Shipping', 'Zenith Transport Solutions', 'IronBridge Logistics',
  'CrossTrack Hauling', 'Pioneer Express Cargo', 'BluePeak Logistics',
  'SkyHaul Transport', 'FreightLink Europe', 'RoadStar Logistics',
  'OpenRoad Transport', 'UnionLine Freight', 'CargoRoute Systems',
  'TrueNorth Logistics', 'IronRail Cargo', 'DeltaLine Shipping',
  'SkyPort Logistics', 'AeroCargo Transport', 'Coastal Freight Lines',
  'EuroBridge Shipping', 'RapidMotion Freight', 'LandSea Logistics',
  'Mainland Cargo Group', 'ExpressPath Transport', 'PolarLine Freight',
  'SteelRiver Logistics', 'TwinCity Transport', 'SummitLine Cargo',
  'TitanLine Freight', 'MegaTrans Logistics', 'FrontLine Hauling',
  'Everflow Cargo', 'CargoFleet Solutions', 'Highland Freight Co.',
  'RoadLink Logistics', 'DirectHaul Transport', 'PrimeTrans Cargo',
  'Continental Carriers', 'NextRoute Logistics', 'RedWave Shipping',
  'TruePath Freight', 'UrbanLine Transport', 'GlobalBridge Cargo',
  'InterFreight Systems', 'RapidRoute Logistics', 'EdgeLine Transport',
  'BlueTrail Hauling', 'EuroSpeed Freight', 'TerraLine Logistics',
  'WorldWay Transport', 'NovaTrans Freight', 'ZenCargo Logistics',
  'SummitExpress Freight', 'RoyalBridge Logistics', 'Unity Freight Systems'
];

// Auto-generated city size mapping from attachment
const citySizes: Record<string, CitySize> = {
  'Aalborg': 'small',
  'Aalst': 'small',
  'Aarhus': 'medium',
  'Abovyan': 'small',
  'Abu Dhabi': 'medium',
  'Adana': 'small',
  'Aden': 'medium',
  'Agualva-Cacém': 'small',
  'Ahmedabad': 'small',
  'Ahvaz': 'small',
  'Ajman': 'small',
  'Aktobe': 'small',
  'Al Ahmadi': 'medium',
  'Al Ain': 'small',
  'Al Daayen': 'small',
  'Al Farwaniyah': 'small',
  'Al Hofuf': 'small',
  'Al Hudaydah': 'small',
  'Al Khor': 'small',
  'Al Mukalla': 'small',
  'Al Rayyan': 'medium',
  'Al Shahaniya': 'small',
  'Al Wakrah': 'small',
  'Aleppo': 'medium',
  'Alicante': 'small',
  'Almada': 'small',
  'Almaty': 'medium',
  'Almere': 'small',
  'Alor Setar': 'small',
  'Alytus': 'small',
  'Amadora': 'small',
  'Amara': 'small',
  'Amman': 'large',
  'Amsterdam': 'large',
  'Andijan': 'small',
  'Angers': 'small',
  'Ankara': 'medium',
  'Antalya': 'small',
  'Antipolo': 'small',
  'Antwerp': 'medium',
  'Aqaba': 'small',
  'Aradhippou': 'small',
  'Arak': 'small',
  'Armavir': 'small',
  'Artashat': 'small',
  'As Salimiyah': 'small',
  'Ashdod': 'small',
  'Ashgabat': 'large',
  'Atamyrat': 'small',
  'Athens': 'large',
  'Attapeu': 'small',
  'Atyrau': 'small',
  'Baabda': 'small',
  'Baalbek': 'small',
  'Babruysk': 'small',
  'Baghdad': 'large',
  'Bago': 'small',
  'Baku': 'large',
  'Balkanabat': 'small',
  'Balykchy': 'small',
  'Bandar Abbas': 'small',
  'Bandung': 'medium',
  'Bangalore': 'medium',
  'Banja Luka': 'medium',
  'Bar': 'small',
  'Baranovichi': 'small',
  'Barcelona': 'medium',
  'Bari': 'small',
  'Barisal': 'small',
  'Basel': 'medium',
  'Basra': 'medium',
  'Batken': 'small',
  'Batroun': 'small',
  'Battambang': 'medium',
  'Batumi': 'medium',
  'Bayramaly': 'small',
  'Beersheba': 'small',
  'Beijing': 'large',
  'Beirut': 'large',
  'Bekasi': 'small',
  'Belgrade': 'large',
  'Bender': 'medium',
  'Berane': 'small',
  'Berat': 'small',
  'Bergen': 'medium',
  'Berlin': 'large',
  'Bern': 'small',
  'Bhopal': 'small',
  'Biel': 'small',
  'Bielefeld': 'small',
  'Bien Hoa': 'small',
  'Bijeljina': 'small',
  'Bijelo Polje': 'small',
  'Bilbao': 'small',
  'Birmingham': 'medium',
  'Bishkek': 'large',
  'Bitola': 'medium',
  'Bnei Brak': 'small',
  'Bochum': 'small',
  'Bokhtar': 'small',
  'Bologna': 'small',
  'Bonn': 'small',
  'Bordeaux': 'small',
  'Borisov': 'small',
  'Bradford': 'small',
  'Braga': 'small',
  'Bratislava': 'large',
  'Bray': 'small',
  'Brașov': 'small',
  'Breda': 'small',
  'Bremen': 'small',
  'Brescia': 'small',
  'Brest': 'small',
  'Bristol': 'small',
  'Brno': 'medium',
  'Bruges': 'small',
  'Brussels': 'large',
  'Brčko': 'small',
  'Bucharest': 'large',
  'Budaiya': 'small',
  'Budapest': 'large',
  'Bukhara': 'small',
  'Buraimi': 'small',
  'Buraydah': 'small',
  'Burgas': 'small',
  'Bursa': 'small',
  'Busan': 'medium',
  'Byblos': 'small',
  'Bydgoszcz': 'small',
  'Bălți': 'medium',
  'Cagayan de Oro': 'small',
  'Cahul': 'small',
  'Caloocan': 'small',
  'Can Tho': 'small',
  'Cardiff': 'small',
  'Catania': 'small',
  'Cazin': 'small',
  'Cebu City': 'small',
  'Celje': 'medium',
  'Cetinje': 'small',
  'Chalcis': 'small',
  'Changsha': 'small',
  'Changwon': 'small',
  'Chania': 'small',
  'Charleroi': 'small',
  'Chelyabinsk': 'small',
  'Chengdu': 'small',
  'Chennai': 'small',
  'Chiba': 'small',
  'Chittagong': 'medium',
  'Chișinău': 'large',
  'Chongqing': 'small',
  'Cluj-Napoca': 'medium',
  'Coimbra': 'small',
  'Cologne': 'small',
  'Comrat': 'small',
  'Constanța': 'small',
  'Copenhagen': 'large',
  'Cork': 'medium',
  'Coventry': 'small',
  'Craiova': 'small',
  'Córdoba': 'small',
  'Cēsis': 'small',
  'Da Nang': 'medium',
  'Daegu': 'small',
  'Daejeon': 'small',
  'Dalian': 'small',
  'Damascus': 'large',
  'Dammam': 'small',
  'Daraa': 'small',
  'Dashoguz': 'medium',
  'Daugavpils': 'medium',
  'Davao City': 'medium',
  'Debrecen': 'medium',
  'Deir ez-Zor': 'small',
  'Delhi': 'large',
  'Denizli': 'small',
  'Depok': 'small',
  'Derby': 'small',
  'Dhaka': 'large',
  'Dhamar': 'small',
  'Diekirch': 'small',
  'Differdange': 'medium',
  'Dijon': 'small',
  'Diyarbakır': 'small',
  'Dnipro': 'small',
  'Doboj': 'small',
  'Dobrich': 'small',
  'Doha': 'large',
  'Donetsk': 'small',
  'Dornbirn': 'small',
  'Dortmund': 'small',
  'Drammen': 'small',
  'Dresden': 'small',
  'Drogheda': 'small',
  'Dubai': 'large',
  'Dublin': 'large',
  'Dubăsari': 'small',
  'Dudelange': 'small',
  'Duisburg': 'small',
  'Dukhan': 'small',
  'Dundalk': 'small',
  'Durrës': 'medium',
  'Dushanbe': 'large',
  'Düsseldorf': 'small',
  'Echternach': 'small',
  'Edinburgh': 'small',
  'Eindhoven': 'small',
  'Elche': 'small',
  'Ennis': 'small',
  'Erbil': 'small',
  'Erzurum': 'small',
  'Esbjerg': 'small',
  'Esch-sur-Alzette': 'medium',
  'Eskişehir': 'small',
  'Espoo': 'medium',
  'Essen': 'small',
  'Ettelbruck': 'small',
  'Faisalabad': 'medium',
  'Famagusta': 'small',
  'Fergana': 'small',
  'Ferizaj': 'small',
  'Fier': 'small',
  'Florence': 'small',
  'Frankfurt': 'small',
  'Fredrikstad': 'small',
  'Fujairah': 'small',
  'Fukuoka': 'small',
  'Funchal': 'small',
  'Galați': 'small',
  'Galway': 'small',
  'Ganja': 'medium',
  'Gavar': 'small',
  'Gaziantep': 'small',
  'Gazipur': 'small',
  'Gdańsk': 'small',
  'Geneva': 'medium',
  'Genoa': 'small',
  'Ghazni': 'small',
  'Ghent': 'medium',
  'Gijón': 'small',
  'Gjakova': 'small',
  'Gjilan': 'small',
  'Glasgow': 'small',
  'Gomel': 'medium',
  'Gorgan': 'small',
  'Gori': 'small',
  'Gostivar': 'small',
  'Gothenburg': 'medium',
  'Goyang': 'small',
  'Granada': 'small',
  'Graz': 'medium',
  'Grenoble': 'small',
  'Grevenmacher': 'small',
  'Grodno': 'small',
  'Groningen': 'small',
  'Guangzhou': 'medium',
  'Gujranwala': 'small',
  'Gwangju': 'small',
  'Gyumri': 'medium',
  'Gyzylgaya': 'small',
  'Győr': 'small',
  'Haifa': 'medium',
  'Haiphong': 'small',
  'Hajjah': 'small',
  'Hama': 'small',
  'Hamad Town': 'small',
  'Hamadan': 'small',
  'Hamamatsu': 'small',
  'Hamburg': 'medium',
  'Hangzhou': 'small',
  'Hanoi': 'medium',
  'Hanover': 'small',
  'Harbin': 'small',
  'Hawalli': 'medium',
  'Helsingborg': 'small',
  'Helsinki': 'large',
  'Heraklion': 'small',
  'Herat': 'medium',
  'Herceg Novi': 'medium',
  'Hiroshima': 'small',
  'Ho Chi Minh City': 'large',
  'Holon': 'small',
  'Homs': 'medium',
  'Horsens': 'small',
  'Hospitalet de Llobregat': 'small',
  'Hradec Králové': 'small',
  'Hrazdan': 'small',
  'Hue': 'small',
  'Hyderabad': 'small',
  'Iași': 'small',
  'Ibb': 'small',
  'Ibra': 'small',
  'Ibri': 'small',
  'Idlib': 'small',
  'Incheon': 'medium',
  'Indore': 'small',
  'Innsbruck': 'small',
  'Ioannina': 'small',
  'Ipoh': 'small',
  'Irbid': 'medium',
  'Isa Town': 'small',
  'Isfahan': 'medium',
  'Isfara': 'small',
  'Islamabad': 'small',
  'Istanbul': 'large',
  'Istaravshan': 'small',
  'Izhevsk': 'small',
  'Izmir': 'medium',
  'Jagodina': 'small',
  'Jaipur': 'small',
  'Jakarta': 'large',
  'Jalal-Abad': 'medium',
  'Jalalabad': 'small',
  'Jeddah': 'medium',
  'Jelgava': 'small',
  'Jerash': 'small',
  'Jerusalem': 'large',
  'Jidhafs': 'small',
  'Jinan': 'small',
  'Jizzakh': 'small',
  'Johor Bahru': 'small',
  'Jonava': 'small',
  'Jounieh': 'small',
  'Jyväskylä': 'small',
  'Jönköping': 'small',
  'Jūrmala': 'small',
  'Kabul': 'large',
  'Kaka': 'small',
  'Kamnik': 'small',
  'Kampong Cham': 'small',
  'Kampong Chhnang': 'small',
  'Kampot': 'small',
  'Kandahar': 'medium',
  'Kanpur': 'small',
  'Kant': 'small',
  'Kapan': 'small',
  'Karachi': 'large',
  'Karaganda': 'small',
  'Karaj': 'small',
  'Karak': 'small',
  'Karakol': 'small',
  'Karbala': 'small',
  'Karlovac': 'small',
  'Katowice': 'small',
  'Kaunas': 'medium',
  'Kavajë': 'small',
  'Kawasaki': 'small',
  'Kayseri': 'small',
  'Kazan': 'small',
  'Kecskemét': 'small',
  'Kerman': 'small',
  'Kermanshah': 'small',
  'Khachmaz': 'small',
  'Kharkiv': 'medium',
  'Khashuri': 'small',
  'Khobar': 'small',
  'Khorramabad': 'small',
  'Khujand': 'medium',
  'Khulna': 'medium',
  'Kingston upon Hull': 'small',
  'Kirkuk': 'small',
  'Kitakyushu': 'small',
  'Klagenfurt': 'small',
  'Klaipėda': 'medium',
  'Kobe': 'small',
  'Kohtla-Järve': 'small',
  'Kolding': 'small',
  'Kolkata': 'small',
  'Konibodom': 'small',
  'Konya': 'small',
  'Koper': 'small',
  'Korçë': 'small',
  'Kota Bharu': 'small',
  'Kotor': 'small',
  'Košice': 'medium',
  'Kragujevac': 'small',
  'Kraków': 'medium',
  'Kraljevo': 'small',
  'Kranj': 'small',
  'Krasnodar': 'small',
  'Krasnoyarsk': 'small',
  'Kristiansand': 'small',
  'Kryvyi Rih': 'small',
  'Kuala Lumpur': 'large',
  'Kuantan': 'small',
  'Kulob': 'medium',
  'Kumamoto': 'small',
  'Kumanovo': 'medium',
  'Kunduz': 'small',
  'Kunming': 'small',
  'Kuopio': 'small',
  'Kuressaare': 'small',
  'Kutaisi': 'medium',
  'Kuwait City': 'large',
  'Kyiv': 'large',
  'Kyoto': 'small',
  'Kyrenia': 'small',
  'La Coruña': 'small',
  'Lahore': 'medium',
  'Lahti': 'small',
  'Lankaran': 'small',
  'Larissa': 'small',
  'Lashkar Gah': 'small',
  'Latakia': 'small',
  'Lausanne': 'small',
  'Le Havre': 'small',
  'Leeds': 'small',
  'Leicester': 'small',
  'Leipzig': 'small',
  'Leuven': 'small',
  'Liberec': 'small',
  'Liepāja': 'medium',
  'Lille': 'small',
  'Limassol': 'medium',
  'Limerick': 'medium',
  'Linköping': 'small',
  'Linz': 'medium',
  'Lisbon': 'large',
  'Liverpool': 'small',
  'Liège': 'small',
  'Ljubljana': 'large',
  'London': 'large',
  'Luang Prabang': 'small',
  'Lublin': 'small',
  'Lucerne': 'small',
  'Lucknow': 'small',
  'Ludhiana': 'small',
  'Lugano': 'small',
  'Lusail': 'small',
  'Lushnjë': 'small',
  'Luxembourg City': 'large',
  'Lviv': 'small',
  'Lyon': 'medium',
  'Maardu': 'small',
  'Madaba': 'small',
  'Madrid': 'large',
  'Mafraq': 'small',
  'Makassar': 'small',
  'Malatya': 'small',
  'Malmö': 'medium',
  'Manama': 'large',
  'Manchester': 'medium',
  'Mandalay': 'medium',
  'Manila': 'large',
  'Manisa': 'small',
  'Marib': 'small',
  'Maribor': 'medium',
  'Marijampolė': 'small',
  'Mariupol': 'small',
  'Marseille': 'medium',
  'Martin': 'small',
  'Mary': 'small',
  'Mashhad': 'medium',
  'Mazar-i-Sharif': 'small',
  'Mažeikiai': 'small',
  'Mecca': 'medium',
  'Medan': 'small',
  'Medina': 'small',
  'Meiktila': 'small',
  'Melaka': 'small',
  'Mersin': 'small',
  'Mesaieed': 'small',
  'Messina': 'small',
  'Milan': 'medium',
  'Mingachevir': 'small',
  'Minsk': 'large',
  'Miskolc': 'small',
  'Mitrovica': 'small',
  'Modena': 'small',
  'Mogilev': 'medium',
  'Mons': 'small',
  'Montpellier': 'small',
  'Monywa': 'small',
  'Morphou': 'small',
  'Moscow': 'large',
  'Mostar': 'small',
  'Mosul': 'medium',
  'Muang Xay': 'small',
  'Muharraq': 'medium',
  'Multan': 'small',
  'Mumbai': 'large',
  'Munich': 'medium',
  'Murcia': 'small',
  'Muscat': 'large',
  'Myitkyina': 'small',
  'Mykolaiv': 'small',
  'Mymensingh': 'small',
  'Málaga': 'small',
  'Münster': 'small',
  'Nagoya': 'small',
  'Nagpur': 'small',
  'Najaf': 'small',
  'Nakhchivan': 'small',
  'Namangan': 'medium',
  'Namur': 'small',
  'Nanjing': 'small',
  'Nantes': 'small',
  'Naples': 'medium',
  'Narayanganj': 'small',
  'Narva': 'medium',
  'Naryn': 'small',
  'Nasiriyah': 'small',
  'Navan': 'small',
  'Naypyidaw': 'medium',
  'Netanya': 'small',
  'Nha Trang': 'small',
  'Nice': 'small',
  'Nicosia': 'large',
  'Niigata': 'small',
  'Nijmegen': 'small',
  'Nikšić': 'medium',
  'Nis': 'medium',
  'Nitra': 'small',
  'Nizhny Novgorod': 'small',
  'Nizwa': 'small',
  'Norrköping': 'small',
  'Nottingham': 'small',
  'Novi Pazar': 'small',
  'Novi Sad': 'medium',
  'Novo Mesto': 'small',
  'Novosibirsk': 'medium',
  'Nukus': 'small',
  'Nur-Sultan': 'large',
  'Nuremberg': 'small',
  'Nyíregyháza': 'small',
  'Nîmes': 'small',
  'Odense': 'medium',
  'Odessa': 'medium',
  'Ogre': 'small',
  'Ohrid': 'small',
  'Okayama': 'small',
  'Olomouc': 'small',
  'Omsk': 'small',
  'Oradea': 'small',
  'Orhei': 'small',
  'Osaka': 'medium',
  'Osh': 'medium',
  'Osijek': 'small',
  'Oslo': 'large',
  'Ostrava': 'medium',
  'Oulu': 'small',
  'Oviedo': 'small',
  'Padua': 'small',
  'Pakse': 'medium',
  'Palembang': 'small',
  'Palermo': 'small',
  'Palma': 'small',
  'Panevėžys': 'small',
  'Panjakent': 'small',
  'Paphos': 'small',
  'Paralimni': 'small',
  'Pardubice': 'small',
  'Paris': 'large',
  'Parma': 'small',
  'Pasig': 'small',
  'Pathein': 'small',
  'Patna': 'small',
  'Patras': 'medium',
  'Pavlodar': 'small',
  'Peja': 'medium',
  'Perm': 'small',
  'Peshawar': 'small',
  'Petah Tikva': 'small',
  'Petaling Jaya': 'medium',
  'Phnom Penh': 'large',
  'Phonsavan': 'small',
  'Pinsk': 'small',
  'Pirot': 'small',
  'Pleven': 'small',
  'Pljevlja': 'small',
  'Ploiești': 'small',
  'Plovdiv': 'medium',
  'Plzeň': 'small',
  'Podgorica': 'large',
  'Podujevë': 'small',
  'Pogradec': 'small',
  'Poipet': 'small',
  'Poprad': 'small',
  'Pori': 'small',
  'Porsgrunn': 'small',
  'Porto': 'medium',
  'Portsmouth': 'small',
  'Poti': 'small',
  'Poznań': 'small',
  'Prague': 'large',
  'Prato': 'small',
  'Prešov': 'medium',
  'Prievidza': 'small',
  'Prijedor': 'small',
  'Prilep': 'small',
  'Pristina': 'large',
  'Prizren': 'medium',
  'Protaras': 'small',
  'Ptuj': 'small',
  'Pul-e Khumri': 'small',
  'Pula': 'small',
  'Pune': 'small',
  'Pursat': 'small',
  'Pärnu': 'small',
  'Pécs': 'small',
  'Qarshi': 'small',
  'Qingdao': 'small',
  'Qom': 'small',
  'Quetta': 'small',
  'Quezon City': 'medium',
  'Qui Nhon': 'small',
  'Rajshahi': 'small',
  'Rakvere': 'small',
  'Randers': 'small',
  'Rangpur': 'small',
  'Raqqa': 'small',
  'Ras Al Khaimah': 'small',
  'Rasht': 'small',
  'Rawalpindi': 'small',
  'Reims': 'small',
  'Remich': 'small',
  'Rennes': 'small',
  'Rhodes': 'small',
  'Riffa': 'medium',
  'Riga': 'large',
  'Rijeka': 'medium',
  'Rishon LeZion': 'small',
  'Riyadh': 'large',
  'Rome': 'large',
  'Roskilde': 'small',
  'Rostov-on-Don': 'small',
  'Rotterdam': 'medium',
  'Ruse': 'small',
  'Russeifa': 'small',
  'Rustaq': 'small',
  'Rustavi': 'small',
  'Rîbnița': 'small',
  'Rēzekne': 'small',
  'Saada': 'small',
  'Sabah as Salim': 'small',
  'Saham': 'small',
  'Saint Petersburg': 'medium',
  'Saint-Étienne': 'small',
  'Saitama': 'small',
  'Sakai': 'small',
  'Sakarya': 'small',
  'Salalah': 'medium',
  'Salt': 'small',
  'Salzburg': 'small',
  'Samara': 'small',
  'Samarkand': 'medium',
  'Samsun': 'small',
  'Samtredia': 'small',
  'Sana': 'large',
  'Sanandaj': 'small',
  'Sankt Pölten': 'small',
  'Santa Cruz de Tenerife': 'small',
  'Sapporo': 'small',
  'Sarajevo': 'large',
  'Saratov': 'small',
  'Savannakhet': 'medium',
  'Sekong': 'small',
  'Semarang': 'small',
  'Semey': 'small',
  'Sendai': 'small',
  'Seoul': 'large',
  'Seremban': 'small',
  'Setúbal': 'small',
  'Seville': 'small',
  'Shah Alam': 'medium',
  'Shaki': 'small',
  'Shanghai': 'large',
  'Sharjah': 'medium',
  'Sheffield': 'small',
  'Shenyang': 'small',
  'Shenzhen': 'small',
  'Shiraz': 'small',
  'Shirvan': 'small',
  'Shizuoka': 'small',
  'Shkodër': 'small',
  'Shumen': 'small',
  'Shymkent': 'medium',
  'Sidon': 'medium',
  'Siem Reap': 'medium',
  'Sihanoukville': 'small',
  'Sillamäe': 'small',
  'Singapore': 'large',
  'Sitra': 'small',
  'Sittwe': 'small',
  'Skien': 'small',
  'Skopje': 'large',
  'Slavonski Brod': 'small',
  'Sliven': 'small',
  'Sofia': 'large',
  'Sohar': 'medium',
  'Sokhumi': 'small',
  'Soroca': 'small',
  'Southampton': 'small',
  'Split': 'medium',
  'St. Gallen': 'small',
  'Stara Zagora': 'small',
  'Stavanger': 'medium',
  'Stockholm': 'large',
  'Stoke-on-Trent': 'small',
  'Strasbourg': 'small',
  'Strumica': 'small',
  'Stuttgart': 'small',
  'Subotica': 'small',
  'Suharekë': 'small',
  'Sumqayit': 'medium',
  'Sunderland': 'small',
  'Sur': 'small',
  'Surabaya': 'medium',
  'Surat': 'small',
  'Suwon': 'small',
  'Suzhou': 'small',
  'Sylhet': 'small',
  'Szczecin': 'small',
  'Szeged': 'medium',
  'Szombathely': 'small',
  'Székesfehérvár': 'small',
  'Ta Khmau': 'small',
  'Taif': 'small',
  'Tabriz': 'small',
  'Tabuk': 'small',
  'Taguig': 'small',
  'Taiz': 'medium',
  'Talas': 'small',
  'Tallinn': 'large',
  'Taloqan': 'small',
  'Tampere': 'medium',
  'Tangerang': 'small',
  'Taranto': 'small',
  'Taraz': 'small',
  'Tartu': 'medium',
  'Tartus': 'small',
  'Tashkent': 'large',
  'Taunggyi': 'small',
  'Tbilisi': 'large',
  'Tehran': 'large',
  'Tejen': 'small',
  'Tel Aviv': 'medium',
  'Termiz': 'small',
  'Tetovo': 'small',
  'Thakhek': 'small',
  'Thane': 'small',
  'The Hague': 'medium',
  'Thessaloniki': 'medium',
  'Tianjin': 'small',
  'Tilburg': 'small',
  'Timișoara': 'medium',
  'Tirana': 'large',
  'Tivat': 'small',
  'Tokmok': 'small',
  'Tokyo': 'large',
  'Tolyatti': 'small',
  'Toulon': 'small',
  'Toulouse': 'small',
  'Trabzon': 'small',
  'Trbovlje': 'small',
  'Trenčín': 'small',
  'Trieste': 'small',
  'Tripoli': 'medium',
  'Trnava': 'small',
  'Trondheim': 'small',
  'Turin': 'small',
  'Turkmenabat': 'medium',
  'Turku': 'small',
  'Tursunzoda': 'small',
  'Tuzla': 'medium',
  'Tyre': 'small',
  'Tyumen': 'small',
  'Tønsberg': 'small',
  'Ufa': 'small',
  'Ulsan': 'small',
  'Umm Salal': 'medium',
  'Ungheni': 'small',
  'Uppsala': 'small',
  'Urmia': 'small',
  'Ust-Kamenogorsk': 'small',
  'Utena': 'small',
  'Utrecht': 'small',
  'Vadodara': 'small',
  'Vagharshapat': 'small',
  'Vahdat': 'small',
  'Valencia': 'medium',
  'Valladolid': 'small',
  'Valmiera': 'small',
  'Vanadzor': 'medium',
  'Vantaa': 'small',
  'Varaždin': 'small',
  'Varna': 'medium',
  'Vejle': 'small',
  'Velenje': 'small',
  'Veles': 'small',
  'Venice': 'small',
  'Ventspils': 'small',
  'Verona': 'small',
  'Vienna': 'large',
  'Vientiane': 'large',
  'Vigo': 'small',
  'Vila Nova de Gaia': 'medium',
  'Viljandi': 'small',
  'Villach': 'small',
  'Villeurbanne': 'small',
  'Vilnius': 'large',
  'Visakhapatnam': 'small',
  'Vitebsk': 'small',
  'Vlorë': 'medium',
  'Volgograd': 'small',
  'Volos': 'small',
  'Voronezh': 'small',
  'Vung Tau': 'small',
  'Vushtrri': 'small',
  'Västerås': 'small',
  'Warsaw': 'large',
  'Wasit': 'small',
  'Waterford': 'small',
  'Wels': 'small',
  'Wiltz': 'small',
  'Winterthur': 'small',
  'Wrocław': 'small',
  'Wuhan': 'small',
  'Wuppertal': 'small',
  'Xam Neua': 'small',
  'Xian': 'small',
  'Yangon': 'large',
  'Yazd': 'small',
  'Yekaterinburg': 'small',
  'Yerevan': 'large',
  'Yevlakh': 'small',
  'Yokohama': 'medium',
  'Zadar': 'small',
  'Zagreb': 'large',
  'Zahle': 'small',
  'Zallaq': 'small',
  'Zamboanga City': 'small',
  'Zanjan': 'small',
  'Zaporizhzhia': 'small',
  'Zaragoza': 'small',
  'Zarqa': 'medium',
  'Zenica': 'small',
  'Zhengzhou': 'small',
  'Zrenjanin': 'small',
  'Zugdidi': 'small',
  'Zurich': 'large',
  'Örebro': 'small',
  'Ústí nad Labem': 'small',
  'České Budějovice': 'small',
  'Łódź': 'medium',
  'Şanlıurfa': 'small',
  'Šiauliai': 'small',
  'Šibenik': 'small',
  'Štip': 'small',
  'Žilina': 'small',
};

// Job type distribution based on city size
const jobTypeDistribution = {
  large: { local: 0.3, state: 0.4, international: 0.3 },
  medium: { local: 0.4, state: 0.4, international: 0.2 },
  small: { local: 0.5, state: 0.35, international: 0.15 }
};

// Get available cities for job generation
export function getAvailableCities(): string[] {
  return Object.keys(citySizes);
}

// Get city size
export function getCitySize(city: string): CitySize {
  return citySizes[city] || 'small';
}

// Get number of jobs for a city based on size
export function getCityJobCount(city: string): number {
  const size = getCitySize(city);
  switch (size) {
    case 'large': return Math.floor(Math.random() * 8) + 8; // 8-15 jobs
    case 'medium': return Math.floor(Math.random() * 6) + 5; // 5-10 jobs
    case 'small': return Math.floor(Math.random() * 6) + 3; // 3-8 jobs
  }
}

// Generate random job type based on city size
function getRandomJobType(citySize: CitySize): 'local' | 'state' | 'international' {
  /**
   * @description Returns a jobType ('local' | 'state' | 'international') using
   *              the base distribution for the city size. For 'large' (hub) cities
   *              the local probability is increased by 100% (doubled) and the
   *              remaining probability is redistributed between 'state' and
   *              'international' proportionally.
   *
   *              This implements the request to increase local (hub) jobs by 100%.
   */
  const base = jobTypeDistribution[citySize];

  // Start with base probabilities
  let local = base.local;
  let state = base.state;
  let international = base.international;

  // Increase local jobs for hub (large) cities by 100% (double local probability),
  // then scale down the others proportionally to make total = 1
  if (citySize === 'large') {
    local = Math.min(1, local * 2);
    const remaining = Math.max(0, 1 - local);
    const otherSum = base.state + base.international;
    if (otherSum > 0) {
      state = (base.state / otherSum) * remaining;
      international = (base.international / otherSum) * remaining;
    } else {
      state = 0;
      international = 0;
    }
  }

  const rand = Math.random();
  if (rand < local) return 'local';
  if (rand < local + state) return 'state';
  return 'international';
}

// Get destination based on job type and origin
/**
 * @description Get a destination city for a job based on the origin and jobType.
 *              IMPORTANT: returns null when no suitable destination is found.
 *              This prevents generating offers where origin === destination.
 *
 * @param origin - origin city name
 * @param jobType - 'local' | 'state' | 'international'
 * @returns destination city name or null when no match
 */
function getDestination(origin: string, jobType: 'local' | 'state' | 'international'): string | null {
  const availableCities = getAvailableCities().filter(city => city !== origin);

  switch (jobType) {
    case 'local': {
      // Local jobs stay within ~200km
      const localCities = availableCities.filter(city => {
        const distance = getDistance(origin, city);
        return typeof distance === 'number' && distance <= 200;
      });
      if (localCities.length === 0) return null;
      return localCities[Math.floor(Math.random() * localCities.length)];
    }

    case 'state': {
      // State jobs within the same region (~200-500km)
      const stateCities = availableCities.filter(city => {
        const distance = getDistance(origin, city);
        return typeof distance === 'number' && distance > 200 && distance <= 500;
      });
      if (stateCities.length === 0) return null;
      return stateCities[Math.floor(Math.random() * stateCities.length)];
    }

    case 'international': {
      // International jobs to major cities (500km+ up to 3500km max)
      const internationalCities = availableCities.filter(city => {
        const distance = getDistance(origin, city);
        return typeof distance === 'number' && distance > 500 && distance <= 3500;
      });
      if (internationalCities.length === 0) return null;
      return internationalCities[Math.floor(Math.random() * internationalCities.length)];
    }

    default:
      return null;
  }
}

// Auto-generated getCountryCode function from attachment
function getCountryCode(city: string): string {
  const kosovoCities = ['Pristina', 'Prizren', 'Peja', 'Gjakova', 'Mitrovica', 'Ferizaj', 'Gjilan', 'Vushtrri', 'Suharekë', 'Podujevë'];
  const luxembourgCities = ['Luxembourg City', 'Differdange', 'Dudelange', 'Ettelbruck', 'Diekirch', 'Wiltz', 'Echternach'];
  const moldovaCities = ['Chișinău', 'Bălți', 'Bender', 'Rîbnița', 'Cahul', 'Ungheni', 'Soroca', 'Orhei', 'Dubăsari', 'Comrat'];
  const montenegroCities = ['Podgorica', 'Nikšić', 'Herceg Novi', 'Pljevlja', 'Bijelo Polje', 'Cetinje', 'Berane', 'Bar', 'Kotor', 'Tivat'];
  const northmacedoniaCities = ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo', 'Veles', 'Ohrid', 'Gostivar', 'Štip', 'Strumica'];
  const slovakiaCities = ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Nitra', 'Trnava', 'Martin', 'Trenčín', 'Poprad', 'Prievidza'];
  const sloveniaCities = ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper', 'Novo Mesto', 'Ptuj', 'Trbovlje', 'Kamnik'];
  const afghanistanCities = ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Jalalabad', 'Kunduz', 'Ghazni', 'Lashkar Gah', 'Taloqan', 'Pul-e Khumri'];
  const bahrainCities = ['Manama', 'Riffa', 'Muharraq','Budaiya', 'Galali'];
  const bangladeshCities = ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Mymensingh', 'Barisal', 'Rangpur', 'Narayanganj', 'Gazipur'];
  const cambodiaCities = ['Phnom Penh', 'Battambang', 'Siem Reap', 'Sihanoukville', 'Poipet', 'Kampong Cham', 'Pursat', 'Ta Khmau', 'Kampot', 'Kampong Chhnang'];
  const jordanCities = ['Amman', 'Zarqa', 'Irbid', 'Russeifa', 'Aqaba', 'Madaba', 'Mafraq', 'Salt', 'Jerash', 'Karak'];
  const kyrgyzstanCities = ['Bishkek', 'Osh', 'Jalal-Abad', 'Karakol', 'Tokmok', 'Talas', 'Naryn', 'Kant', 'Batken', 'Balykchy'];
  const laosCities = ['Vientiane', 'Pakse', 'Savannakhet', 'Luang Prabang', 'Thakhek', 'Phonsavan', 'Muang Xay', 'Xam Neua', 'Attapeu', 'Sekong'];
  const lebanonCities = ['Beirut', 'Tripoli', 'Sidon', 'Zahle', 'Tyre', 'Jounieh', 'Baabda', 'Batroun', 'Baalbek', 'Byblos'];
  const malaysiaCities = ['Kuala Lumpur', 'Kuala Terengganu', 'Kangar', 'Ipoh', 'Seremban', 'Melaka', 'Johor Bahru', 'Kuantan', 'Alor Setar', 'Kota Bharu'];
  const myanmarCities = ['Yangon', 'Mandalay', 'Naypyidaw', 'Bago', 'Pathein', 'Monywa', 'Sittwe', 'Meiktila', 'Taunggyi', 'Myitkyina'];
  const omanCities = ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Buraimi', 'Ibri', 'Rustaq', 'Saham', 'Ibra'];
  const qatarCities = ['Doha', 'Al Khor', 'Al Shahaniya', 'Mesaieed', 'Dukhan', 'Al Daayen', 'Lusail'];
  const singaporeCities = ['Singapore'];
  const syriaCities = ['Damascus', 'Aleppo', 'Homs', 'Hama', 'Latakia', 'Deir ez-Zor', 'Raqqa', 'Daraa', 'Idlib', 'Tartus'];
  const tajikistanCities = ['Dushanbe', 'Khujand', 'Kulob', 'Bokhtar', 'Istaravshan', 'Tursunzoda', 'Vahdat', 'Isfara', 'Konibodom', 'Panjakent'];
  const turkmenistanCities = ['Ashgabat', 'Turkmenabat', 'Dashoguz', 'Mary', 'Balkanabat', 'Tejen', 'Bayramaly', 'Atamyrat', 'Kaka', 'Gyzylgaya'];
  const uzbekistanCities = ['Tashkent', 'Samarkand', 'Namangan', 'Andijan', 'Bukhara', 'Nukus', 'Qarshi', 'Fergana', 'Jizzakh', 'Termiz'];
  const yemenCities = ['Sana', 'Aden', 'Taiz', 'Al Hudaydah', 'Ibb', 'Dhamar', 'Saada', 'Marib', 'Hajjah', 'Al Mukalla'];
  const albaniaCities = ['Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Fier', 'Korçë', 'Berat', 'Lushnjë', 'Pogradec', 'Kavajë'];
  const armeniaCities = ['Yerevan', 'Gyumri', 'Vanadzor', 'Vagharshapat', 'Abovyan', 'Kapan', 'Hrazdan', 'Artashat', 'Armavir', 'Gavar'];
  const austriaCities = ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten', 'Dornbirn'];
  const azerbaijanCities = ['Baku', 'Ganja', 'Sumqayit', 'Mingachevir', 'Lankaran', 'Shirvan', 'Nakhchivan', 'Shaki', 'Yevlakh', 'Khachmaz'];
  const belarusCities = ['Minsk', 'Gomel', 'Mogilev', 'Vitebsk', 'Grodno', 'Brest', 'Babruysk', 'Baranovichi', 'Borisov', 'Pinsk'];
  const belgiumCities = ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst'];
  const bosniaandherzegovinaCities = ['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica', 'Mostar', 'Bijeljina', 'Prijedor', 'Brčko', 'Doboj', 'Cazin'];
  const bulgariaCities = ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora', 'Pleven', 'Sliven', 'Dobrich', 'Shumen'];
  const croatiaCities = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac', 'Varaždin', 'Šibenik'];
  const czechrepublicCities = ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'Ústí nad Labem', 'Hradec Králové', 'České Budějovice', 'Pardubice'];
  const denmarkCities = ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde'];
  const estoniaCities = ['Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Kohtla-Järve', 'Viljandi', 'Rakvere', 'Maardu', 'Sillamäe', 'Kuressaare'];
  const finlandCities = ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori'];
  const georgiaCities = ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi', 'Gori', 'Zugdidi', 'Poti', 'Sokhumi', 'Samtredia', 'Khashuri'];
  const greeceCities = ['Athens', 'Thessaloniki', 'Patras', 'Larissa', 'Volos', 'Ioannina', 'Kalamata','Patras','Chalcis' ,'Kavala'];
  const hungaryCities = ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár', 'Szombathely'];
  const iraqCities = ['Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 'Karbala', 'Nasiriyah', 'Amara', 'Kirkuk', 'Wasit'];
  const israelCities = ['Jerusalem', 'Tel Aviv', 'Haifa', 'Rishon LeZion', 'Petah Tikva', 'Ashdod', 'Netanya', 'Beersheba', 'Holon', 'Bnei Brak'];
  const kazakhstanCities = ['Nur-Sultan', 'Almaty', 'Shymkent', 'Karaganda', 'Aktobe', 'Taraz', 'Pavlodar', 'Ust-Kamenogorsk', 'Semey', 'Atyrau'];
  const southkoreaCities = ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang'];
  const kuwaitCities = ['Kuwait City', 'Al Ahmadi', 'Hawalli', 'As Salimiyah', 'Sabah as Salim', 'Al Farwaniyah'];
  const latviaCities = ['Riga', 'Daugavpils', 'Liepāja', 'Jelgava', 'Jūrmala', 'Ventspils', 'Rēzekne', 'Valmiera', 'Ogre', 'Cēsis'];
  const lithuaniaCities = ['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Alytus', 'Marijampolė', 'Mažeikiai', 'Jonava', 'Utena'];
  const netherlandsCities = ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen'];
  const norwayCities = ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad', 'Porsgrunn', 'Skien', 'Kristiansand', 'Tønsberg'];
  const pakistanCities = ['Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Peshawar', 'Multan', 'Hyderabad', 'Islamabad', 'Quetta'];
  const polandCities = ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice'];
  const portugalCities = ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada', 'Agualva-Cacém'];
  const romaniaCities = ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești', 'Oradea'];
  const saudiarabiaCities = ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Tabuk', 'Al Hofuf', 'Taif', 'Buraydah', 'Khobar'];
  const swedenCities = ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping'];
  const switzerlandCities = ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel'];
  const ukraineCities = ['Kyiv', 'Kharkiv', 'Odessa', 'Dnipro', 'Donetsk', 'Zaporizhzhia', 'Lviv', 'Kryvyi Rih', 'Mykolaiv', 'Mariupol'];
  const unitedarabemiratesCities = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah'];
  const vietnamCities = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Haiphong', 'Can Tho', 'Bien Hoa', 'Nha Trang', 'Hue', 'Vung Tau', 'Qui Nhon'];
  const serbiaCities = ['Belgrade', 'Novi Sad', 'Nis', 'Kragujevac', 'Novi Pazar', 'Subotica', 'Kraljevo', 'Jagodina', 'Pirot', 'Zrenjanin'];
  const chinaCities = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Tianjin', 'Chongqing', 'Wuhan', 'Chengdu', 'Xian', 'Nanjing', 'Hangzhou', 'Shenyang', 'Harbin', 'Qingdao', 'Dalian', 'Zhengzhou', 'Jinan', 'Changsha', 'Kunming', 'Suzhou'];
  const franceCities = ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'];
  const germanyCities = ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'];
  const unitedkingdomCities = ['London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Glasgow', 'Sheffield', 'Bristol', 'Leicester', 'Edinburgh', 'Coventry', 'Nottingham', 'Kingston upon Hull', 'Bradford', 'Cardiff', 'Stoke-on-Trent', 'Sunderland', 'Derby', 'Southampton', 'Portsmouth'];
  const spainCities = ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet de Llobregat', 'La Coruña', 'Granada', 'Elche', 'Oviedo', 'Santa Cruz de Tenerife'];
  const italyCities = ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Verona', 'Venice', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena'];
  const russiaCities = ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Nizhny Novgorod', 'Kazan', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm', 'Voronezh', 'Volgograd', 'Saratov', 'Krasnodar', 'Tyumen', 'Tolyatti', 'Izhevsk'];
  const turkeyCities = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Kayseri', 'Mersin', 'Eskişehir', 'Diyarbakır', 'Samsun', 'Denizli', 'Şanlıurfa', 'Malatya', 'Erzurum', 'Sakarya', 'Trabzon', 'Manisa'];
  const iranCities = ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Tabriz', 'Shiraz', 'Qom', 'Ahvaz', 'Kermanshah', 'Urmia', 'Rasht', 'Kerman', 'Hamadan', 'Yazd', 'Arak', 'Bandar Abbas', 'Zanjan', 'Sanandaj', 'Khorramabad', 'Gorgan'];
  const indiaCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ludhiana'];
  if (kosovoCities.includes(city)) return 'xk';
  if (luxembourgCities.includes(city)) return 'lu';
  if (moldovaCities.includes(city)) return 'md';
  if (montenegroCities.includes(city)) return 'me';
  if (northmacedoniaCities.includes(city)) return 'mk';
  if (slovakiaCities.includes(city)) return 'sk';
  if (sloveniaCities.includes(city)) return 'si';
  if (afghanistanCities.includes(city)) return 'af';
  if (bahrainCities.includes(city)) return 'bh';
  if (bangladeshCities.includes(city)) return 'bd';
  if (cambodiaCities.includes(city)) return 'kh';
  if (jordanCities.includes(city)) return 'jo';
  if (kyrgyzstanCities.includes(city)) return 'kg';
  if (laosCities.includes(city)) return 'la';
  if (lebanonCities.includes(city)) return 'lb';
  if (malaysiaCities.includes(city)) return 'my';
  if (myanmarCities.includes(city)) return 'mm';
  if (omanCities.includes(city)) return 'om';
  if (qatarCities.includes(city)) return 'qa';
  if (singaporeCities.includes(city)) return 'sg';
  if (syriaCities.includes(city)) return 'sy';
  if (tajikistanCities.includes(city)) return 'tj';
  if (turkmenistanCities.includes(city)) return 'tm';
  if (uzbekistanCities.includes(city)) return 'uz';
  if (yemenCities.includes(city)) return 'ye';
  if (albaniaCities.includes(city)) return 'al';
  if (armeniaCities.includes(city)) return 'am';
  if (austriaCities.includes(city)) return 'at';
  if (azerbaijanCities.includes(city)) return 'az';
  if (belarusCities.includes(city)) return 'by';
  if (belgiumCities.includes(city)) return 'be';
  if (bosniaandherzegovinaCities.includes(city)) return 'ba';
  if (bulgariaCities.includes(city)) return 'bg';
  if (croatiaCities.includes(city)) return 'hr';;
  if (czechrepublicCities.includes(city)) return 'cz';
  if (denmarkCities.includes(city)) return 'dk';
  if (estoniaCities.includes(city)) return 'ee';
  if (finlandCities.includes(city)) return 'fi';
  if (georgiaCities.includes(city)) return 'ge';
  if (greeceCities.includes(city)) return 'gr';
  if (hungaryCities.includes(city)) return 'hu';
  if (iraqCities.includes(city)) return 'iq';
  if (israelCities.includes(city)) return 'il';
  if (kazakhstanCities.includes(city)) return 'kz';
  if (southkoreaCities.includes(city)) return 'kr';
  if (kuwaitCities.includes(city)) return 'kw';
  if (latviaCities.includes(city)) return 'lv';
  if (lithuaniaCities.includes(city)) return 'lt';
  if (netherlandsCities.includes(city)) return 'nl';
  if (norwayCities.includes(city)) return 'no';
  if (pakistanCities.includes(city)) return 'pk';
  if (polandCities.includes(city)) return 'pl';
  if (portugalCities.includes(city)) return 'pt';
  if (romaniaCities.includes(city)) return 'ro';
  if (saudiarabiaCities.includes(city)) return 'sa';
  if (swedenCities.includes(city)) return 'se';
  if (switzerlandCities.includes(city)) return 'ch';
  if (ukraineCities.includes(city)) return 'ua';
  if (unitedarabemiratesCities.includes(city)) return 'ae';
  if (vietnamCities.includes(city)) return 'vn';
  if (serbiaCities.includes(city)) return 'rs';
  if (chinaCities.includes(city)) return 'cn';
  if (franceCities.includes(city)) return 'fr';
  if (germanyCities.includes(city)) return 'de';
  if (unitedkingdomCities.includes(city)) return 'gb';
  if (spainCities.includes(city)) return 'es';
  if (italyCities.includes(city)) return 'it';
  if (russiaCities.includes(city)) return 'ru';
  if (turkeyCities.includes(city)) return 'tr';
  if (iranCities.includes(city)) return 'ir';
  if (indiaCities.includes(city)) return 'in';
  return '';
}

// Generate tags based on job characteristics
function generateTags(cargoType: string, jobType: string, weight: number): string[] {
  const tags: string[] = [];
  
  // Cargo type tags
  if (cargoType.includes('Frozen') || cargoType.includes('Refrigerated')) tags.push('Temperature Control');
  if (cargoType.includes('Hazardous')) tags.push('Safety Certified');
  if (cargoType.includes('Heavy')) tags.push('Oversized Load');
  if (cargoType.includes('Bulk')) tags.push('Bulk Cargo');
  
  // Weight tags
  if (weight <= 8) tags.push('Small Load');
  else if (weight <= 16) tags.push('Standard Load');
  else tags.push('Large Load');
  
  // Job type tags
  if (jobType === 'international') tags.push('Cross Border');
  if (jobType === 'local') tags.push('Quick Delivery');
  
  return tags.slice(0, 3); // Max 3 tags
}

// Generate deadline based on distance and job type
function generateDeadline(distance: number, jobType: string): string {
  const baseHours = Math.ceil(distance / 60); // Base hours at 60km/h average
  
  switch (jobType) {
    case 'local':
      return `${Math.max(8, baseHours + 4)}h`; // 8h minimum for local
    case 'state':
      return `${Math.max(16, baseHours + 8)}h`; // 16h minimum for state
    case 'international':
      return `${Math.max(24, baseHours + 12)}h`; // 24h minimum for international
    default:
      return `${baseHours + 8}h`;
  }
}

// Calculate job value based on realistic pricing
function calculateJobValue(distance: number, weight: number, cargoType: string, jobType: string): number {
  const baseRatePerKm = 2.5; // Base rate per km
  
  // Weight multipliers
  let weightMultiplier = 1.0;
  if (weight <= 8) weightMultiplier = 1.4;  // Premium for small loads
  else if (weight <= 16) weightMultiplier = 1.0; // Standard
  else weightMultiplier = 0.8; // Economy for large loads
  
  // Job type multipliers
  let jobMultiplier = 1.0;
  if (jobType === 'state') jobMultiplier = 1.6;
  else if (jobType === 'international') jobMultiplier = 2.2;
  
  // Cargo type bonuses
  let cargoBonus = 1.0;
  if (cargoType.includes('Frozen') || cargoType.includes('Refrigerated')) cargoBonus = 1.25;
  if (cargoType.includes('Hazardous')) cargoBonus = 1.35;
  if (cargoType.includes('Bulk')) cargoBonus = 1.1;
  if (cargoType.includes('Construction')) cargoBonus = 1.15;
  if (cargoType.includes('Heavy')) cargoBonus = 1.3;
  
  // Calculate base price
  const basePrice = (distance * baseRatePerKm) * weightMultiplier * jobMultiplier * cargoBonus;
  
  // Add weight component (per ton)
  const weightComponent = weight * 15;
  
  return Math.round(basePrice + weightComponent);
}

// Generate experience requirement based on job complexity
function generateExperience(cargoType: string, jobType: string, weight: number): number {
  let baseExp = 0;
  
  // Cargo complexity
  if (cargoType.includes('Hazardous')) baseExp += 40;
  if (cargoType.includes('Heavy')) baseExp += 25;
  if (cargoType.includes('Frozen')) baseExp += 15;
  if (cargoType.includes('Bulk')) baseExp += 10;
  
  // Job type complexity
  if (jobType === 'international') baseExp += 30;
  if (jobType === 'state') baseExp += 15;
  
  // Weight complexity
  if (weight > 20) baseExp += 20;
  else if (weight > 15) baseExp += 10;
  
  return Math.min(baseExp, 80); // Cap at 80
}

// Check if cargo type allows partial loads
function allowsPartialLoad(cargoType: string): boolean {
  const partialLoadTypes = ['Dry Goods', 'Construction Material', 'Agricultural Bulk', 'Bulk Powder / Cement'];
  return partialLoadTypes.includes(cargoType);
}

/**
 * @description Generate jobs for a specific city.
 *
 * This function creates an initial batch of jobs based on city size and then,
 * for large (hub) cities, deterministically increases the count of 'local' and
 * 'state' jobs by 100% (doubling each). It also enforces a minimum number of
 * offers per city (MIN_OFFERS_PER_CITY). The deterministic increase is done by
 * attempting additional job generations that force the needed jobType until
 * the doubled targets are reached or safety attempt limits are hit.
 */
export function generateJobsForCity(city: string) {
  const citySize = getCitySize(city);
  const jobCount = getCityJobCount(city);
  const jobs: any[] = [];
  
  // Generate initial batch
  for (let i = 0; i < jobCount; i++) {
    // Select random cargo type with enforced 50% Dry Goods probability
    const cargoTypesArray = Object.keys(cargoTypes);

    // Enforce 50% of offers to be 'Dry Goods' while preserving original randomness for others.
    // If 'Dry Goods' isn't available in the mapping, fall back to uniform selection.
    let cargoType: string;
    if (cargoTypesArray.includes('Dry Goods') && Math.random() < 0.5) {
      cargoType = 'Dry Goods';
    } else {
      const otherTypes = cargoTypesArray.filter(ct => ct !== 'Dry Goods');
      // If for some reason no other types exist, fallback to any available type
      if (otherTypes.length === 0) {
        cargoType = cargoTypesArray[Math.floor(Math.random() * cargoTypesArray.length)];
      } else {
        cargoType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
      }
    }
    
    // Select compatible trailer
    const trailerOptions = cargoTypes[cargoType as keyof typeof cargoTypes];
    const trailerType = trailerOptions[Math.floor(Math.random() * trailerOptions.length)];
    
    // Select specific cargo item
    const cargoItemsArray = cargoItems[cargoType as keyof typeof cargoItems];
    const cargoItem = cargoItemsArray[Math.floor(Math.random() * cargoItemsArray.length)];
    
    // Generate job type
    const jobType = getRandomJobType(citySize);
    
    // Get destination
    const destination = getDestination(city, jobType);
    
    // Calculate distance - skip if over 3500km (unrealistic)
    const distance = getDistance(city, destination);
    if (!distance || distance > 3500) {
      continue; // Skip this job - no realistic route available
    }
    
    // Generate weight (2-24 tons, in even numbers)
    const weight = Math.floor(Math.random() * 11) * 2 + 2; // 2,4,6,...,22,24
    
    // Generate job data
    const experience = generateExperience(cargoType, jobType, weight);
    const value = calculateJobValue(distance, weight, cargoType, jobType);
    const deadline = generateDeadline(distance, jobType);
    const allowPartialLoad = allowsPartialLoad(cargoType);
    const tags = generateTags(cargoType, jobType, weight);
    
    const job = {
      id: Math.floor(100000 + Math.random() * 900000).toString(), // Always 6-digit unique ID (no "job-" prefix)
      title: `${cargoItem} Transport`,
      client: clients[Math.floor(Math.random() * clients.length)],
      value: value,
      distance: distance,
      origin: city,
      destination: destination,
      originCountry: getCountryCode(city),
      destinationCountry: getCountryCode(destination),
      cargoType: cargoType,
      trailerType: trailerType,
      weight: weight,
      experience: experience,
      jobType: jobType,
      tags: tags,
      deadline: deadline,
      allowPartialLoad: allowPartialLoad,
      remainingWeight: weight,
      assignedTo: 'Job Market' // Track origin of job
    };
    
    jobs.push(job);
  }
  
  // Ensure minimum offers per city. This helps when many generated jobs were
  // skipped (for example due to distance filtering) and guarantees at least
  // MIN_OFFERS_PER_CITY valid offers are returned when possible.
  const MIN_OFFERS_PER_CITY = 10;
  const MAX_ENSURE_ATTEMPTS = 200; // safety cap
  let ensureAttempts = 0;
  while (jobs.length < MIN_OFFERS_PER_CITY && ensureAttempts < MAX_ENSURE_ATTEMPTS) {
    ensureAttempts++;
    // Generate one additional candidate job (use same rules: 50% Dry Goods, random jobType)
    const cargoTypesArray = Object.keys(cargoTypes);
    let cargoType: string;
    if (cargoTypesArray.includes('Dry Goods') && Math.random() < 0.5) {
      cargoType = 'Dry Goods';
    } else {
      const otherTypes = cargoTypesArray.filter(ct => ct !== 'Dry Goods');
      cargoType = otherTypes.length === 0 ? cargoTypesArray[Math.floor(Math.random() * cargoTypesArray.length)] : otherTypes[Math.floor(Math.random() * otherTypes.length)];
    }

    const trailerOptions = cargoTypes[cargoType as keyof typeof cargoTypes];
    const trailerType = trailerOptions[Math.floor(Math.random() * trailerOptions.length)];
    const cargoItemsArray = cargoItems[cargoType as keyof typeof cargoItems];
    const cargoItem = cargoItemsArray[Math.floor(Math.random() * cargoItemsArray.length)];

    const jobType = getRandomJobType(citySize);
    const destination = getDestination(city, jobType);
    const distance = getDistance(city, destination);
    if (!distance || distance > 3500) {
      continue; // invalid candidate, try again
    }

    const weight = Math.floor(Math.random() * 11) * 2 + 2;
    const experience = generateExperience(cargoType, jobType, weight);
    const value = calculateJobValue(distance, weight, cargoType, jobType);
    const deadline = generateDeadline(distance, jobType);
    const allowPartialLoad = allowsPartialLoad(cargoType);
    const tags = generateTags(cargoType, jobType, weight);

    const job = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      title: `${cargoItem} Transport`,
      client: clients[Math.floor(Math.random() * clients.length)],
      value,
      distance,
      origin: city,
      destination,
      originCountry: getCountryCode(city),
      destinationCountry: getCountryCode(destination),
      cargoType,
      trailerType,
      weight,
      experience,
      jobType,
      tags,
      deadline,
      allowPartialLoad,
      remainingWeight: weight,
      assignedTo: 'Job Market'
    };

    jobs.push(job);
  }
  // If we exhausted ensure attempts and still have fewer than MIN_OFFERS_PER_CITY,
  // we exit and return what we have (safety).

  // Deterministic boost for hub cities: double local & state job counts
  if (citySize === 'large') {
    // Count current job types
    const counts = { local: 0, state: 0, international: 0 };
    for (const j of jobs) {
      if (j.jobType === 'local') counts.local++;
      else if (j.jobType === 'state') counts.state++;
      else counts.international++;
    }
    
    const targetLocal = counts.local * 2;
    const targetState = counts.state * 2;
    
    // Safety limits to avoid infinite loops if destinations cannot be found
    const MAX_ATTEMPTS = 500;
    let attempts = 0;
    
    // Helper to generate one job forcing the specific jobType ('local'|'state')
    const generateForcedJob = (forcedJobType: 'local' | 'state') => {
      // Select cargo type (preserve 50% Dry Goods rule)
      const cargoTypesArray = Object.keys(cargoTypes);
      let cargoType: string;
      if (cargoTypesArray.includes('Dry Goods') && Math.random() < 0.5) {
        cargoType = 'Dry Goods';
      } else {
        const otherTypes = cargoTypesArray.filter(ct => ct !== 'Dry Goods');
        if (otherTypes.length === 0) {
          cargoType = cargoTypesArray[Math.floor(Math.random() * cargoTypesArray.length)];
        } else {
          cargoType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
        }
      }
      
      const trailerOptions = cargoTypes[cargoType as keyof typeof cargoTypes];
      const trailerType = trailerOptions[Math.floor(Math.random() * trailerOptions.length)];
      
      const cargoItemsArray = cargoItems[cargoType as keyof typeof cargoItems];
      const cargoItem = cargoItemsArray[Math.floor(Math.random() * cargoItemsArray.length)];
      
      // Force destination based on required type
      const destination = getDestination(city, forcedJobType);
      const distance = getDistance(city, destination);
      if (!distance || distance > 3500) {
        return null; // invalid, caller will count this as a failed attempt
      }
      
      // Weight + job meta
      const weight = Math.floor(Math.random() * 11) * 2 + 2;
      const experience = generateExperience(cargoType, forcedJobType, weight);
      const value = calculateJobValue(distance, weight, cargoType, forcedJobType);
      const deadline = generateDeadline(distance, forcedJobType);
      const allowPartialLoad = allowsPartialLoad(cargoType);
      const tags = generateTags(cargoType, forcedJobType, weight);
      
      const job = {
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        title: `${cargoItem} Transport`,
        client: clients[Math.floor(Math.random() * clients.length)],
        value,
        distance,
        origin: city,
        destination,
        originCountry: getCountryCode(city),
        destinationCountry: getCountryCode(destination),
        cargoType,
        trailerType,
        weight,
        experience,
        jobType: forcedJobType,
        tags,
        deadline,
        allowPartialLoad,
        remainingWeight: weight,
        assignedTo: 'Job Market'
      };
      
      return job;
    };
    
    // Attempt to create extra jobs to reach targets
    while ((counts.local < targetLocal || counts.state < targetState) && attempts < MAX_ATTEMPTS) {
      attempts++;
      // Prefer to fill the one that's further from target
      const needLocal = targetLocal - counts.local;
      const needState = targetState - counts.state;
      const forceType: 'local' | 'state' = needLocal >= needState ? 'local' : 'state';
      
      const newJob = generateForcedJob(forceType);
      if (newJob) {
        jobs.push(newJob);
        if (forceType === 'local') counts.local++;
        else counts.state++;
      }
      // If generateForcedJob returned null, loop continues and attempts increments.
    }
    // If we exhausted attempts, we stop; the deterministic increase tried but couldn't fully reach targets
  }
  
  return jobs;
}

// Get all available cities for job generation
export function getAllCitiesForJobs(): string[] {
  return Object.keys(citySizes);
}