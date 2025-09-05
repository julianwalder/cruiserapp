export interface Country {
  code: string;
  name: string;
  regions: Region[];
}

export interface Region {
  code: string;
  name: string;
}

export const EUROPEAN_COUNTRIES: Country[] = [
  {
    code: 'RO',
    name: 'Romania',
    regions: [
      { code: 'AB', name: 'Alba' },
      { code: 'AR', name: 'Arad' },
      { code: 'AG', name: 'Argeș' },
      { code: 'BC', name: 'Bacău' },
      { code: 'BH', name: 'Bihor' },
      { code: 'BN', name: 'Bistrița-Năsăud' },
      { code: 'BT', name: 'Botoșani' },
      { code: 'BR', name: 'Brăila' },
      { code: 'BV', name: 'Brașov' },
      { code: 'B', name: 'București' },
      { code: 'BZ', name: 'Buzău' },
      { code: 'CL', name: 'Călărași' },
      { code: 'CS', name: 'Caraș-Severin' },
      { code: 'CJ', name: 'Cluj' },
      { code: 'CT', name: 'Constanța' },
      { code: 'CV', name: 'Covasna' },
      { code: 'DB', name: 'Dâmbovița' },
      { code: 'DJ', name: 'Dolj' },
      { code: 'GL', name: 'Galați' },
      { code: 'GR', name: 'Giurgiu' },
      { code: 'GJ', name: 'Gorj' },
      { code: 'HR', name: 'Harghita' },
      { code: 'HD', name: 'Hunedoara' },
      { code: 'IL', name: 'Ialomița' },
      { code: 'IS', name: 'Iași' },
      { code: 'IF', name: 'Ilfov' },
      { code: 'MM', name: 'Maramureș' },
      { code: 'MH', name: 'Mehedinți' },
      { code: 'MS', name: 'Mureș' },
      { code: 'NT', name: 'Neamț' },
      { code: 'OT', name: 'Olt' },
      { code: 'PH', name: 'Prahova' },
      { code: 'SJ', name: 'Sălaj' },
      { code: 'SM', name: 'Satu Mare' },
      { code: 'SB', name: 'Sibiu' },
      { code: 'SV', name: 'Suceava' },
      { code: 'TR', name: 'Teleorman' },
      { code: 'TM', name: 'Timiș' },
      { code: 'TL', name: 'Tulcea' },
      { code: 'VL', name: 'Vâlcea' },
      { code: 'VS', name: 'Vaslui' },
      { code: 'VN', name: 'Vrancea' }
    ]
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    regions: [
      { code: 'BG-01', name: 'Blagoevgrad' },
      { code: 'BG-02', name: 'Burgas' },
      { code: 'BG-03', name: 'Varna' },
      { code: 'BG-04', name: 'Veliko Tarnovo' },
      { code: 'BG-05', name: 'Vidin' },
      { code: 'BG-06', name: 'Vratsa' },
      { code: 'BG-07', name: 'Gabrovo' },
      { code: 'BG-08', name: 'Dobrich' },
      { code: 'BG-09', name: 'Kardzhali' },
      { code: 'BG-10', name: 'Kyustendil' },
      { code: 'BG-11', name: 'Lovech' },
      { code: 'BG-12', name: 'Montana' },
      { code: 'BG-13', name: 'Pazardzhik' },
      { code: 'BG-14', name: 'Pernik' },
      { code: 'BG-15', name: 'Pleven' },
      { code: 'BG-16', name: 'Plovdiv' },
      { code: 'BG-17', name: 'Razgrad' },
      { code: 'BG-18', name: 'Ruse' },
      { code: 'BG-19', name: 'Silistra' },
      { code: 'BG-20', name: 'Sliven' },
      { code: 'BG-21', name: 'Smolyan' },
      { code: 'BG-22', name: 'Sofia' },
      { code: 'BG-23', name: 'Sofia City' },
      { code: 'BG-24', name: 'Stara Zagora' },
      { code: 'BG-25', name: 'Targovishte' },
      { code: 'BG-26', name: 'Haskovo' },
      { code: 'BG-27', name: 'Shumen' },
      { code: 'BG-28', name: 'Yambol' }
    ]
  },
  {
    code: 'HU',
    name: 'Hungary',
    regions: [
      { code: 'BA', name: 'Baranya' },
      { code: 'BZ', name: 'Borsod-Abaúj-Zemplén' },
      { code: 'BU', name: 'Budapest' },
      { code: 'BK', name: 'Bács-Kiskun' },
      { code: 'BE', name: 'Békés' },
      { code: 'BC', name: 'Békéscsaba' },
      { code: 'CS', name: 'Csongrád-Csanád' },
      { code: 'DE', name: 'Debrecen' },
      { code: 'DU', name: 'Dunaújváros' },
      { code: 'EG', name: 'Eger' },
      { code: 'ER', name: 'Érd' },
      { code: 'FE', name: 'Fejér' },
      { code: 'GS', name: 'Győr-Moson-Sopron' },
      { code: 'HB', name: 'Hajdú-Bihar' },
      { code: 'HE', name: 'Heves' },
      { code: 'HV', name: 'Hódmezővásárhely' },
      { code: 'JN', name: 'Jász-Nagykun-Szolnok' },
      { code: 'KV', name: 'Kaposvár' },
      { code: 'KM', name: 'Kecskemét' },
      { code: 'KE', name: 'Komárom-Esztergom' },
      { code: 'MI', name: 'Miskolc' },
      { code: 'NK', name: 'Nagykanizsa' },
      { code: 'NY', name: 'Nyíregyháza' },
      { code: 'PS', name: 'Pécs' },
      { code: 'ST', name: 'Salgótarján' },
      { code: 'SO', name: 'Somogy' },
      { code: 'SN', name: 'Sopron' },
      { code: 'SZ', name: 'Szabolcs-Szatmár-Bereg' },
      { code: 'SD', name: 'Szeged' },
      { code: 'SF', name: 'Székesfehérvár' },
      { code: 'SS', name: 'Szekszárd' },
      { code: 'SK', name: 'Szolnok' },
      { code: 'SH', name: 'Szombathely' },
      { code: 'TB', name: 'Tatabánya' },
      { code: 'TO', name: 'Tolna' },
      { code: 'VA', name: 'Vas' },
      { code: 'VE', name: 'Veszprém' },
      { code: 'VM', name: 'Veszprém' },
      { code: 'ZA', name: 'Zala' },
      { code: 'ZE', name: 'Zalaegerszeg' }
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    regions: [
      { code: 'BW', name: 'Baden-Württemberg' },
      { code: 'BY', name: 'Bavaria' },
      { code: 'BE', name: 'Berlin' },
      { code: 'BB', name: 'Brandenburg' },
      { code: 'HB', name: 'Bremen' },
      { code: 'HH', name: 'Hamburg' },
      { code: 'HE', name: 'Hesse' },
      { code: 'MV', name: 'Mecklenburg-Vorpommern' },
      { code: 'NI', name: 'Lower Saxony' },
      { code: 'NW', name: 'North Rhine-Westphalia' },
      { code: 'RP', name: 'Rhineland-Palatinate' },
      { code: 'SL', name: 'Saarland' },
      { code: 'SN', name: 'Saxony' },
      { code: 'ST', name: 'Saxony-Anhalt' },
      { code: 'SH', name: 'Schleswig-Holstein' },
      { code: 'TH', name: 'Thuringia' }
    ]
  },
  {
    code: 'FR',
    name: 'France',
    regions: [
      { code: 'ARA', name: 'Auvergne-Rhône-Alpes' },
      { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
      { code: 'BRE', name: 'Brittany' },
      { code: 'CVL', name: 'Centre-Val de Loire' },
      { code: 'COR', name: 'Corsica' },
      { code: 'GES', name: 'Grand Est' },
      { code: 'HDF', name: 'Hauts-de-France' },
      { code: 'IDF', name: 'Île-de-France' },
      { code: 'NOR', name: 'Normandy' },
      { code: 'NAQ', name: 'Nouvelle-Aquitaine' },
      { code: 'OCC', name: 'Occitanie' },
      { code: 'PDL', name: 'Pays de la Loire' },
      { code: 'PAC', name: 'Provence-Alpes-Côte d\'Azur' }
    ]
  },
  {
    code: 'IT',
    name: 'Italy',
    regions: [
      { code: 'ABR', name: 'Abruzzo' },
      { code: 'BAS', name: 'Basilicata' },
      { code: 'CAL', name: 'Calabria' },
      { code: 'CAM', name: 'Campania' },
      { code: 'EMR', name: 'Emilia-Romagna' },
      { code: 'FVG', name: 'Friuli-Venezia Giulia' },
      { code: 'LAZ', name: 'Lazio' },
      { code: 'LIG', name: 'Liguria' },
      { code: 'LOM', name: 'Lombardy' },
      { code: 'MAR', name: 'Marche' },
      { code: 'MOL', name: 'Molise' },
      { code: 'PAB', name: 'Piedmont' },
      { code: 'PUG', name: 'Apulia' },
      { code: 'SAR', name: 'Sardinia' },
      { code: 'SIC', name: 'Sicily' },
      { code: 'TOS', name: 'Tuscany' },
      { code: 'TAA', name: 'Trentino-Alto Adige' },
      { code: 'UMB', name: 'Umbria' },
      { code: 'VDA', name: 'Aosta Valley' },
      { code: 'VEN', name: 'Veneto' }
    ]
  },
  {
    code: 'ES',
    name: 'Spain',
    regions: [
      { code: 'AN', name: 'Andalusia' },
      { code: 'AR', name: 'Aragon' },
      { code: 'AS', name: 'Asturias' },
      { code: 'CB', name: 'Cantabria' },
      { code: 'CL', name: 'Castile and León' },
      { code: 'CM', name: 'Castilla-La Mancha' },
      { code: 'CN', name: 'Canary Islands' },
      { code: 'CT', name: 'Catalonia' },
      { code: 'CE', name: 'Ceuta' },
      { code: 'EX', name: 'Extremadura' },
      { code: 'GA', name: 'Galicia' },
      { code: 'IB', name: 'Balearic Islands' },
      { code: 'RI', name: 'La Rioja' },
      { code: 'MD', name: 'Madrid' },
      { code: 'ML', name: 'Melilla' },
      { code: 'MC', name: 'Murcia' },
      { code: 'NC', name: 'Navarre' },
      { code: 'PV', name: 'Basque Country' },
      { code: 'VC', name: 'Valencian Community' }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    regions: [
      { code: 'ENG', name: 'England' },
      { code: 'SCT', name: 'Scotland' },
      { code: 'WLS', name: 'Wales' },
      { code: 'NIR', name: 'Northern Ireland' }
    ]
  },
  {
    code: 'PL',
    name: 'Poland',
    regions: [
      { code: 'DS', name: 'Lower Silesia' },
      { code: 'KP', name: 'Kuyavia-Pomerania' },
      { code: 'LU', name: 'Lublin' },
      { code: 'LB', name: 'Lubusz' },
      { code: 'LD', name: 'Łódź' },
      { code: 'MA', name: 'Lesser Poland' },
      { code: 'MZ', name: 'Masovia' },
      { code: 'OP', name: 'Opole' },
      { code: 'PK', name: 'Subcarpathia' },
      { code: 'PD', name: 'Podlaskie' },
      { code: 'PM', name: 'Pomerania' },
      { code: 'SL', name: 'Silesia' },
      { code: 'SK', name: 'Świętokrzyskie' },
      { code: 'WN', name: 'Warmia-Masuria' },
      { code: 'WP', name: 'Greater Poland' },
      { code: 'ZP', name: 'West Pomerania' }
    ]
  },
  {
    code: 'AT',
    name: 'Austria',
    regions: [
      { code: 'B', name: 'Burgenland' },
      { code: 'K', name: 'Carinthia' },
      { code: 'NÖ', name: 'Lower Austria' },
      { code: 'OÖ', name: 'Upper Austria' },
      { code: 'S', name: 'Salzburg' },
      { code: 'ST', name: 'Styria' },
      { code: 'T', name: 'Tyrol' },
      { code: 'V', name: 'Vorarlberg' },
      { code: 'W', name: 'Vienna' }
    ]
  },
  {
    code: 'CH',
    name: 'Switzerland',
    regions: [
      { code: 'AG', name: 'Aargau' },
      { code: 'AI', name: 'Appenzell Innerrhoden' },
      { code: 'AR', name: 'Appenzell Ausserrhoden' },
      { code: 'BE', name: 'Bern' },
      { code: 'BL', name: 'Basel-Landschaft' },
      { code: 'BS', name: 'Basel-Stadt' },
      { code: 'FR', name: 'Fribourg' },
      { code: 'GE', name: 'Geneva' },
      { code: 'GL', name: 'Glarus' },
      { code: 'GR', name: 'Graubünden' },
      { code: 'JU', name: 'Jura' },
      { code: 'LU', name: 'Lucerne' },
      { code: 'NE', name: 'Neuchâtel' },
      { code: 'NW', name: 'Nidwalden' },
      { code: 'OW', name: 'Obwalden' },
      { code: 'SG', name: 'St. Gallen' },
      { code: 'SH', name: 'Schaffhausen' },
      { code: 'SO', name: 'Solothurn' },
      { code: 'SZ', name: 'Schwyz' },
      { code: 'TG', name: 'Thurgau' },
      { code: 'TI', name: 'Ticino' },
      { code: 'UR', name: 'Uri' },
      { code: 'VD', name: 'Vaud' },
      { code: 'VS', name: 'Valais' },
      { code: 'ZG', name: 'Zug' },
      { code: 'ZH', name: 'Zurich' }
    ]
  },
  {
    code: 'NL',
    name: 'Netherlands',
    regions: [
      { code: 'DR', name: 'Drenthe' },
      { code: 'FL', name: 'Flevoland' },
      { code: 'FR', name: 'Friesland' },
      { code: 'GE', name: 'Gelderland' },
      { code: 'GR', name: 'Groningen' },
      { code: 'LI', name: 'Limburg' },
      { code: 'NB', name: 'North Brabant' },
      { code: 'NH', name: 'North Holland' },
      { code: 'OV', name: 'Overijssel' },
      { code: 'UT', name: 'Utrecht' },
      { code: 'ZE', name: 'Zeeland' },
      { code: 'ZH', name: 'South Holland' }
    ]
  },
  {
    code: 'BE',
    name: 'Belgium',
    regions: [
      { code: 'BRU', name: 'Brussels-Capital Region' },
      { code: 'VLG', name: 'Flemish Region' },
      { code: 'WAL', name: 'Walloon Region' }
    ]
  },
  {
    code: 'DK',
    name: 'Denmark',
    regions: [
      { code: 'H', name: 'Capital Region' },
      { code: 'M', name: 'Central Jutland' },
      { code: 'N', name: 'North Jutland' },
      { code: 'S', name: 'South Denmark' },
      { code: 'SJ', name: 'Zealand' }
    ]
  },
  {
    code: 'SE',
    name: 'Sweden',
    regions: [
      { code: 'AB', name: 'Stockholm' },
      { code: 'AC', name: 'Västerbotten' },
      { code: 'BD', name: 'Norrbotten' },
      { code: 'C', name: 'Uppsala' },
      { code: 'D', name: 'Södermanland' },
      { code: 'E', name: 'Östergötland' },
      { code: 'F', name: 'Jönköping' },
      { code: 'G', name: 'Kronoberg' },
      { code: 'H', name: 'Kalmar' },
      { code: 'I', name: 'Gotland' },
      { code: 'K', name: 'Blekinge' },
      { code: 'M', name: 'Skåne' },
      { code: 'N', name: 'Halland' },
      { code: 'O', name: 'Västra Götaland' },
      { code: 'S', name: 'Värmland' },
      { code: 'T', name: 'Örebro' },
      { code: 'U', name: 'Västmanland' },
      { code: 'W', name: 'Dalarna' },
      { code: 'X', name: 'Gävleborg' },
      { code: 'Y', name: 'Västernorrland' },
      { code: 'Z', name: 'Jämtland' }
    ]
  },
  {
    code: 'NO',
    name: 'Norway',
    regions: [
      { code: '03', name: 'Oslo' },
      { code: '11', name: 'Rogaland' },
      { code: '15', name: 'Møre og Romsdal' },
      { code: '18', name: 'Nordland' },
      { code: '30', name: 'Viken' },
      { code: '34', name: 'Innlandet' },
      { code: '38', name: 'Vestfold og Telemark' },
      { code: '42', name: 'Agder' },
      { code: '46', name: 'Vestland' },
      { code: '50', name: 'Trøndelag' },
      { code: '54', name: 'Troms og Finnmark' }
    ]
  },
  {
    code: 'FI',
    name: 'Finland',
    regions: [
      { code: '01', name: 'Åland' },
      { code: '02', name: 'South Karelia' },
      { code: '04', name: 'South Ostrobothnia' },
      { code: '05', name: 'South Savo' },
      { code: '06', name: 'Kainuu' },
      { code: '07', name: 'Tavastia Proper' },
      { code: '08', name: 'Central Finland' },
      { code: '09', name: 'Central Ostrobothnia' },
      { code: '10', name: 'Kymenlaakso' },
      { code: '11', name: 'Lapland' },
      { code: '12', name: 'Päijät-Häme' },
      { code: '13', name: 'Pirkanmaa' },
      { code: '14', name: 'Ostrobothnia' },
      { code: '15', name: 'North Karelia' },
      { code: '16', name: 'North Ostrobothnia' },
      { code: '17', name: 'North Savo' },
      { code: '18', name: 'Uusimaa' },
      { code: '19', name: 'Southwest Finland' },
      { code: '20', name: 'Satakunta' }
    ]
  },
  {
    code: 'GR',
    name: 'Greece',
    regions: [
      { code: 'A', name: 'East Macedonia and Thrace' },
      { code: 'B', name: 'Central Macedonia' },
      { code: 'C', name: 'West Macedonia' },
      { code: 'D', name: 'Epirus' },
      { code: 'E', name: 'Thessaly' },
      { code: 'F', name: 'West Greece' },
      { code: 'G', name: 'Central Greece' },
      { code: 'H', name: 'Peloponnese' },
      { code: 'I', name: 'Attica' },
      { code: 'J', name: 'North Aegean' },
      { code: 'K', name: 'South Aegean' },
      { code: 'L', name: 'Crete' }
    ]
  },
  {
    code: 'PT',
    name: 'Portugal',
    regions: [
      { code: '01', name: 'Aveiro' },
      { code: '02', name: 'Beja' },
      { code: '03', name: 'Braga' },
      { code: '04', name: 'Bragança' },
      { code: '05', name: 'Castelo Branco' },
      { code: '06', name: 'Coimbra' },
      { code: '07', name: 'Évora' },
      { code: '08', name: 'Faro' },
      { code: '09', name: 'Guarda' },
      { code: '10', name: 'Leiria' },
      { code: '11', name: 'Lisbon' },
      { code: '12', name: 'Portalegre' },
      { code: '13', name: 'Porto' },
      { code: '14', name: 'Santarém' },
      { code: '15', name: 'Setúbal' },
      { code: '16', name: 'Viana do Castelo' },
      { code: '17', name: 'Vila Real' },
      { code: '18', name: 'Viseu' },
      { code: '20', name: 'Azores' },
      { code: '30', name: 'Madeira' }
    ]
  },
  {
    code: 'IE',
    name: 'Ireland',
    regions: [
      { code: 'C', name: 'Connacht' },
      { code: 'L', name: 'Leinster' },
      { code: 'M', name: 'Munster' },
      { code: 'U', name: 'Ulster' }
    ]
  },
  {
    code: 'CZ',
    name: 'Czech Republic',
    regions: [
      { code: '10', name: 'Prague' },
      { code: '20', name: 'Central Bohemian' },
      { code: '31', name: 'South Bohemian' },
      { code: '32', name: 'Plzeň' },
      { code: '41', name: 'Karlovy Vary' },
      { code: '42', name: 'Ústí nad Labem' },
      { code: '51', name: 'Liberec' },
      { code: '52', name: 'Hradec Králové' },
      { code: '53', name: 'Pardubice' },
      { code: '63', name: 'Vysočina' },
      { code: '64', name: 'South Moravian' },
      { code: '71', name: 'Olomouc' },
      { code: '72', name: 'Zlín' },
      { code: '80', name: 'Moravian-Silesian' }
    ]
  },
  {
    code: 'SK',
    name: 'Slovakia',
    regions: [
      { code: 'BC', name: 'Banská Bystrica' },
      { code: 'BL', name: 'Bratislava' },
      { code: 'KI', name: 'Košice' },
      { code: 'NI', name: 'Nitra' },
      { code: 'PV', name: 'Prešov' },
      { code: 'TC', name: 'Trenčín' },
      { code: 'TA', name: 'Trnava' },
      { code: 'ZI', name: 'Žilina' }
    ]
  }
];

export const getCountryByCode = (code: string): Country | undefined => {
  return EUROPEAN_COUNTRIES.find(country => country.code === code);
};

export const getRegionsByCountryCode = (countryCode: string): Region[] => {
  const country = getCountryByCode(countryCode);
  return country ? country.regions : [];
};
