// Kept by hand: the glossary behind the "?" marks, dated events for the timeline, and Y chromosome facts.
// Every non-obvious statement carries a source; dates follow the cited Wikipedia articles (checked October 2026).
window.SILSILA = window.SILSILA || {};
(function () {
  const W = t => ['Wikipedia: ' + t.replace(/_/g, ' '), 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t).replace(/%2C/g, ',').replace(/%3A/g, ':')];
  const ago = n => 1950 - n;   // "n years ago" as a calendar year, negative for BCE
  SILSILA.facts = {
    // Years per father-to-son step used for every "generations ago" figure.
    yearsPerGen: 30,
    genSrc: [['Fenner 2005, Am. J. Phys. Anthropol. 128:415', 'https://doi.org/10.1002/ajpa.20188']],

    // id: [term, plain explanation, sources]
    glossary: {
      snp: ['SNP', 'A single-letter change in DNA, such as an A that became a G. It happened once, in one man, and every son after him inherits it, so a SNP marks a branch of the tree for good. Said "snip", short for single-nucleotide polymorphism.'],
      str: ['STR', 'A short run of DNA letters repeated back to back, like GATA GATA GATA. The test counts the repeats. The count changes now and then from father to son, so STRs help compare close relatives but drift too much to build the deep tree. Short for short tandem repeat.'],
      haplogroup: ['Haplogroup', 'A large group of men who share one paternal ancestor, named by a letter from A to T. FamilyTreeDNA also names it by the SNP that defines it, as in E-M96 or O-M175. Every haplogroup splits into smaller and smaller branches.'],
      branch: ['Branch', 'One group on the Y tree: every man descended from the man in whom a particular SNP first appeared. A branch takes the name of one of its SNPs, so R-M269 is the branch defined by the SNP M269.'],
      tmrca: ['Common ancestor (TMRCA)', 'The estimated lifetime of the most recent man from whom everyone on a branch descends, the "time to most recent common ancestor". It is worked out from counts of mutations, so it comes with a range that is often several centuries wide.'],
      formed: ['Formed', 'When a branch split from its parent: the father-to-son step where its first SNP appeared. Many generations can pass between "formed" and the common ancestor when no other sons\' lines from that stretch survive or have been tested.'],
      calls: ['Positive, negative, untested', 'Positive: you carry the new letter of a SNP, so you are on that branch. Negative: you carry the old letter, so you are not. Untested: your test did not read that SNP, so it says nothing either way.'],
      derived: ['Ancestral and derived', 'The ancestral base is the letter at a position before the mutation, the one most men have. The derived base is the new letter, carried only by men on the branch where it changed.'],
      gd: ['Genetic distance', 'The number of steps between two men\'s STR results: for each marker, how far apart the two repeat counts are, added up. Zero means identical. A smaller distance means a more recent shared ancestor on average, though the spread is wide.'],
      cm: ['Centimorgan (cM)', 'The unit for shared autosomal DNA. It measures how often a stretch of DNA gets shuffled between generations rather than counting letters. Close relatives share thousands of cM; distant cousins share tens.'],
      roh: ['Runs of homozygosity', 'Long stretches where the chromosome you got from your mother and the one from your father are identical. Long runs come from an ancestor your two parents share. Short runs build up in any community that has married within itself for many generations.'],
      het: ['Heterozygous and homozygous', 'At each autosomal SNP you have two letters, one from each parent. Heterozygous means they differ (AG); homozygous means they match (AA). The share of heterozygous SNPs is a rough measure of how different your two parental copies are.'],
      build: ['GRCh37 and GRCh38', 'Two editions of the human reference genome, the map that gives every letter a numbered position. GRCh38 came out in 2013 and moved many positions, so a SNP has a different number in each. FamilyTreeDNA\'s Y files use GRCh38 and its autosomal files GRCh37.', [['Genome Reference Consortium', 'https://www.ncbi.nlm.nih.gov/grc/human']]],
      motif: ['Modal haplotype', 'The most common set of STR values in a studied group of men, published for some lineages. Sharing it is a statistical hint about a line, not proof of belonging to it; SNPs decide that. Silsila shows a motif only on the line it was described for.'],
      bigy: ['Big Y', 'FamilyTreeDNA\'s test that reads most of the readable Y chromosome letter by letter. It finds the SNPs of your own line, including new ones nobody has reported, and places you much deeper on the tree than a chip can.'],
      chip: ['Chip', 'A genotyping array: it reads a fixed list of positions chosen in advance, hundreds of thousands of them for Family Finder, including about 20,000 on the Y. It can only confirm branches whose SNPs happen to be on that list.'],
      rate: ['Mutation rate', 'How often a marker changes from father to son. An STR rate of 0.002 per generation means about one change in 500 father-to-son steps. Fast markers separate close relatives; slow ones hold steady for thousands of years.'],
      ychrom: ['Y chromosome', 'The chromosome passed only from father to son. Apart from its two tips it never mixes with the mother\'s DNA, so it traces a single paternal line back through time.'],
      par: ['Pseudoautosomal region (PAR)', 'The two tips of the Y that match the X and swap DNA with it every generation. Genealogy leaves them out because they do not follow the paternal line alone.', [['Genome Reference Consortium', 'https://www.ncbi.nlm.nih.gov/grc/human']]],
      band: ['Band', 'A named region of a chromosome, such as Yq11.223: the chromosome (Y), the arm (p for the short arm, q for the long one), then the band number seen under a microscope when the chromosome is stained.'],
      ancient: ['Ancient DNA', 'DNA read from old human remains, usually bone or teeth, and dated by radiocarbon or by where it was found. Silsila shows ancient men whose Y branch is known, from the Allen Ancient DNA Resource and FamilyTreeDNA.'],
      testers: ['Testers', 'FamilyTreeDNA customers placed on its tree. The counts follow who buys tests, so some countries and families are far better represented than others.'],
      panel: ['STR panel', 'FamilyTreeDNA sells STR tests in steps of 12, 25, 37, 67 and 111 markers. Each step adds a panel of markers, and Silsila colours each panel like a dye channel on a sequencer.'],
      mb: ['Mb', 'A megabase, one million DNA letters. The reference Y chromosome is about 57 Mb long.'],
      logscale: ['Log scale', 'An axis where each step is a multiple rather than a fixed amount: 100 to 1,000 years ago takes the same width as 1,000 to 10,000. It fits recent and very old ancestors on one axis.'],
      generation: ['Generation', 'One father-to-son step. Silsila counts 30 years per generation. Fenner\'s cross-cultural study put the average father-to-son interval at about 31 to 32 years, so every generation count here is approximate.', [['Fenner 2005', 'https://doi.org/10.1002/ajpa.20188']]],
      recurrent: ['SNPs that arose twice', 'Now and then the same letter changed independently in two unrelated men. Such a SNP reads positive on a branch you are not on. A handful of these in a chip file is normal.'],
      route: ['Migration route', 'FamilyTreeDNA\'s reconstruction of where each ancestor on the line probably lived, drawn from where his descendants and ancient relatives were found. It is a best guess, strongest where ancient DNA is plentiful.', [['FamilyTreeDNA Discover', 'https://discover.familytreedna.com/']]],
    },

    // [calendar year (negative BCE), date as written, short label, event, region, source]
    // Regions: Africa, Asia (West Asia for the Near East), Europe, Americas, Oceania, World.
    events: [
      [ago(315000), 'about 315,000 years ago', 'Jebel Irhoud', 'The oldest known Homo sapiens fossils, at Jebel Irhoud in Morocco', 'Africa', W('Jebel_Irhoud')],
      [ago(185000), '177,000 to 194,000 years ago', 'Misliya Cave', 'A modern human jaw left in Misliya Cave on Mount Carmel, one of the oldest found outside Africa', 'West Asia', W('Misliya_Cave')],
      [ago(95000), '80,000 to 100,000 years ago', 'Skhul and Qafzeh', 'Modern humans buried at Skhul and Qafzeh, in today\'s Israel', 'West Asia', W('Skhul_and_Qafzeh_hominins')],
      [ago(74000), 'about 74,000 years ago', 'Toba eruption', 'The Toba supereruption in Sumatra', 'Asia', W('Youngest_Toba_eruption')],
      [ago(60000), '70,000 to 50,000 years ago', 'Out of Africa', 'The expansion out of Africa that most people outside Africa descend from', 'World', W('Recent_African_origin_of_modern_humans')],
      [ago(40000), 'about 40,000 years ago', 'Neanderthals gone', 'Neanderthals disappear', 'Europe', W('Neanderthal_extinction')],
      [ago(35000), '37,000 to 33,500 years ago', 'Chauvet Cave', 'The black drawings in Chauvet Cave, France', 'Europe', W('Chauvet_Cave')],
      [ago(23000), '26,000 to 20,000 years ago', 'Ice age peak', 'The Last Glacial Maximum: ice sheets at their largest, seas far lower', 'World', W('Last_Glacial_Maximum')],
      [ago(22000), '23,000 to 21,000 years ago (debated)', 'White Sands', 'Human footprints at White Sands, New Mexico', 'Americas', W('White_Sands_footprints')],
      [ago(19000), '22,000 to 17,000 years ago (debated)', 'Lascaux', 'The Lascaux cave paintings', 'Europe', W('Lascaux')],
      [ago(13250), '15,000 to 11,500 years ago', 'Natufians', 'The Natufians of the Levant settle in villages before farming', 'West Asia', W('Natufian_culture')],
      [ago(12300), '12,900 to 11,700 years ago', 'Younger Dryas', 'The Younger Dryas, a sudden return to near-glacial cold', 'World', W('Younger_Dryas')],
      [-9500, 'from about 9500 BCE', 'Göbekli Tepe', 'Göbekli Tepe, with some of the oldest known megaliths', 'West Asia', W('Göbekli_Tepe')],
      [ago(9000), '10,500 to 7,500 years ago', 'First farming', 'Wheat, barley, lentils and the other founder crops domesticated in the Fertile Crescent', 'West Asia', W('Founder_crops')],
      [-8000, 'about 8000 BCE', 'Tower of Jericho', 'The stone Tower of Jericho is built', 'West Asia', W('Tower_of_Jericho')],
      [-7000, '7500 to 5600 BCE', 'Çatalhöyük', 'Çatalhöyük, a very large Neolithic settlement in Anatolia', 'West Asia', W('Çatalhöyük')],
      [-3500, '4000 to 3100 BCE', 'First cities', 'The Uruk period: the first cities rise in southern Mesopotamia', 'West Asia', W('Uruk_period')],
      [-3200, 'end of the 4th millennium BCE', 'Writing', 'Writing first recorded at Uruk, the beginning of cuneiform', 'West Asia', W('Cuneiform')],
      [-3100, 'about 3100 BCE', 'Narmer', 'Narmer rules a unified Egypt', 'Africa', W('Narmer')],
      [-3050, 'from about 3100 BCE', 'Stonehenge', 'Work begins at Stonehenge', 'Europe', W('Stonehenge')],
      [-2600, 'about 2600 BCE', 'Great Pyramid', 'The Great Pyramid of Giza is built for Khufu', 'Africa', W('Great_Pyramid_of_Giza')],
      [-2550, '2600 to 1900 BCE', 'Indus cities', 'The mature Indus Valley Civilisation', 'Asia', W('Indus_Valley_Civilisation')],
      [-2300, 'about 2300 BCE', 'Akkad', 'Sargon founds the Akkadian Empire', 'West Asia', W('Akkadian_Empire')],
      [-2200, 'about 2200 BCE', '4.2 ka drought', 'The 4.2-kiloyear event: a century of drought from North Africa to India', 'World', W('4.2-kiloyear_event')],
      [-1753, 'about 1753 BCE', 'Hammurabi', 'The Code of Hammurabi is written in Babylon', 'West Asia', W('Code_of_Hammurabi')],
      [-1600, 'about 1600 BCE (debated)', 'Thera', 'The Thera eruption devastates Santorini', 'Europe', W('Minoan_eruption')],
      [-1200, 'late 13th to early 12th century BCE', 'Bronze Age collapse', 'The Late Bronze Age collapse around the eastern Mediterranean', 'West Asia', W('Late_Bronze_Age_collapse')],
      [-1000, '1st millennium BCE', 'Alphabet', 'The Phoenician alphabet, one of the first alphabets, in use around the Mediterranean', 'West Asia', W('Phoenician_alphabet')],
      [-753, '753 BCE, by tradition', 'Rome', 'The traditional founding of Rome', 'Europe', W('Founding_of_Rome')],
      [-539, '539 BCE', 'Cyrus in Babylon', 'Cyrus the Great of Persia takes Babylon', 'West Asia', W('Fall_of_Babylon')],
      [-323, '336 to 323 BCE', 'Alexander', 'Alexander the Great conquers the Persian Empire and dies in Babylon', 'West Asia', W('Alexander_the_Great')],
      [70, '70 CE', 'Jerusalem, 70 CE', 'Rome destroys Jerusalem and its Temple', 'West Asia', W('Siege_of_Jerusalem_(70_CE)')],
      [622, '622 CE', 'Hijra', 'The Hijra: Muhammad moves from Mecca to Medina, year 1 of the Islamic calendar', 'West Asia', W('Hijrah')],
      [762, '762 to 766 CE', 'Baghdad', 'The caliph al-Mansur builds the Round City of Baghdad', 'West Asia', W('Round_City_of_Baghdad')],
      [1099, '1099 CE', 'First Crusade', 'The First Crusade takes Jerusalem', 'West Asia', W('Siege_of_Jerusalem_(1099)')],
      [1187, '1187 CE', 'Hattin', 'Saladin defeats the Crusader states at Hattin', 'West Asia', W('Battle_of_Hattin')],
      [1258, '1258 CE', 'Mongols', 'The Mongols sack Baghdad', 'West Asia', W('Siege_of_Baghdad_(1258)')],
      [1347, '1346 to 1353 CE', 'Black Death', 'The Black Death in Europe and the Middle East', 'Europe', W('Black_Death')],
      [1440, 'about 1440 CE', 'Printing press', 'Gutenberg\'s printing press', 'Europe', W('Printing_press')],
      [1453, '1453 CE', 'Constantinople', 'The Ottomans take Constantinople', 'West Asia', W('Fall_of_Constantinople')],
      [1492, '1492 CE', 'Columbus', 'Columbus crosses the Atlantic', 'Americas', W('Voyages_of_Christopher_Columbus')],
      [1516, '1516 to 1517 CE', 'Ottoman Levant', 'The Ottomans conquer the Mamluk Levant, Egypt and the Hejaz', 'West Asia', W('Ottoman–Mamluk_War_(1516–1517)')],
      // Events that put every continent on the timeline; each quote is the article's own dating.
      // "OSL ages ranging from 74,900 ± 4,300 to 72,500 ± 4,600 years BP have been obtained for the upper part of the M1 phase, i.e. the units associated with the Still Bay techno-tradition."
      // "the nine red lines drawn on the rock were handmade and from an ochre crayon dating back 73,000 years. This makes it the oldest known abstract rock drawing."
      [ago(73000), 'about 73,000 years ago', 'Blombos Cave', 'Shell beads, engraved ochre and the oldest known abstract drawing, at Blombos Cave in South Africa', 'Africa', W('Blombos_Cave')],
      // "Archaeological excavations conducted by Clarkson et al. (2017) yielded evidence to suggest that Madjedbebe was first occupied by humans possibly by 65,000 ± 6,000 years ago and at least by 50,000 years ago. While the age of 50,000 years ago has been widely accepted since the 1990s, this latter estimate (of ca. 65,000 years ago) has, as of 2017, been questioned by some experts."
      [ago(65000), 'by 65,000 to 50,000 years ago (debated)', 'Madjedbebe', 'People living at Madjedbebe rock shelter in Arnhem Land, possibly the oldest site of human habitation in Australia', 'Oceania', W('Madjedbebe')],
      // "They reached a consensus that LM3 is about 40,000 years old."
      // "Mungo man (LM3) ... are the oldest Homo sapiens (human) remains found on the Australian continent." "The study also found that LM1 was a similar age to LM3"
      [ago(40000), 'about 40,000 years ago', 'Lake Mungo', 'Mungo Man, buried with red ochre, and Mungo Woman, cremated: the oldest human remains found in Australia', 'Oceania', W('Lake_Mungo_remains')],
      // "Excavations in 1998 uncovered forty-six earthenware fragments which have been dated as early as 14,500 BCE (ca 16,500 BP); this places them among the earliest pottery currently known."
      [ago(16500), 'about 16,500 years ago', 'Jōmon pottery', 'Pottery at Odai Yamamoto in northern Japan, among the oldest known anywhere', 'Asia', W('Jōmon_pottery')],
      // "Monte Verde II, generally suggested to date to 14,500 years ago, which has been largely accepted (though not without dissent) as showing that the human settlement of the Americas predates the Clovis culture by at least 1,000 years"
      [ago(14500), 'about 14,500 years ago (debated)', 'Monte Verde', 'People camp at Monte Verde in southern Chile, at least 1,000 years before the Clovis culture', 'Americas', W('Monte_Verde')],
      // "The humid period began about 14,600–14,500 years ago at the end of Heinrich event 1" ... "The AHP ended 6,000–5,000 years ago during the Piora Oscillation cold period."
      [ago(10000), '14,600 to 5,000 years ago', 'Green Sahara', 'The African humid period: grass, trees and lakes cover much of the Sahara', 'Africa', W('African_humid_period')],
      // "The current scientific consensus, based on archaeological and linguistic evidence, is that Oryza sativa rice was first domesticated in the Yangtze River basin in China 9,000 years ago."
      [ago(9000), 'about 9,000 years ago', 'Rice farming', 'Rice first domesticated in the Yangtze River basin in China', 'Asia', W('History_of_rice_cultivation')],
      // "Maize was domesticated by indigenous peoples in southern Mexico about 9,000 years ago from wild teosinte."
      [ago(9000), 'about 9,000 years ago', 'Maize', 'Maize domesticated from wild teosinte in southern Mexico', 'Americas', W('Maize')],
      // "Archaeological evidence for early agricultural drainage systems was found here, beginning about 9,000 years ago." "The native crop taro was grown here."
      [ago(9000), 'from about 9,000 years ago', 'Kuk Swamp', 'Farmers drain Kuk Swamp in the New Guinea highlands to grow taro, one of the places farming began independently', 'Oceania', W('Kuk_Swamp')],
      // "The earliest settlement at Mehrgarh ... was a small farming village dated from 7000 BCE or 5250 BCE (see below)."
      // "Mehrgarh is one of the earliest known sites in the South Asia showing evidence of farming and herding."
      // Placed between the two proposed dates, and clear of the cluster at 9,000 years ago.
      [-6125, '7000 or 5250 BCE (debated)', 'Mehrgarh', 'A farming village at Mehrgarh in Balochistan, Pakistan, one of the earliest in South Asia', 'Asia', W('Mehrgarh')],
      // "The Linear Pottery culture (LBK) is a major archaeological horizon of the European Neolithic period, flourishing c. 5500–4500 BC."
      // "It represents a major event in the initial spread of agriculture in Europe."
      [-5000, '5500 to 4500 BCE', 'Linear Pottery', 'Farmers of the Linear Pottery culture spread along the Danube, Elbe and Rhine', 'Europe', W('Linear_Pottery_culture')],
      // "From 3100 BCE onward, large-scale human settlement and communal construction become clearly apparent. This lasted until a period of decline around 1800 BCE. Since the early 21st century, it has been recognized as the oldest-known civilization in the New World"
      [-2450, '3100 to 1800 BCE', 'Caral', 'Caral and the other towns of the Caral-Supe civilization in Peru, the oldest known civilization in the Americas', 'Americas', W('Caral–Supe_civilization')],
      // "the Pontic–Caspian steppe), dating to 3300–2600 BC." "the widely accepted Kurgan hypothesis posits that the people who produced the Yamnaya culture spoke a stage of the Proto-Indo-European language."
      [-2950, '3300 to 2600 BCE', 'Yamnaya', 'Herders of the Yamnaya culture on the Pontic-Caspian steppe, widely thought to have spoken Proto-Indo-European', 'Europe', W('Yamnaya_culture')],
      // "The group originated from a prehistoric seaborne migration, known as the Austronesian expansion, from Taiwan, circa 3000 to 1500 BCE. Austronesians reached the Batanes Islands in the northernmost Philippines by around 2200 BCE."
      [-2250, 'about 3000 to 1500 BCE', 'Out of Taiwan', 'The Austronesian expansion: seafarers from Taiwan spread into the Philippines and the islands beyond', 'Asia', W('Austronesian_peoples')],
      // "Recent archaeobotanical research has confirmed the presence of domesticated pearl millet on the Sahel zone of northern Mali between 2500 and 2000 BCE."
      [-2250, '2500 to 2000 BCE', 'Pearl millet', 'Domesticated pearl millet, a crop of the West African Sahel, grown in northern Mali', 'Africa', W('Pearl_millet')],
      // "The culture developed from around 2500 BC, reaching its peak between 1750 BC and 1500 BC." "became a sizable, populous kingdom rivalling Egypt"
      [-1625, '1750 to 1500 BCE', 'Kerma', 'The Kingdom of Kerma in Nubia, today\'s Sudan, at its peak a rival of Egypt', 'Africa', W('Kerma_culture')],
      // "The expansion is believed to have taken place between about 6,000 and 1,500 years ago (approximately 4,000 BC to 500 AD)."
      [-1750, 'about 4000 BCE to 500 CE', 'Bantu expansion', 'Bantu-speaking peoples spread from West-Central Africa across Central, Eastern and Southern Africa', 'Africa', W('Bantu_expansion')],
      // "used in pyromancy – a form of divination – during the Late Shang period (c. 1250 – c. 1050 BCE) in ancient China." "Oracle bones bear the earliest known significant corpus of ancient Chinese writing"
      [-1150, 'about 1250 to 1050 BCE', 'Oracle bones', 'Shang oracle bones in China, the earliest large body of Chinese writing', 'Asia', W('Oracle_bone')],
      // "who settled Island Melanesia via a seaborne migration at around 1600 to 500 BCE." "Lapita pottery styles from around 1,000 BCE have been found in Fiji and Western Polynesia."
      [-1050, 'about 1600 to 500 BCE', 'Lapita', 'Lapita seafarers, ancestors of the Polynesians, settle Island Melanesia and reach Fiji, Tonga and Samoa', 'Oceania', W('Lapita_culture')],
      // "The earliest Nok terracotta sculptures may have developed in 900 BCE."
      [-900, 'from about 900 BCE', 'Nok', 'The Nok culture of central Nigeria makes its terracotta sculptures', 'Africa', W('Nok_culture')],
      // "flourishing in the modern-day Mexican states of Veracruz and Tabasco from roughly 1200 to 400 BC"
      [-800, 'about 1200 to 400 BCE', 'Olmecs', 'The Olmec civilization of the Gulf Coast of Mexico, known for its colossal stone heads', 'Americas', W('Olmecs')],
      // "(... c. 304 – 232 BCE), most commonly known as Ashoka the Great, was Emperor of Magadha from c. 268 BCE until his death, and the third ruler of the Maurya Empire. His empire covered a large part of the Indian subcontinent"
      // "A patron of Buddhism, he is credited with an important role in the spread of Buddhism across ancient Asia."
      [-250, 'about 268 to 232 BCE', 'Ashoka', 'Ashoka rules the Maurya Empire over a large part of the Indian subcontinent and helps spread Buddhism', 'Asia', W('Ashoka')],
      // "This was completed in 221 BC with the fall of Qi" ... "Ying Zheng declared himself the First Emperor – or Shi Huangdi – of a unified China under the Qin dynasty."
      [-221, '221 BCE', 'Qin unification', 'Qin conquers the last of the Warring States and its king becomes the First Emperor of China', 'Asia', W('Qin\'s_wars_of_unification')],
      // "The network began with the expansion of the Han dynasty (202 BCE – 220 CE) into Central Asia around 114 BCE, through the missions and explorations of the Chinese imperial envoy Zhang Qian"
      [-114, 'from about 114 BCE', 'Silk Road', 'Han China expands into Central Asia and the Silk Road trade routes open', 'Asia', W('Silk_Road')],
      // "Aksum adopted Christianity as its state religion in the mid 4th century under Ezana (320s – c. 360)." "Ezana's coins and inscriptions make the change from pre-Christian imagery to Christian symbolism around 340."
      [340, 'mid 4th century CE', 'Aksum', 'The Kingdom of Aksum, in today\'s Eritrea and Ethiopia, adopts Christianity under King Ezana', 'Africa', W('Kingdom_of_Aksum')],
      // "Beginning around 250 AD, the Classic period is largely defined as when the Maya were raising sculpted monuments with Long Count dates." Section heading: "Classic period (c. 250–900 AD)"
      [575, 'about 250 to 900 CE', 'Classic Maya', 'Classic Maya cities such as Tikal and Calakmul raise carved monuments with Long Count dates', 'Americas', W('Maya_civilization')],
      // "The Angkorian period began in AD 802, when the Khmer Hindu monarch Jayavarman II declared himself a "universal monarch" and "god-king""
      [802, '802 CE', 'Angkor', 'The Angkorian period of the Khmer Empire in Cambodia begins under Jayavarman II', 'Asia', W('Angkor')],
      // "The history of Hawaii began with the arrival of Polynesian peoples to the Hawaiian Islands between 940 and 1200 AD."
      [1070, '940 to 1200 CE', 'Hawaii settled', 'Polynesian voyagers arrive in the Hawaiian Islands', 'Oceania', W('History_of_Hawaii')],
      // "Estimated dates of initial settlement of Easter Island have ranged from 400 to 1300 CE, though the current best estimate for colonization is in the 12th century CE."
      [1150, '12th century CE (debated)', 'Rapa Nui', 'Polynesian voyagers settle Rapa Nui (Easter Island)', 'Oceania', W('Easter_Island')],
      // "the site of a Native American city which existed c. 1050 – c. 1350 AD" "Cahokia was the largest and most influential urban settlement of the Mississippian culture"
      [1200, 'about 1050 to 1350 CE', 'Cahokia', 'Cahokia, the largest city of the Mississippian culture, near today\'s St. Louis', 'Americas', W('Cahokia')],
      // "The Mali Empire was an empire in West Africa from c. 1235 to 1610. The empire was founded by Sundiata Keita (c. 1214 – c. 1255)"
      [1235, 'about 1235 CE', 'Mali Empire', 'Sundiata Keita founds the Mali Empire in West Africa, later ruled by Mansa Musa', 'Africa', W('Mali_Empire')],
      // "The Great Enclosure, with its 11 m (36 ft) high dry stone walls (constructed without mortar), was built during the 13th and 14th centuries" "The edifices were erected by ancestors of the Shona people"
      [1300, '13th to 14th century CE', 'Great Zimbabwe', 'The stone walls of the Great Enclosure rise at Great Zimbabwe, built by ancestors of the Shona people', 'Africa', W('Great_Zimbabwe')],
      // "The exact date of the founding of the city is unclear, but the date 13 March 1325 was chosen in 1925 to celebrate the 600th anniversary of the city."
      [1325, 'about 1325 CE', 'Tenochtitlan', 'The Mexica found Tenochtitlan on an island in Lake Texcoco, later the Aztec capital', 'Americas', W('Tenochtitlan')],
      // "The human history of New Zealand can be dated back to between 1320 and 1350 CE, when the main settlement period started, after it was discovered and settled by Polynesians, who developed a distinct Māori culture."
      [1335, '1320 to 1350 CE', 'Aotearoa settled', 'Polynesian settlers arrive in Aotearoa New Zealand, where Māori culture develops', 'Oceania', W('History_of_New_Zealand')],
      // "From 1438 to 1533, the Incas incorporated a large portion of western South America, centered on the Andean Mountains"
      [1438, '1438 to 1533 CE', 'Inca Empire', 'The Inca Empire expands from Cusco along the Andes', 'Americas', W('Inca_Empire')],
      // "Patrick Manning estimates that about 12 million slaves entered the Atlantic trade between the 16th and 19th centuries"
      // "Most of the people transported in the transatlantic trade were from Central and West Africa."
      [1700, '16th to 19th century CE', 'Atlantic slave trade', 'About 12 million enslaved Africans, most from West and Central Africa, are carried to the Americas', 'Africa', W('Atlantic_slave_trade')],
      // "spanning around 13,050 to 12,750 years Before Present (BP)."
      [ago(12900), '13,050 to 12,750 years ago', 'Clovis', 'The Clovis culture of North America, known for its fluted stone points', 'Americas', W('Clovis_culture')],
      // "The city is thought to have been established around 100 BCE, with major monuments continuously under construction until about 250 CE." "its major monuments were sacked and systematically burned around 550 CE."
      [225, 'about 100 BCE to 550 CE', 'Teotihuacan', 'Teotihuacan, near today\'s Mexico City, the largest city in the Americas at its height', 'Americas', W('Teotihuacan')],
      // "The earliest known inscription in which the name Srivijaya appears also dates from the 7th century in the Kedukan Bukit inscription found near Palembang, Sumatra, dated 16 June 682."
      [682, '682 CE', 'Srivijaya', 'The first dated inscription of Srivijaya, a Buddhist kingdom based on Sumatra', 'Asia', W('Srivijaya')],
      // "whom a council proclaimed as the ruler of all Mongols in 1206."
      [1206, '1206 CE', 'Genghis Khan', 'Temüjin is proclaimed Genghis Khan, ruler of all the Mongols', 'Asia', W('Mongol_Empire')],
      // "With carbon dating estimates between 990 and 1050 CE (mean date 1014) and tree-ring dating of 1021, L'Anse aux Meadows is the only undisputed site of pre-Columbian trans-oceanic contact of Europeans with the Americas outside of Greenland."
      [1021, '1021 CE', 'Norse Newfoundland', 'Norse settlers build a camp at L\'Anse aux Meadows in Newfoundland', 'Americas', W('L\'Anse_aux_Meadows')],
    ],

    // Shared cM by relationship: [relationship, average cM, low, high] from The Shared cM Project, version 4.0
    // (March 2020, pp. 52-53), Blaine T. Bettinger, CC BY 4.0. low and high are the smallest and largest totals left
    // after trimming 0.5% of submissions at each end; minimums beyond half second cousins are set to 0, and averages
    // there leave out submissions that shared nothing.
    scp: {
      src: ['The Shared cM Project, version 4.0 (Bettinger 2020)', 'https://thegeneticgenealogist.com/wp-content/uploads/2020/03/Shared-cM-Project-Version-4.pdf'],
      licence: 'CC BY 4.0',
      table: [
      ['Parent or child', 3485, 2376, 3720],
      ['Full sibling', 2613, 1613, 3488],
      ['Aunt, uncle, niece or nephew', 1741, 1201, 2282],
      ['Grandparent or grandchild', 1754, 984, 2462],
      ['Half sibling', 1759, 1160, 2436],
      ['First cousin', 866, 396, 1397],
      ['Great-aunt, great-uncle, great-niece or great-nephew', 850, 330, 1467],
      ['Great-grandparent or great-grandchild', 887, 485, 1486],
      ['Half aunt, uncle, niece or nephew', 871, 492, 1315],
      ['First cousin once removed', 433, 102, 980],
      ['Great-great-aunt or uncle, or their niece or nephew', 420, 186, 713],
      ['Half first cousin', 449, 156, 979],
      ['Half great-aunt or uncle, or their niece or nephew', 431, 184, 668],
      ['First cousin twice removed', 221, 33, 471],
      ['Second cousin', 229, 41, 592],
      ['Half first cousin once removed', 224, 62, 469],
      ['Half great-great-aunt or uncle, or their niece or nephew', 208, 103, 284],
      ['First cousin three times removed', 117, 25, 238],
      ['Second cousin once removed', 122, 14, 353],
      ['Half first cousin twice removed', 125, 16, 269],
      ['Half second cousin', 120, 10, 325],
      ['Second cousin twice removed', 71, 0, 244],
      ['Third cousin', 73, 0, 234],
      ['Half first cousin three times removed', 60, 0, 120],
      ['Half second cousin once removed', 66, 0, 190],
      ['Second cousin three times removed', 51, 0, 154],
      ['Third cousin once removed', 48, 0, 192],
      ['Half second cousin twice removed', 48, 0, 144],
      ['Half third cousin', 48, 0, 168],
      ['Third cousin twice removed', 36, 0, 166],
      ['Fourth cousin', 35, 0, 139],
      ['Half third cousin once removed', 37, 0, 139],
      ['Third cousin three times removed', 27, 0, 98],
      ['Fourth cousin once removed', 28, 0, 126],
      ['Half third cousin twice removed', 27, 0, 78],
      ['Half fourth cousin', 30, 0, 74],
      ['Fourth cousin twice removed', 22, 0, 93],
      ['Fifth cousin', 25, 0, 117],
      ['Fourth cousin three times removed', 19, 0, 60],
      ['Fifth cousin once removed', 21, 0, 80],
      ['Fifth cousin twice removed', 18, 0, 65],
      ['Sixth cousin', 18, 0, 71],
      ['Fifth cousin three times removed', 13, 0, 30],
      ['Sixth cousin once removed', 15, 0, 56],
      ['Sixth cousin twice removed', 13, 0, 45],
      ['Seventh cousin', 14, 0, 57],
      ['Seventh cousin once removed', 12, 0, 50],
      ['Eighth cousin', 11, 0, 42],
      ],
    },

    // Y chromosome at a glance: [text, sources]
    y: [
      ['The reference Y (GRCh38) is 57,227,415 letters long, about 0.9% of the DNA in a man\'s cell.', [['UCSC hg38 chromosome sizes', 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes'], W('Y_chromosome')]],
      ['The first complete Y, sequenced in 2023, is 62,460,029 letters: over 30 million more than the reference, most of them in long repeats.', [['Rhie et al. 2023, Nature 621:344', 'https://doi.org/10.1038/s41586-023-06457-y']]],
      ['It carries 693 genes, 106 of which code for proteins.', [W('Y_chromosome')]],
      ['Its tips, PAR1 (chrY:10,001 to 2,781,479) and PAR2 (56,887,903 to 57,217,415), pair with the X. Everything between passes from father to son.', [['Genome Reference Consortium', 'https://www.ncbi.nlm.nih.gov/grc/human']]],
      ['SRY, the gene that switches on male development, sits at Yp11.2, about 5,000 letters past the end of PAR1.', [['NCBI Gene: SRY', 'https://www.ncbi.nlm.nih.gov/gene/6736']]],
    ],
  };
})();
