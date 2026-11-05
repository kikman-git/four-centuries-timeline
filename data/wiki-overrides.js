/* Event title -> Wikipedia article title, for the cases where the two differ
 * enough that neither a direct title lookup nor search finds the right page.
 * An entry here always wins and skips the year heuristic — a human asserted it.
 *
 * Add one whenever `node enrich.js --report` flags a bad or missing match,
 * then `node enrich.js --refetch "<event title>"`.
 *
 * Search is confidently wrong more often than it is unsure: it sent
 * "'Whatever it takes'" to a Leona Lewis song, "Mugabe ousted" to Grace Mugabe,
 * "Nikkei peaks" to Eight-thousander and "OEEC founded" to the year 1948.
 * Every match in this file was checked by eye against the event.
 */
module.exports = {
  // ── search found nothing plausible ────────────────────────────────────────
  "German hyperinflation peaks":      "Hyperinflation in the Weimar Republic",
  "Latin American debt crisis":       "Latin American debt crisis",
  "Mexico nationalises oil":          "Mexican oil expropriation",

  // ── search found the wrong subject entirely ───────────────────────────────
  "'Whatever it takes'":              "Mario Draghi",
  "Nikkei peaks":                     "Japanese asset price bubble",
  "OEEC founded":                     "Organisation for European Economic Co-operation",
  "Algerian War begins":              "Algerian War",
  "Milošević falls":                  "Overthrow of Slobodan Milošević",
  "Spindletop oil strike":            "Spindletop",
  "Taliban retake Kabul":             "Fall of Kabul (2021)",
  "US leaves the gold standard":      "Executive Order 6102",
  "Oil futures go negative":          "2020 Russia–Saudi Arabia oil price war",
  "Czechoslovakia splits":            "Dissolution of Czechoslovakia",
  "EU single market":                 "European Single Market",
  "Brexit takes effect":              "Brexit",
  "Mugabe ousted":                    "2017 Zimbabwean coup d'état",
  "Trump re-elected":                 "2024 United States presidential election",
  "AIDS first reported":              "HIV/AIDS",
  "US credit rating downgraded":      "United States federal government credit-rating downgrades",
  "Schengen takes effect":            "Schengen Agreement",
  "Japan ends negative rates":        "Bank of Japan",
  "US Prohibition begins":            "Prohibition in the United States",
  "Soviet Union established":         "Soviet Union",
  "Germany quits the League":         "World Disarmament Conference",
  "Norway leaves union with Sweden":  "Dissolution of the union between Norway and Sweden",
  "Australia federates":              "Federation of Australia",
  "Germany's fiscal turn":            "2025 German federal election",

  // ── right topic, but a more specific or more apt article exists ───────────
  "Armenian Genocide begins":         "Armenian genocide",
  "Armistice ends WWI fighting":      "Armistice of 11 November 1918",
  "League of Nations founded":        "League of Nations",
  "US women win the vote":            "Nineteenth Amendment to the United States Constitution",
  "Belgium annexes Congo Free State": "Belgian Congo",
  "Great Depression trough":          "Great Depression",
  "Soviet famine (Holodomor)":        "Holodomor",
  "Spanish Civil War begins":         "Spanish Civil War",
  "Anschluss with Austria":           "Anschluss",
  "Hitler becomes Chancellor":        "Adolf Hitler's rise to power",
  "Britain leaves the gold standard": "Great Depression in the United Kingdom",
  "NATO founded":                     "North Atlantic Treaty",
  "People's Republic of China":       "Proclamation of the People's Republic of China",
  "Hungarian Uprising":               "Hungarian Revolution of 1956",
  "Chilean coup":                     "1973 Chilean coup d'état",
  "Nixon resigns":                    "Watergate scandal",
  "Death of Franco":                  "Francisco Franco",
  "Deng launches Reform and Opening": "Chinese economic reform",
  "Iran–Iraq War begins":             "Iran–Iraq War",
  "Tiananmen Square crackdown":       "1989 Tiananmen Square protests and massacre",
  "Euro launched":                    "Euro",
  "Euro notes and coins circulate":   "Euro banknotes",
  "EU's big-bang enlargement":        "2004 enlargement of the European Union",
  "Xi Jinping takes power":           "Xi Jinping",
  "Trump elected":                    "2016 United States presidential election",
  "Obama elected":                    "2008 United States presidential election",
  "Silicon Valley Bank fails":        "Collapse of Silicon Valley Bank",
  "Poland's semi-free election":      "1989 Polish parliamentary election",
  "India and Pakistan test nuclear weapons": "Pokhran-II",
  "Rohingya expulsion":               "Rohingya genocide",
  "Bashir ousted in Sudan":           "2019 Sudanese coup d'état",
  "India revokes Kashmir's autonomy": "Revocation of the special status of Jammu and Kashmir",
  "Finland and Sweden seek NATO membership": "Enlargement of NATO",
  "Modi elected":                     "2014 Indian general election",
  "Modi loses his majority":          "2024 Indian general election",
  "Mubarak resigns":                  "Egyptian revolution of 2011",
  "Suharto resigns":                  "Fall of Suharto",
  "Putin elected president":          "2000 Russian presidential election",
  "Khashoggi killed":                 "Assassination of Jamal Khashoggi",
  "First Greek bailout":              "First Economic Adjustment Programme for Greece",
  "Colombian peace agreement":        "Colombian peace process",
  "SALT I and the ABM Treaty":        "Strategic Arms Limitation Talks",
  "PRC takes China's UN seat":        "United Nations General Assembly Resolution 2758",
  "Bitcoin's first block":            "History of bitcoin",
  "Philippine independence":          "Treaty of Manila (1946)",
  "Namibian independence":            "History of Namibia",
  "Zimbabwean independence":          "Lancaster House Agreement",
  "China takes Tibet":                "Annexation of Tibet by the People's Republic of China",
  "State of Israel declared":         "Israeli Declaration of Independence",
  "Japan surrenders":                 "Surrender of Japan",
  "Moving assembly line":             "Assembly line",
  "Angola and Mozambique independent": "Decolonisation of Africa",

  // ── pre-1900: search had no article at all ────────────────────────────────
  "Japan closes itself":              "Sakoku",
  "Watt's steam engine patent":       "James Watt",   // the Watt steam engine article's lead is too short to be useful
  "Aceh War begins":                  "Aceh War",
  "Oman takes Mombasa":               "Fort Jesus",

  // ── pre-1900: search found the wrong subject entirely ─────────────────────
  "French Revolution begins":         "French Revolution",          // was: Brabant Revolution
  "Bismarck dismissed":               "Otto von Bismarck",          // was: his son Wilhelm
  "Death of Louis XIV":               "Louis XIV",                  // was: the 2016 film
  "Louis XIV takes personal rule":    "Absolute monarchy in France",// was: the art style
  "English Civil War begins":         "English Civil War",          // was: the year 1642
  "Cook reaches Botany Bay":          "First voyage of James Cook", // was: the year 1770
  "Britain takes the Cape":           "Battle of Muizenberg",       // was: the year 1795
  "Death of Aurangzeb":               "Aurangzeb",                  // was: a grandson
  "VOC dissolved":                    "Dutch East India Company",   // was: a governor-general
  "Dutch abolish slavery":            "Slavery in the Dutch Empire",// was: slavery in the US
  "Napoleon crowned Emperor":         "Coronation of Napoleon I",   // was: the physical crown
  "Haitian independence":             "Haitian Declaration of Independence",
  "Rise of the Zulu kingdom":         "Zulu Kingdom",
  "Romanov dynasty begins":           "House of Romanov",
  "Indian National Congress founded": "Indian National Congress",
  "England takes Jamaica":            "Colony of Jamaica",

  // ── pre-1900: right topic, better article available ───────────────────────
  "Batavia founded":                  "Batavia, Dutch East Indies",
  "Manhattan purchased":              "New Netherland",
  "Dutch lose Brazil":                "Dutch–Portuguese War",
  "Dutch take Colombo":               "Siege of Colombo",
  "Quebec founded":                   "New France",
  "Portuguese Restoration":           "Portuguese Restoration War",
  "Piet Heyn takes the silver fleet": "Battle in the Bay of Matanzas",
  "Mughal Empire at its height":      "Mughal Empire",
  "First public steam railway":       "Stockton and Darlington Railway",
  "Kingdom of Italy proclaimed":      "Italian unification",
  "German Empire proclaimed":         "German Empire",
  "Napoleon seizes power":            "18 Brumaire",
  "Witwatersrand gold discovered":    "Witwatersrand Gold Rush",
};
